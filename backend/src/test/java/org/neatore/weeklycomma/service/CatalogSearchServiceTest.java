package org.neatore.weeklycomma.service;

import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import org.neatore.weeklycomma.domain.MediaType;
import org.neatore.weeklycomma.util.CatalogIdentity;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class CatalogSearchServiceTest {
    @Test void preservesIsbnAndSupportsBooksWithoutIsbn() {
        var raw = new JSONObject("""
                {"id":"abc_X","volumeInfo":{"title":"시한부","authors":["백은별"],"description":"소개",
                "imageLinks":{"thumbnail":"http://books.google.com/cover.jpg"},"publishedDate":"2024-02",
                "industryIdentifiers":[{"identifier":"9791193647646"}]}}
                """);
        var book = CatalogSearchService.googleBook(raw);
        assertEquals("9791193647646", book.isbn());
        assertEquals(MediaType.BOOK, book.mediaType());
        assertEquals("2024-02", book.publicationDate());
        assertEquals("https://books.google.com/cover.jpg", book.coverImg());
        raw.getJSONObject("volumeInfo").remove("industryIdentifiers");
        assertEquals("google-books-abc_X", CatalogSearchService.googleBook(raw).isbn());
    }
    @Test void mediaIdsDoNotCollideAndMissingArtworkIsSafe() {
        var raw = new JSONObject("{\"id\":7,\"name\":\"TV\",\"title\":\"Movie\",\"poster_path\":null}");
        raw.put("original_title", "英雄").put("original_name", "Original TV").put("original_language", "zh");
        var tv = CatalogSearchService.tmdbItem(raw, MediaType.TV);
        var movie = CatalogSearchService.tmdbItem(raw, MediaType.MOVIE);
        assertEquals("tmdb-tv-7", tv.isbn());
        assertEquals("tmdb-movie-7", movie.isbn());
        assertEquals("英雄", movie.originalTitle());
        assertEquals("zh", movie.originalLanguage());
        assertEquals("Original TV", tv.originalTitle());
        assertNotEquals(CatalogIdentity.comparable(tv.isbn()), CatalogIdentity.comparable(movie.isbn()));
        assertEquals("", tv.coverImg());
        assertEquals("", tv.author());
        assertNull(CatalogIdentity.sourceUrl("TMDB", "tv/../../secrets"));
        assertNull(CatalogIdentity.sourceUrl("GOOGLE_BOOKS", "x&redirect=bad"));
    }
    @Test void googleRequestsEncodeKeysAndFiltersAndDeduplicateEditions() {
        var builder = RestClient.builder(); var server = MockRestServiceServer.bindTo(builder).build();
        var client = new CatalogSearchService("secret&key", "", null, builder.build());
        server.expect(r -> {
            assertEquals("www.googleapis.com", r.getURI().getHost());
            assertTrue(r.getURI().getRawQuery().contains("secret%26key"));
            assertTrue(r.getURI().getQuery().contains("startIndex=30"));
        }).andRespond(withSuccess("""
                {"totalItems":61,"items":[{"id":"a","volumeInfo":{"title":"A","industryIdentifiers":[{"identifier":"9791193647646"}]}},
                {"id":"b","volumeInfo":{"title":"B","industryIdentifiers":[{"identifier":"9791193647646"}]}}]}
                """, org.springframework.http.MediaType.APPLICATION_JSON));
        var result = client.search("시한부", "백은별", 2, MediaType.BOOK, "GOOGLE_BOOKS");
        assertEquals(1, result.items().size()); assertTrue(result.hasMore()); server.verify();
    }
    @Test void supportsBothTmdbCredentialFormatsAndEnglishOverviewFallback() {
        for (String credential : new String[]{"a".repeat(32), "read-access-token"}) {
            var builder = RestClient.builder(); var server = MockRestServiceServer.bindTo(builder).build();
            var client = new CatalogSearchService("", credential, null, builder.build());
            server.expect(r -> {
                assertEquals("/3/tv/7", r.getURI().getPath());
                if (credential.length() == 32) assertTrue(r.getURI().getQuery().contains("api_key="));
                else assertEquals("Bearer read-access-token", r.getHeaders().getFirst("Authorization"));
            }).andRespond(withSuccess("{\"id\":7,\"name\":\"제목\",\"overview\":\"\"}", org.springframework.http.MediaType.APPLICATION_JSON));
            server.expect(r -> assertTrue(r.getURI().getQuery().contains("en-US")))
                    .andRespond(withSuccess("{\"overview\":\"English synopsis\",\"tagline\":\"Tagline\"}", org.springframework.http.MediaType.APPLICATION_JSON));
            var result = client.details("TMDB", "tv/7");
            assertEquals("제목", result.title()); assertEquals("English synopsis", result.description());
            server.verify();
        }
    }
    @Test void cachesMusicPagesAndMapsArtistAndReleaseIdentity() {
        var builder = RestClient.builder(); var server = MockRestServiceServer.bindTo(builder).build();
        var client = new CatalogSearchService("", "", null, builder.build());
        server.expect(r -> assertEquals("/ws/2/artist/", r.getURI().getPath())).andRespond(withSuccess("""
                {"artists":[{"id":"12345678-1234-1234-1234-123456789012","name":"IU"}]}
                """, org.springframework.http.MediaType.APPLICATION_JSON));
        server.expect(r -> {
            assertEquals("musicbrainz.org", r.getURI().getHost());
            assertTrue(r.getHeaders().getFirst("User-Agent").startsWith("WeeklyComma/"));
            assertTrue(r.getURI().getQuery().contains("arid:12345678-1234-1234-1234-123456789012"));
        }).andRespond(withSuccess("""
                {"count":1,"releases":[{"id":"12345678-1234-1234-1234-123456789012","title":"밤편지",
                "artist-credit":[{"name":"아이유"}],"date":"2017-03-24"}]}
                """, org.springframework.http.MediaType.APPLICATION_JSON));
        server.expect(r -> assertEquals("/ws/2/recording/", r.getURI().getPath())).andRespond(withSuccess("""
                {"count":1,"recordings":[{"id":"12345678-1234-1234-1234-123456789012","title":"밤편지","length":195000,
                "artist-credit":[{"name":"IU","artist":{"aliases":[{"locale":"ko","primary":true,"name":"아이유"}]}}],
                "releases":[{"id":"12345678-1234-1234-1234-123456789012","title":"Palette","status":"Official"}]}]}
                """, org.springframework.http.MediaType.APPLICATION_JSON));
        var first = client.search("밤편지", "아이유", 1, MediaType.MUSIC, "MUSICBRAINZ");
        var second = client.search("밤편지", "아이유", 1, MediaType.MUSIC, "MUSICBRAINZ");
        assertEquals(2, first.items().size());
        var song = first.items().get(1);
        assertNotEquals(first.items().get(0).isbn(), song.isbn());
        assertEquals("아이유", song.author()); assertEquals("Palette", song.albumTitle());
        assertEquals(195000L, song.durationMillis()); assertTrue(song.sourceUrl().contains("/recording/"));
        assertTrue(song.coverImg().contains("/release/"));
        assertEquals(first, second); assertEquals("아이유", first.items().get(0).author());
        assertTrue(first.items().get(0).isbn().startsWith("musicbrainz-"));
        assertEquals("", first.items().get(0).description()); server.verify();
    }
    @Test void retriesTransientMusicFailureOnce() {
        var builder = RestClient.builder(); var server = MockRestServiceServer.bindTo(builder).build();
        var client = new CatalogSearchService("", "", null, builder.build());
        server.expect(r -> {}).andRespond(withStatus(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE));
        server.expect(r -> {}).andRespond(withSuccess("{\"count\":0,\"releases\":[]}", org.springframework.http.MediaType.APPLICATION_JSON));
        server.expect(r -> {}).andRespond(withSuccess("{\"count\":0,\"recordings\":[]}", org.springframework.http.MediaType.APPLICATION_JSON));
        assertTrue(client.search("Album", "", 1, MediaType.MUSIC, "MUSICBRAINZ").items().isEmpty());
        server.verify();
    }
    @Test void providerFailuresNeverExposeCredentialsAndInvalidInputDoesNotFetch() {
        var builder = RestClient.builder(); var server = MockRestServiceServer.bindTo(builder).build();
        var client = new CatalogSearchService("secret", "", null, builder.build());
        assertThrows(ResponseStatusException.class, () -> client.search("x", "", 0, MediaType.BOOK, "GOOGLE_BOOKS"));
        assertThrows(ResponseStatusException.class, () -> client.details("TMDB", "tv/../../other"));
        server.expect(r -> {}).andRespond(withServerError().body("secret"));
        var failure = assertThrows(ResponseStatusException.class, () -> client.search("x", "", 1, MediaType.BOOK, "GOOGLE_BOOKS"));
        assertEquals(502, failure.getStatusCode().value()); assertFalse(failure.toString().contains("secret")); server.verify();
    }
}
