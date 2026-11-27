package org.neatore.weeklycomma.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class NationalLibraryBookClientTest {
    private MockRestServiceServer server;
    private NationalLibraryBookClient client;

    @BeforeEach void setup() {
        var builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new NationalLibraryBookClient("test-secret", builder.build());
    }

    @Test void mapsBibliographicFieldsWithoutSplittingHyphenatedTitles() {
        var books = NationalLibraryBookClient.parseResponse("""
                {"TOTAL_COUNT":"1","PAGE_NO":"1","docs":[{
                  "EA_ISBN":"978-89-374-8025-6","TITLE":"데미안 - 에밀 싱클레어의 이야기",
                  "AUTHOR":"헤르만 헤세","PUBLISHER":"민음사","PUBLISH_PREDATE":"20001220",
                  "TITLE_URL":"https://example.test/cover.jpg","PAGE":"239 p.","BOOK_SIZE":"23 cm",
                  "SERIES_TITLE":"세계문학전집","EDITION_STMT":"개정판",
                  "BOOK_INTRODUCTION":"책 소개","BOOK_TB_CNT":"첫 장\\n두 번째 장"
                }]}
                """);
        assertEquals(1, books.size());
        var book = books.get(0);
        assertEquals("9788937480256", book.isbn());
        assertEquals("데미안 - 에밀 싱클레어의 이야기", book.title());
        assertEquals("239 p.", book.pageCount());
        assertEquals("23 cm", book.bookSize());
        assertEquals("세계문학전집", book.seriesTitle());
        assertEquals("개정판", book.edition());
        assertEquals("첫 장\n두 번째 장", book.tableOfContents());
        assertEquals("2000-12-20", book.publicationDate());
        assertNotNull(book.pubDate());
    }

    @Test void handlesMissingOptionalFieldsDuplicateAndSetOnlyRecords() {
        var books = NationalLibraryBookClient.parseResponse("""
                {"TOTAL_COUNT":"5","docs":[
                 {"EA_ISBN":"8937480255","TITLE":"데미안","TITLE_URL":"javascript:alert(1)"},
                 {"EA_ISBN":"9788937480256","TITLE":"같은 책"},
                 {"SET_ISBN":"9788937480256","TITLE":"세트"},
                 {"EA_ISBN":"9788937480258","TITLE":"잘못된 ISBN"},
                 {"EA_ISBN":"9788937480256","TITLE":""}
                ]}
                """);
        assertEquals(1, books.size());
        assertEquals("9788937480256", books.get(0).isbn());
        assertEquals("", books.get(0).coverImg());
        assertEquals("", books.get(0).description());
        assertNull(books.get(0).pubDate());
        assertTrue(NationalLibraryBookClient.parseResponse("{\"TOTAL_COUNT\":\"0\",\"docs\":[]}").isEmpty());
    }

    @Test void upgradesLegacyHttpCoverUrlsForTheHttpsSite() {
        for (String url : new String[]{"http://www.nl.go.kr/cover.jpg", "//www.nl.go.kr/cover.jpg", "https://www.nl.go.kr/cover.jpg"}) {
            var books = NationalLibraryBookClient.parseResponse("""
                    {"TOTAL_COUNT":"1","docs":[{"EA_ISBN":"9788937460449","TITLE":"데미안","TITLE_URL":"%s"}]}
                    """.formatted(url));
            assertEquals("https://www.nl.go.kr/cover.jpg", books.get(0).coverImg());
        }
    }

    @Test void preservesPartialDatesAndRejectsInvalidDates() {
        assertEquals("2026", NationalLibraryBookClient.publicationDate("20260000"));
        assertEquals("2026-11", NationalLibraryBookClient.publicationDate("20261100"));
        assertEquals("2026-11-15", NationalLibraryBookClient.publicationDate("2026-11-15"));
        for (String value : new String[]{"", "00000000", "20260230", "20260012", "20261300", "미정"})
            assertEquals("", NationalLibraryBookClient.publicationDate(value));
    }

    @Test void encodesSearchTermsAndUsesIsbnForIdentifiers() {
        server.expect(request -> {
            assertEquals(HttpMethod.GET, request.getMethod());
            var uri = request.getURI();
            assertEquals("www.nl.go.kr", uri.getHost());
            assertEquals("/seoji/SearchApi.do", uri.getPath());
            var params = UriComponentsBuilder.fromUri(uri).build().getQueryParams();
            assertEquals("test-secret", params.getFirst("cert_key"));
            assertFalse(params.containsKey("author"));
            assertFalse(params.containsKey("injected"));
            assertTrue(uri.getRawQuery().contains("%26injected%3D"));
        }).andRespond(withSuccess("{\"TOTAL_COUNT\":\"0\",\"docs\":[]}", MediaType.APPLICATION_JSON));
        client.searchBooks("책 &injected=1 + 이야기");
        server.verify();
        server.reset();
        server.expect(request -> assertTrue(request.getURI().getQuery().contains("isbn=9788937480256")))
                .andRespond(withSuccess("{\"TOTAL_COUNT\":0,\"docs\":[]}", MediaType.APPLICATION_JSON));
        client.searchBooks("8937480255");
        server.verify();
    }

    @Test void rejectsMissingConfigurationAndProviderErrorsWithoutLeakingSecrets() {
        var disabled = new NationalLibraryBookClient(" ");
        assertEquals(503, assertThrows(ResponseStatusException.class, () -> disabled.searchBooks("책")).getStatusCode().value());
        for (String payload : new String[]{
                "{\"RESULT\":\"ERROR\",\"ERR_CODE\":\"011\",\"ERR_MESSAGE\":\"test-secret\"}",
                "{\"RESULT\":\"ERROR\",\"ERR_CODE\":\"000\"}"}) {
            var error = assertThrows(ResponseStatusException.class, () -> NationalLibraryBookClient.parseResponse(payload));
            assertEquals(503, error.getStatusCode().value());
            assertFalse(error.toString().contains("test-secret"));
        }
        for (String payload : new String[]{"", "<html>failure</html>", "{}", "{\"docs\":[]}"})
            assertEquals(502, assertThrows(ResponseStatusException.class,
                    () -> NationalLibraryBookClient.parseResponse(payload)).getStatusCode().value());
        server.expect(request -> {}).andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR).body("test-secret"));
        var error = assertThrows(ResponseStatusException.class, () -> client.searchBooks("책"));
        assertEquals(502, error.getStatusCode().value());
        assertFalse(error.toString().contains("test-secret"));
        server.verify();
    }

    @Test void sendsAuthorAndPageAndKeepsPaginationWhenAllRowsAreFiltered() {
        server.expect(request -> {
            var query = request.getURI().getQuery();
            assertTrue(query.contains("author=백은별"));
            assertTrue(query.contains("page_no=2"));
            assertTrue(query.contains("title=시한부"));
        }).andRespond(withSuccess("""
                {"TOTAL_COUNT":"61","PAGE_NO":"2","docs":[{"TITLE":"세트","SET_ISBN":"9791193647646"}]}
                """, MediaType.APPLICATION_JSON));
        var page = client.searchPage("시한부", " 백은별 ", 2);
        assertTrue(page.items().isEmpty());
        assertTrue(page.hasMore());
        assertEquals(61, page.total());
        assertEquals(2, page.page());
        server.verify();
    }

    @Test void isbnSearchIgnoresAuthorAndLastPageHasNoNextPage() {
        server.expect(request -> {
            assertTrue(request.getURI().getQuery().contains("isbn=9791193647646"));
            assertFalse(request.getURI().getQuery().contains("author="));
        }).andRespond(withSuccess("""
                {"TOTAL_COUNT":"1","docs":[{"TITLE":"시한부","EA_ISBN":"9791193647646"}]}
                """, MediaType.APPLICATION_JSON));
        assertFalse(client.searchPage("9791193647646", "백은별", 1).hasMore());
        server.verify();
    }

    @Test void rejectsInvalidPageAndOversizedAuthorBeforeRequest() {
        for (int page : new int[]{0, -1, 10001})
            assertEquals(400, assertThrows(ResponseStatusException.class,
                    () -> client.searchPage("고래", "", page)).getStatusCode().value());
        assertEquals(400, assertThrows(ResponseStatusException.class,
                () -> client.searchPage("고래", "a".repeat(201), 1)).getStatusCode().value());
        server.verify();
    }
}
