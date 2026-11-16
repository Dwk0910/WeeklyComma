package org.neatore.weeklycomma.service;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.neatore.weeklycomma.dto.BookDto;
import org.neatore.weeklycomma.util.BookIsbn;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;

import static org.neatore.weeklycomma.WeeklyComma.LOGGER;

@Service
public class NationalLibraryBookClient {
    private final String key;
    private final RestClient client;

    @Autowired
    public NationalLibraryBookClient(@Value("${NL_API_KEY:}") String key) {
        this(key, createClient());
    }

    NationalLibraryBookClient(String key, RestClient client) {
        this.key = key.trim();
        this.client = client;
    }

    private static RestClient createClient() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(5000);
        return RestClient.builder().requestFactory(factory).build();
    }

    public List<BookDto.BookResponse> searchBooks(String query) {
        if (key.isBlank()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "국립중앙도서관 API 인증키가 설정되지 않았습니다.");
        String term = query.trim();
        if (term.isEmpty()) return List.of();
        if (term.length() > 200) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "검색어는 200자 이내로 입력해 주세요.");
        String isbn = BookIsbn.canonical(term);
        URI uri = UriComponentsBuilder.fromUriString("https://www.nl.go.kr/seoji/SearchApi.do")
                .queryParam("cert_key", "{key}")
                .queryParam("result_style", "json")
                .queryParam("page_no", 1).queryParam("page_size", 30)
                .queryParam(isbn == null ? "title" : "isbn", "{query}")
                .encode().buildAndExpand(key, isbn == null ? term : isbn).toUri();
        try {
            return parseResponse(client.get().uri(uri).retrieve().body(String.class));
        } catch (RestClientException exception) {
            // Request exceptions can contain the credential-bearing URL or provider response.
            LOGGER.warn("National Library book search failed: type={}", exception.getClass().getSimpleName());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "국립중앙도서관 도서 검색에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        }
    }

    static List<BookDto.BookResponse> parseResponse(String response) {
        try {
            var payload = new JSONObject(response == null ? "" : response);
            if (payload.has("ERR_CODE") || "ERROR".equalsIgnoreCase(payload.optString("RESULT"))) {
                String code = payload.optString("ERR_CODE");
                LOGGER.warn("National Library rejected book search: code={}", code.matches("\\d{3}") ? code : "unknown");
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                        List.of("010", "011").contains(code)
                                ? "국립중앙도서관 API 인증키와 승인 상태를 확인해 주세요."
                                : "국립중앙도서관 도서 검색을 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.");
            }
            JSONArray docs = payload.optJSONArray("docs");
            if (docs == null || !payload.has("TOTAL_COUNT")) throw new JSONException("Missing search results");
            var books = new LinkedHashMap<String, BookDto.BookResponse>();
            for (int i = 0; i < docs.length(); i++) {
                JSONObject doc = docs.getJSONObject(i);
                String isbn = BookIsbn.canonical(text(doc, "EA_ISBN"));
                String title = text(doc, "TITLE");
                // Set-only records have no individual book ISBN and cannot be registered as a book.
                if (isbn == null || title.isBlank()) continue;
                String publicationDate = publicationDate(text(doc, "PUBLISH_PREDATE"));
                books.putIfAbsent(isbn, new BookDto.BookResponse(
                        title, "", text(doc, "AUTHOR"), text(doc, "PUBLISHER"), isbn,
                        timestamp(publicationDate), coverUrl(text(doc, "TITLE_URL")), null,
                        text(doc, "BOOK_INTRODUCTION"), null, false,
                        text(doc, "PAGE"), text(doc, "BOOK_SIZE"), text(doc, "SERIES_TITLE"),
                        text(doc, "EDITION_STMT"), text(doc, "BOOK_TB_CNT"), publicationDate));
            }
            return List.copyOf(books.values());
        } catch (JSONException exception) {
            LOGGER.warn("National Library returned an invalid book search response");
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "국립중앙도서관 도서 검색의 응답을 확인하지 못했습니다.");
        }
    }

    private static String text(JSONObject object, String field) {
        Object value = object.opt(field);
        return value == null || value == JSONObject.NULL ? "" : value.toString().trim();
    }

    private static String coverUrl(String value) {
        try {
            if (value.startsWith("//")) value = "https:" + value;
            if (value.regionMatches(true, 0, "http://", 0, 7)) value = "https://" + value.substring(7);
            var uri = URI.create(value);
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null ? value : "";
        } catch (IllegalArgumentException exception) { return ""; }
    }

    // Preserve year/month precision instead of presenting an invented publication day.
    static String publicationDate(String raw) {
        String digits = raw.replaceAll("[-.\\s]", "");
        if (!digits.matches("\\d{4}(\\d{2}){0,2}")) return "";
        try {
            int year = Integer.parseInt(digits.substring(0, 4));
            if (year < 1000) return "";
            int month = digits.length() >= 6 ? Integer.parseInt(digits.substring(4, 6)) : 0;
            int day = digits.length() == 8 ? Integer.parseInt(digits.substring(6, 8)) : 0;
            if (month == 0 && day != 0) return "";
            LocalDate.of(year, month == 0 ? 1 : month, day == 0 ? 1 : day);
            return digits.substring(0, 4) + (month == 0 ? "" : "-" + digits.substring(4, 6))
                    + (day == 0 ? "" : "-" + digits.substring(6, 8));
        } catch (DateTimeException | NumberFormatException exception) { return ""; }
    }

    private static Long timestamp(String date) {
        if (date.isEmpty()) return null;
        String full = date.length() == 4 ? date + "-01-01" : date.length() == 7 ? date + "-01" : date;
        return LocalDate.parse(full).atStartOfDay().toEpochSecond(ZoneOffset.UTC);
    }
}
