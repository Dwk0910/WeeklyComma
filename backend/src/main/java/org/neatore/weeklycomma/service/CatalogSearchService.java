package org.neatore.weeklycomma.service;

import org.json.JSONArray;
import org.json.JSONObject;
import org.neatore.weeklycomma.domain.MediaType;
import org.neatore.weeklycomma.dto.BookDto;
import org.neatore.weeklycomma.util.BookIsbn;
import org.neatore.weeklycomma.util.CatalogIdentity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.*;

@Service
public class CatalogSearchService {
    private final java.util.concurrent.ExecutorService bookLookups = new java.util.concurrent.ThreadPoolExecutor(4, 4, 0L, java.util.concurrent.TimeUnit.MILLISECONDS, new java.util.concurrent.ArrayBlockingQueue<>(64));
    @jakarta.annotation.PreDestroy
    public void close() { bookLookups.shutdownNow(); }
    private final String googleKey;
    private final String tmdbToken;
    private final RestClient client;
    private final NationalLibraryBookClient nationalLibrary;
    private long lastMusicRequest;
    private boolean musicRequested;
    private final Map<String, CachedMusic> musicCache = new LinkedHashMap<>();
    private record CachedMusic(long expires, JSONObject payload) {}

    @Autowired
    public CatalogSearchService(@Value("${GOOGLE_BOOKS_API_KEY:}") String googleKey,
            @Value("${TMDB_API_READ_TOKEN:}") String tmdbToken, NationalLibraryBookClient nationalLibrary) {
        this(googleKey, tmdbToken, nationalLibrary, createClient());
    }
    CatalogSearchService(String googleKey, String tmdbToken, NationalLibraryBookClient nationalLibrary, RestClient client) {
        this.googleKey = googleKey.trim(); this.tmdbToken = tmdbToken.trim();
        this.nationalLibrary = nationalLibrary; this.client = client;
    }
    private static RestClient createClient() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000); factory.setReadTimeout(7000);
        return RestClient.builder().requestFactory(factory).build();
    }
    public BookDto.SearchPage search(String query, String author, int page, MediaType type, String provider) {
        String term = query == null ? "" : query.trim();
        String creator = author == null ? "" : author.trim();
        if (term.length() > 200 || creator.length() > 200 || page < 1 || page > 500)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "검색어 또는 페이지 범위를 확인해 주세요.");
        if (term.isBlank()) return new BookDto.SearchPage(List.of(), page, 0, false);
        try { return switch (type) {
            case BOOK -> unifiedBooks(term, creator, page);
            case TV, MOVIE -> tmdb(term, page, type);
            case MUSIC -> music(term, creator, page);
        }; } catch (org.json.JSONException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "외부 자료 검색 응답을 확인하지 못했습니다.");
        }
    }
    private BookDto.SearchPage unifiedBooks(String term, String author, int page) {
        // Null is only used by isolated provider tests; production always injects the library client.
        if (nationalLibrary == null) return google(term, author, page);
        long deadline = System.nanoTime() + 8_000_000_000L;
        var googleFuture = bookLookup(() -> google(term, author, page));
        var libraryFuture = bookLookup(() -> nationalLibrary.searchPage(term, author, page));
        BookDto.SearchPage googlePage = available(googleFuture, deadline);
        BookDto.SearchPage libraryPage = available(libraryFuture, deadline);
        if (googlePage == null && libraryPage == null)
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "도서 검색에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        var library = new LinkedHashMap<String, BookDto.BookResponse>();
        if (libraryPage != null) libraryPage.items().forEach(b -> library.put(CatalogIdentity.comparable(b.isbn()), b));
        var merged = new LinkedHashMap<String, BookDto.BookResponse>();
        if (googlePage != null) {
            // Title pages differ between providers. Exact ISBN lookups avoid missing Korean metadata.
            var lookups = new LinkedHashMap<String, java.util.concurrent.CompletableFuture<BookDto.SearchPage>>();
            for (var book : googlePage.items()) {
                String isbn = BookIsbn.canonical(book.isbn());
                if (isbn != null && !library.containsKey(isbn))
                    lookups.putIfAbsent(isbn, bookLookup(
                            () -> nationalLibrary.searchPage(isbn, "", 1)));
            }
            lookups.forEach((isbn, future) -> {
                var result = available(future, deadline);
                if (result != null) result.items().stream().filter(b -> isbn.equals(BookIsbn.canonical(b.isbn())))
                        .findFirst().ifPresent(b -> library.put(isbn, b));
            });
            for (var book : googlePage.items()) {
                String key = CatalogIdentity.comparable(book.isbn());
                merged.put(key, mergeBook(book, library.get(key)));
            }
        }
        if (libraryPage != null) libraryPage.items().forEach(b -> merged.putIfAbsent(CatalogIdentity.comparable(b.isbn()), b));
        // Provider totals overlap; use -1 for unknown unique count rather than adding duplicates.
        return new BookDto.SearchPage(List.copyOf(merged.values()), page, -1,
                page < 500 && ((googlePage != null && googlePage.hasMore()) || (libraryPage != null && libraryPage.hasMore())));
    }
    private java.util.concurrent.CompletableFuture<BookDto.SearchPage> bookLookup(java.util.function.Supplier<BookDto.SearchPage> request) {
        try { return java.util.concurrent.CompletableFuture.supplyAsync(request, bookLookups); }
        catch (java.util.concurrent.RejectedExecutionException busy) { return java.util.concurrent.CompletableFuture.failedFuture(busy); }
    }
    private static BookDto.SearchPage available(java.util.concurrent.CompletableFuture<BookDto.SearchPage> future, long deadline) {
        try { return future.get(Math.max(0, deadline - System.nanoTime()), java.util.concurrent.TimeUnit.NANOSECONDS); }
        catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); future.cancel(true); return null; }
        catch (java.util.concurrent.ExecutionException | java.util.concurrent.TimeoutException failure) { future.cancel(true); return null; }
    }
    static BookDto.BookResponse mergeBook(BookDto.BookResponse google, BookDto.BookResponse library) {
        if (library == null || BookIsbn.canonical(google.isbn()) == null
                || !BookIsbn.canonical(google.isbn()).equals(BookIsbn.canonical(library.isbn()))) return google;
        return new BookDto.BookResponse(prefer(library.title(), google.title()), prefer(google.subtitle(), library.subtitle()),
                prefer(library.author(), google.author()), prefer(library.publisher(), google.publisher()), google.isbn(),
                library.pubDate() == null ? google.pubDate() : library.pubDate(), prefer(google.coverImg(), library.coverImg()),
                google.customCoverImg(), prefer(google.description(), library.description()), google.difficulty(), google.adult(),
                prefer(library.pageCount(), google.pageCount()), prefer(library.bookSize(), google.bookSize()),
                prefer(library.seriesTitle(), google.seriesTitle()), prefer(library.edition(), google.edition()),
                prefer(library.tableOfContents(), google.tableOfContents()), prefer(library.publicationDate(), google.publicationDate()),
                MediaType.BOOK, google.source(), google.sourceId(), google.sourceUrl());
    }
    private static String prefer(String first, String fallback) { return first == null || first.isBlank() ? fallback : first; }
    private BookDto.SearchPage google(String term, String author, int page) {
        requireKey(googleKey, "Google Books");
        String isbn = BookIsbn.canonical(term);
        String query = isbn != null ? "isbn:" + isbn : "intitle:\"" + term.replace("\"", "") + "\"" + (author.isBlank() ? "" : " inauthor:\"" + author.replace("\"", "") + "\"");
        JSONObject data = get("https://www.googleapis.com/books/v1/volumes",
                Map.of("q", query, "key", googleKey, "startIndex", (page - 1) * 30, "maxResults", 30), false);
        List<BookDto.BookResponse> rows = new ArrayList<>();
        JSONArray items = data.optJSONArray("items");
        if (items == null && data.optLong("totalItems", -1) != 0) invalid();
        if (items != null) for (int i = 0; i < items.length(); i++) rows.add(googleBook(items.getJSONObject(i)));
        return page(rows, page, data.optLong("totalItems"), 30);
    }
    static BookDto.BookResponse googleBook(JSONObject item) {
        JSONObject v = item.getJSONObject("volumeInfo");
        String id = item.getString("id");
        if (CatalogIdentity.sourceUrl("GOOGLE_BOOKS", id) == null) invalid();
        String isbn = null;
        JSONArray identifiers = v.optJSONArray("industryIdentifiers");
        if (identifiers != null) for (int i = 0; i < identifiers.length(); i++) {
            String candidate = BookIsbn.canonical(identifiers.getJSONObject(i).optString("identifier"));
            if (candidate != null) { isbn = candidate; break; }
        }
        JSONObject images = v.optJSONObject("imageLinks");
        String cover = images == null ? "" : images.optString("thumbnail", images.optString("smallThumbnail"));
        return row(v.optString("title"), v.optString("subtitle"), join(v.optJSONArray("authors"), null),
                v.optString("publisher"), isbn == null ? "google-books-" + id : isbn,
                cover, v.optString("description"), v.optString("publishedDate"),
                v.has("pageCount") ? String.valueOf(v.optInt("pageCount")) : "", MediaType.BOOK, "GOOGLE_BOOKS", id);
    }
    private BookDto.SearchPage tmdb(String query, int page, MediaType type) {
        requireKey(tmdbToken, "TMDB");
        String kind = type == MediaType.TV ? "tv" : "movie";
        JSONObject data = get("https://api.themoviedb.org/3/search/" + kind,
                Map.of("query", query, "page", page, "language", "ko-KR", "include_adult", false), true);
        JSONArray items = data.getJSONArray("results");
        List<BookDto.BookResponse> rows = new ArrayList<>();
        for (int i = 0; i < items.length(); i++) rows.add(tmdbItem(items.getJSONObject(i), type));
        return new BookDto.SearchPage(rows, page, data.optLong("total_results"), page < Math.min(500, data.optInt("total_pages")));
    }
    static BookDto.BookResponse tmdbItem(JSONObject v, MediaType type) {
        String kind = type == MediaType.TV ? "tv" : "movie";
        String id = kind + "/" + v.getLong("id");
        if (CatalogIdentity.sourceUrl("TMDB", id) == null) invalid();
        String poster = v.optString("poster_path", "");
        String cover = poster.matches("/[A-Za-z0-9_.-]+") ? "https://image.tmdb.org/t/p/w500" + poster : "";
        var base = row(v.optString(type == MediaType.TV ? "name" : "title"), v.optString("tagline"),
                join(v.optJSONArray("created_by"), "name"), join(v.optJSONArray("production_companies"), "name"),
                "tmdb-" + kind + "-" + v.getLong("id"), cover, v.optString("overview"),
                v.optString(type == MediaType.TV ? "first_air_date" : "release_date"), "", type, "TMDB", id);
        return new BookDto.BookResponse(base.title(), base.subtitle(), base.author(), base.publisher(), base.isbn(), base.pubDate(),
                base.coverImg(), null, base.description(), null, false, "", "", "", "", "", base.publicationDate(),
                base.mediaType(), base.source(), base.sourceId(), base.sourceUrl(), null,
                v.optLong("runtime") > 0 ? v.getLong("runtime") * 60000 : null,
                v.optString(type == MediaType.TV ? "original_name" : "original_title"), v.optString("original_language"));
    }
    private BookDto.SearchPage music(String query, String artist, int page) {
        String artistFilter = "";
        if (!artist.isBlank()) {
            // Release search indexes credited names, not artist aliases (e.g. 아이유 -> IU).
            JSONObject matches = musicRequest("artist", "artist:\"" + escapeLucene(artist) + "\" OR alias:\"" + escapeLucene(artist) + "\"", 1);
            JSONArray artists = matches.getJSONArray("artists");
            List<String> ids = new ArrayList<>();
            for (int i = 0; i < Math.min(artists.length(), 5); i++) {
                String id = artists.getJSONObject(i).optString("id");
                if (id.matches("[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}")) ids.add("arid:" + id);
            }
            if (ids.isEmpty()) return new BookDto.SearchPage(List.of(), page, 0, false);
            artistFilter = " AND (" + String.join(" OR ", ids) + ")";
        }
        List<BookDto.BookResponse> rows = new ArrayList<>();
        boolean hasMore = false;
        int succeeded = 0;
        ResponseStatusException lastFailure = null;
        for (String kind : List.of("release", "recording")) {
            try {
                JSONObject data = musicRequest(kind, kind + ":\"" + escapeLucene(query) + "\"" + artistFilter, page);
                JSONArray items = data.getJSONArray(kind + "s");
                for (int i = 0; i < items.length(); i++) rows.add(kind.equals("release")
                        ? musicItem(items.getJSONObject(i)) : musicRecording(items.getJSONObject(i)));
                hasMore |= (long) page * 30 < data.optLong("count");
                succeeded++;
            } catch (ResponseStatusException failure) { lastFailure = failure; }
        }
        if (succeeded == 0) throw lastFailure;
        var distinct = new LinkedHashMap<String, BookDto.BookResponse>();
        rows.forEach(row -> distinct.putIfAbsent(row.isbn(), row));
        return new BookDto.SearchPage(List.copyOf(distinct.values()), page, -1, hasMore && page < 500);
    }
    static String musicArtists(JSONArray credits) {
        if (credits == null) return "";
        StringBuilder names = new StringBuilder();
        for (int i = 0; i < credits.length(); i++) {
            var credit = credits.getJSONObject(i);
            String name = credit.optString("name");
            JSONObject artist = credit.optJSONObject("artist");
            if (name.isBlank() && artist != null) name = artist.optString("name");
            JSONArray aliases = artist == null ? null : artist.optJSONArray("aliases");
            if (aliases != null) for (int j = 0; j < aliases.length(); j++) {
                var alias = aliases.getJSONObject(j);
                if ("ko".equals(alias.optString("locale")) && !alias.optString("name").isBlank()) {
                    name = alias.getString("name");
                    if (alias.optBoolean("primary")) break;
                }
            }
            names.append(name);
            names.append(credit.optString("joinphrase", i < credits.length() - 1 ? ", " : ""));
        }
        return names.toString();
    }
    static BookDto.BookResponse musicRecording(JSONObject recording) {
        String id = recording.getString("id");
        if (CatalogIdentity.sourceUrl("MUSICBRAINZ_RECORDING", id) == null) invalid();
        JSONArray releases = recording.optJSONArray("releases");
        List<JSONObject> candidates = new ArrayList<>();
        if (releases != null) for (int i = 0; i < releases.length(); i++) {
            var release = releases.getJSONObject(i);
            if (CatalogIdentity.sourceUrl("MUSICBRAINZ", release.optString("id")) != null) candidates.add(release);
        }
        candidates.sort(Comparator.comparingInt((JSONObject r) -> "Official".equals(r.optString("status")) ? 0 : 1)
                .thenComparingInt(r -> {
                    var group = r.optJSONObject("release-group");
                    return group != null && group.optJSONArray("secondary-types") != null
                            && group.getJSONArray("secondary-types").toList().contains("Compilation") ? 1 : 0;
                }).thenComparing(r -> r.optString("date", "9999")));
        JSONObject release = candidates.isEmpty() ? new JSONObject() : candidates.get(0);
        String releaseId = release.optString("id");
        var base = row(recording.optString("title"), "", musicArtists(recording.optJSONArray("artist-credit")), "",
                "musicbrainz-recording-" + id, releaseId.isBlank() ? "" : "https://coverartarchive.org/release/" + releaseId + "/front-500",
                "", recording.optString("first-release-date", release.optString("date")), "", MediaType.MUSIC, "MUSICBRAINZ_RECORDING", id);
        return new BookDto.BookResponse(base.title(), base.subtitle(), base.author(), base.publisher(), base.isbn(), base.pubDate(),
                base.coverImg(), null, base.description(), null, false, "", "", "", "", "", base.publicationDate(),
                base.mediaType(), base.source(), base.sourceId(), base.sourceUrl(), release.optString("title"),
                recording.optLong("length") > 0 ? recording.getLong("length") : null);
    }
    // MusicBrainz requires at most one request per second per client. Repeated pages use a bounded cache.
    private synchronized JSONObject musicRequest(String entity, String query, int page) {
        long now = System.nanoTime();
        String cacheKey = entity + "\n" + query + "\n" + page;
        var cached = musicCache.get(cacheKey);
        if (cached != null && now < cached.expires()) return cached.payload();
        long waitNanos = musicRequested ? 1_100_000_000L - (now - lastMusicRequest) : 0;
        if (waitNanos > 0) {
            try { Thread.sleep(waitNanos / 1_000_000 + 1); }
            catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "음악 검색이 중단되었습니다. 다시 시도해 주세요.");
            }
        }
        lastMusicRequest = System.nanoTime();
        musicRequested = true;
        JSONObject data = get("https://musicbrainz.org/ws/2/" + entity + "/", Map.of("query", query, "fmt", "json", "limit", 30, "offset", (page - 1) * 30), false);
        if (musicCache.size() >= 100) musicCache.remove(musicCache.keySet().iterator().next());
        musicCache.put(cacheKey, new CachedMusic(System.nanoTime() + 300_000_000_000L, data));
        return data;
    }
    static BookDto.BookResponse musicItem(JSONObject v) {
        String id = v.getString("id");
        if (CatalogIdentity.sourceUrl("MUSICBRAINZ", id) == null) invalid();
        List<String> labels = new ArrayList<>();
        JSONArray labelInfo = v.optJSONArray("label-info");
        if (labelInfo != null) for (int i = 0; i < labelInfo.length(); i++) {
            JSONObject label = labelInfo.getJSONObject(i).optJSONObject("label");
            if (label != null && !label.optString("name").isBlank()) labels.add(label.optString("name"));
        }
        return row(v.optString("title"), "", musicArtists(v.optJSONArray("artist-credit")),
                String.join(", ", labels), "musicbrainz-" + id,
                "https://coverartarchive.org/release/" + id + "/front-500", "", v.optString("date"), "",
                MediaType.MUSIC, "MUSICBRAINZ", id);
    }
    public BookDto.BookResponse details(String source, String id) {
        if (!"TMDB".equals(source) || CatalogIdentity.sourceUrl(source, id) == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 자료 식별자입니다.");
        requireKey(tmdbToken, "TMDB");
        JSONObject data = get("https://api.themoviedb.org/3/" + id, Map.of("language", "ko-KR"), true);
        if (data.optString("overview").isBlank()) {
            JSONObject english = get("https://api.themoviedb.org/3/" + id, Map.of("language", "en-US"), true);
            data.put("overview", english.optString("overview"));
            if (data.optString("tagline").isBlank()) data.put("tagline", english.optString("tagline"));
        }
        return tmdbItem(data, id.startsWith("tv/") ? MediaType.TV : MediaType.MOVIE);
    }
    private JSONObject get(String base, Map<String, ?> parameters, boolean tmdb) {
        var params = new LinkedHashMap<String, Object>(parameters);
        boolean v3 = tmdb && tmdbToken.matches("[a-fA-F0-9]{32}");
        if (v3) params.put("api_key", tmdbToken);
        var builder = UriComponentsBuilder.fromUriString(base);
        params.forEach((k, value) -> builder.queryParam(k, "{" + k + "}"));
        URI uri = builder.encode().buildAndExpand(params).toUri();
        for (int attempt = 0; attempt < 2; attempt++) {
            try {
                var request = client.get().uri(uri).header("User-Agent", "WeeklyComma/1.0 (https://weeklycomma.kro.kr)");
                if (tmdb && !v3) request.header("Authorization", "Bearer " + tmdbToken);
                JSONObject response = new JSONObject(request.retrieve().body(String.class));
                if (response.has("error")) invalid();
                return response;
            } catch (Exception exception) {
                if (attempt == 0 && "musicbrainz.org".equals(uri.getHost())
                        && exception instanceof org.springframework.web.client.RestClientResponseException failure
                        && (failure.getStatusCode().value() == 503 || failure.getStatusCode().value() == 429)) {
                    try { Thread.sleep(1100); }
                    catch (InterruptedException interrupted) {
                        Thread.currentThread().interrupt();
                        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "음악 검색이 중단되었습니다. 다시 시도해 주세요.");
                    }
                    lastMusicRequest = System.nanoTime();
                    continue;
                }
                // Never expose URLs, auth headers, or provider bodies (they can contain API credentials).
                org.neatore.weeklycomma.WeeklyComma.LOGGER.warn("Catalogue request failed: host={}, status={}, type={}",
                        uri.getHost(), exception instanceof org.springframework.web.client.RestClientResponseException responseError
                                ? responseError.getStatusCode().value() : 0, exception.getClass().getSimpleName());
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "외부 자료 검색에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
            }
        }
        throw new IllegalStateException("Unreachable request attempt");
    }
    private static BookDto.SearchPage page(List<BookDto.BookResponse> rows, int page, long total, int size) {
        var distinct = new LinkedHashMap<String, BookDto.BookResponse>();
        rows.forEach(row -> distinct.putIfAbsent(row.isbn(), row));
        return new BookDto.SearchPage(List.copyOf(distinct.values()), page, total, (long) page * size < total && page < 500);
    }
    private static BookDto.BookResponse row(String title, String subtitle, String creator, String publisher,
            String key, String cover, String description, String rawDate, String pages, MediaType type, String source, String id) {
        String date = NationalLibraryBookClient.publicationDate(rawDate);
        String safeCover = "";
        try {
            URI uri = URI.create(cover.replaceFirst("^http://", "https://"));
            if ("https".equals(uri.getScheme()) && uri.getHost() != null) safeCover = uri.toString();
        } catch (IllegalArgumentException ignored) {}
        return new BookDto.BookResponse(title, subtitle, creator, publisher, key, null, safeCover, null,
                description, null, false, pages, "", "", "", "", date, type, source, id, CatalogIdentity.sourceUrl(source, id));
    }
    private static String join(JSONArray array, String field) {
        if (array == null) return "";
        List<String> values = new ArrayList<>();
        for (int i = 0; i < array.length(); i++) {
            String value = field == null ? array.optString(i) : array.optJSONObject(i) == null ? "" : array.getJSONObject(i).optString(field);
            if (!value.isBlank()) values.add(value);
        }
        return String.join(", ", values);
    }
    private static String escapeLucene(String text) { return text.replace("\\", "\\\\").replace("\"", "\\\""); }
    private static void requireKey(String key, String name) {
        if (key.isBlank()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, name + " 인증키가 설정되지 않았습니다.");
    }
    private static void invalid() { throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "외부 자료 검색 응답을 확인하지 못했습니다."); }
}
