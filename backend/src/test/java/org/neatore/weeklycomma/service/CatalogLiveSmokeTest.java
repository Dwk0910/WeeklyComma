package org.neatore.weeklycomma.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.neatore.weeklycomma.domain.MediaType;
import static org.junit.jupiter.api.Assertions.*;

// Opt-in only: no credentials or external requests in CI's normal test suite.
@EnabledIfEnvironmentVariable(named = "CATALOG_LIVE_TESTS", matches = "true")
class CatalogLiveSmokeTest {
    @Test void searchesKoreanAndForeignTitlesWithConfiguredCredentials() {
        var client = new CatalogSearchService(System.getenv("GOOGLE_BOOKS_API_KEY"),
                System.getenv("TMDB_API_READ_TOKEN"), null);
        for (String[] book : new String[][]{{"고래", "천명관"}, {"시한부", "백은별"}, {"The Hobbit", "Tolkien"}}) {
            var result = client.search(book[0], book[1], 1, MediaType.BOOK, "GOOGLE_BOOKS");
            assertFalse(result.items().isEmpty(), "Expected book results: " + book[0]);
            System.out.printf("CATALOG %s: results=%d covers=%d descriptions=%d%n", book[0], result.items().size(),
                    result.items().stream().filter(x -> !x.coverImg().isBlank()).count(),
                    result.items().stream().filter(x -> !x.description().isBlank()).count());
        }
        for (String title : new String[]{"오징어 게임", "Breaking Bad"}) {
            var result = client.search(title, "", 1, MediaType.TV, "TMDB");
            assertFalse(result.items().isEmpty(), "Expected TV results");
            var first = result.items().get(0);
            var details = client.details(first.source(), first.sourceId());
            assertEquals(first.isbn(), details.isbn());
            assertFalse(details.coverImg().isBlank());
            assertFalse(details.description().isBlank());
        }
    }
    @Test void mergesSihanbuKoreanMetadataWithCoverAndDescription() {
        var client = new CatalogSearchService(System.getenv("GOOGLE_BOOKS_API_KEY"), "",
                new NationalLibraryBookClient(System.getenv("NL_API_KEY")));
        try {
            var result = client.search("시한부", "", 1, MediaType.BOOK, null);
            var book = result.items().stream().filter(b -> "9791193647646".equals(b.isbn())).findFirst().orElseThrow();
            assertEquals("백은별", book.author());
            assertTrue(book.publisher().contains("바른북스"));
            assertFalse(book.coverImg().isBlank());
            assertFalse(book.description().isBlank());
            System.out.printf("MERGED title=%s author=%s publisher=%s cover=%s descriptionLength=%d%n",
                    book.title(), book.author(), book.publisher(), book.coverImg(), book.description().length());
        } finally { client.close(); }
    }
    @Test void findsIoiSuddenlyInKoreanWithAlbumArtwork() throws Exception {
        var client = new CatalogSearchService("", "", null);
        try {
            var result = client.search("갑자기", "아이오아이", 1, MediaType.MUSIC, null);
            var song = result.items().stream().filter(b -> "MUSICBRAINZ_RECORDING".equals(b.source()) && "갑자기".equals(b.title())).findFirst().orElseThrow();
            assertTrue(song.author().contains("아이오아이"));
            assertTrue(song.albumTitle().contains("LOOP"));
            assertTrue(song.durationMillis() > 0);
            var http = java.net.http.HttpClient.newBuilder().followRedirects(java.net.http.HttpClient.Redirect.NORMAL).build();
            var response = http.send(java.net.http.HttpRequest.newBuilder(java.net.URI.create(song.coverImg())).timeout(java.time.Duration.ofSeconds(25)).GET().build(), java.net.http.HttpResponse.BodyHandlers.discarding());
            assertEquals(200, response.statusCode());
            assertTrue(response.headers().firstValue("content-type").orElse("").startsWith("image/"));
            System.out.printf("MUSIC song=%s artist=%s album=%s duration=%d artworkHTTP=%d%n", song.title(), song.author(), song.albumTitle(), song.durationMillis(), response.statusCode());
            var album = client.search("I.O.I : LOOP", "아이오아이", 1, MediaType.MUSIC, null);
            assertTrue(album.items().stream().anyMatch(b -> "MUSICBRAINZ".equals(b.source())));
        } finally { client.close(); }
    }
    @Test void searchesKoreanAndForeignMusicWithArtistAliases() {
        var client = new CatalogSearchService("", "", null);
        var music = client.search("밤편지", "아이유", 1, MediaType.MUSIC, "MUSICBRAINZ");
        assertFalse(music.items().isEmpty(), "Expected Korean music release");
        System.out.printf("CATALOG music: releases=%d%n", music.items().size());
        assertFalse(client.search("Abbey Road", "The Beatles", 1, MediaType.MUSIC, "MUSICBRAINZ").items().isEmpty());
    }
}
