package org.neatore.weeklycomma.service;

import org.junit.jupiter.api.Test;
import org.neatore.weeklycomma.dto.BookDto;
import org.neatore.weeklycomma.domain.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class UnifiedBookSearchTest {
    private static BookDto.BookResponse local(String isbn) {
        return new BookDto.BookResponse("시한부", "", "백은별", "바른북스", isbn, null, "", null,
                "", null, false, "200", "", "", "", "", "2024");
    }
    @Test void exactIsbnEnrichmentMergesMetadataEvenWhenTitlePageMissesIt() {
        var library = new NationalLibraryBookClient("test") {
            @Override public BookDto.SearchPage searchPage(String query, String author, int page) {
                return new BookDto.SearchPage(query.equals("9791193647646") ? List.of(local(query)) : List.of(), page, 60, true);
            }
        };
        var builder = RestClient.builder(); var server = MockRestServiceServer.bindTo(builder).build();
        server.expect(r -> {}).andRespond(withSuccess("""
            {"totalItems":1,"items":[{"id":"volume","volumeInfo":{"title":"시한부","authors":["Eun Byeol Baek"],
            "publisher":"Bareun Books","description":"소개","imageLinks":{"thumbnail":"https://books.google.com/cover"},
            "industryIdentifiers":[{"identifier":"9791193647646"}]}}]}
            """, org.springframework.http.MediaType.APPLICATION_JSON));
        var client = new CatalogSearchService("test", "", library, builder.build());
        try {
            var result = client.search("시한부", "", 1, MediaType.BOOK, null);
            assertEquals(1, result.items().size());
            var book = result.items().get(0);
            assertEquals("백은별", book.author()); assertEquals("바른북스", book.publisher());
            assertEquals("소개", book.description()); assertFalse(book.coverImg().isBlank());
            assertTrue(result.hasMore()); assertEquals(-1, result.total()); server.verify();
            assertSame(book, CatalogSearchService.mergeBook(book, local("9788936434120")));
        } finally { client.close(); }
    }
    @Test void eitherProviderCanFailButBothFailuresAreNotEmptySuccess() {
        for (boolean libraryFails : new boolean[]{false, true}) {
            var library = new NationalLibraryBookClient("test") {
                @Override public BookDto.SearchPage searchPage(String q, String a, int p) {
                    if (libraryFails) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY);
                    return new BookDto.SearchPage(List.of(local("9791193647646")), p, 1, false);
                }
            };
            var builder = RestClient.builder(); var server = MockRestServiceServer.bindTo(builder).build();
            server.expect(r -> {}).andRespond(withServerError());
            var client = new CatalogSearchService("test", "", library, builder.build());
            try {
                if (libraryFails) assertThrows(ResponseStatusException.class, () -> client.search("시한부", "", 1, MediaType.BOOK, null));
                else assertEquals("백은별", client.search("시한부", "", 1, MediaType.BOOK, null).items().get(0).author());
            } finally { client.close(); }
        }
        var library = new NationalLibraryBookClient("test") {
            @Override public BookDto.SearchPage searchPage(String q, String a, int p) { throw new ResponseStatusException(HttpStatus.BAD_GATEWAY); }
        };
        var builder = RestClient.builder(); var server = MockRestServiceServer.bindTo(builder).build();
        server.expect(r -> {}).andRespond(withSuccess("{\"totalItems\":1,\"items\":[{\"id\":\"one\",\"volumeInfo\":{\"title\":\"Foreign book\"}}]}", org.springframework.http.MediaType.APPLICATION_JSON));
        var client = new CatalogSearchService("test", "", library, builder.build());
        try { assertEquals("Foreign book", client.search("Foreign", "", 1, MediaType.BOOK, null).items().get(0).title()); }
        finally { client.close(); }
    }
}
