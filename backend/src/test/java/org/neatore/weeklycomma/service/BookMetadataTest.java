package org.neatore.weeklycomma.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.neatore.weeklycomma.controller.BookController;
import org.neatore.weeklycomma.dto.BookDto;
import org.neatore.weeklycomma.repository.BookRepository;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.sqlite.SQLiteDataSource;

import javax.sql.DataSource;
import java.nio.file.Path;
import java.time.Clock;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

class BookMetadataTest {
    @TempDir Path directory;

    @Test void schemaUpdateKeepsLegacyRowsAndStoresNewOptionalMetadata() {
        var source = new SQLiteDataSource();
        source.setUrl("jdbc:sqlite:" + directory.resolve("legacy.db"));
        var jdbc = new JdbcTemplate(source);
        jdbc.execute("""
                CREATE TABLE book (id INTEGER PRIMARY KEY AUTOINCREMENT, isbn TEXT UNIQUE,
                 title TEXT, sub_title TEXT, author TEXT, publisher TEXT, pub_date TIMESTAMP,
                 cover_img TEXT, description TEXT, difficulty TEXT, adult BOOLEAN, custom_cover_img TEXT)
                """);
        jdbc.update("INSERT INTO book(isbn, title, author, publisher, custom_cover_img) VALUES(?, ?, ?, ?, ?)",
                "8937480255", "기존 책", "저자", "출판사", "existing-cover");
        try (var context = new AnnotationConfigApplicationContext()) {
            context.registerBean(DataSource.class, () -> source);
            context.registerBean(Clock.class, Clock::systemUTC);
            context.registerBean(BookService.class,
                    () -> new BookService(context.getBean(BookRepository.class), null, null, null, null, null));
            context.register(RecommendationExpirationServiceTest.TestConfiguration.class);
            context.refresh();
            var repository = context.getBean(BookRepository.class);
            var legacy = repository.getBookByIsbn("8937480255").toDto();
            assertEquals("기존 책", legacy.title());
            assertEquals("existing-cover", legacy.customCoverImg());
            assertNull(legacy.pageCount());
            assertNull(legacy.pubDate());
            var service = context.getBean(BookService.class);
            service.upsertBook(new BookDto.RegisterRequest("9788937480256", "기존 책", "", "저자", "출판사",
                    null, "", null, "", "초급", false, "300 p.", "21 cm", "시리즈", "개정판",
                    "차례\n" + "목차 내용\n".repeat(100), "2026-11", false));
            var saved = repository.getBookByIsbn("8937480255").toDto();
            assertEquals(1, repository.count());
            assertEquals("300 p.", saved.pageCount());
            assertEquals("2026-11", saved.publicationDate());
            assertTrue(saved.tableOfContents().length() > 255);
            assertEquals("existing-cover", saved.customCoverImg());
            assertEquals(org.neatore.weeklycomma.domain.MediaType.BOOK, saved.mediaType());
            // Two providers' non-ISBN identifiers remain distinct, and survive SQLite persistence.
            for (String kind : new String[]{"tv", "movie"}) {
                var type = kind.equals("tv") ? org.neatore.weeklycomma.domain.MediaType.TV : org.neatore.weeklycomma.domain.MediaType.MOVIE;
                service.upsertBook(new BookDto.RegisterRequest("tmdb-" + kind + "-7", "작품", "", "", "",
                        null, "", null, "소개", "초급", false, "", "", "", "", "", "2026", false,
                        type, "TMDB", kind + "/7", "javascript:alert(1)"));
                var stored = service.getBookByIsbn("tmdb-" + kind + "-7").toDto();
                assertEquals(type, stored.mediaType());
                assertEquals("https://www.themoviedb.org/" + kind + "/7", stored.sourceUrl());
            }
            String id = "12345678-1234-1234-1234-123456789012";
            for (boolean song : new boolean[]{false, true}) {
                String key = (song ? "musicbrainz-recording-" : "musicbrainz-") + id;
                service.upsertBook(new BookDto.RegisterRequest(key, "갑자기", "", "아이오아이", "", null, "https://coverartarchive.org/release/" + id + "/front-500",
                        null, "", "초급", false, "", "", "", "", "", "2026", false,
                        org.neatore.weeklycomma.domain.MediaType.MUSIC, song ? "MUSICBRAINZ_RECORDING" : "MUSICBRAINZ", id, null,
                        song ? "I.O.I : LOOP" : null, song ? 195000L : null));
                var stored = service.getBookByIsbn(key).toDto();
                assertEquals(song ? "I.O.I : LOOP" : null, stored.albumTitle());
                assertEquals(song ? 195000L : null, stored.durationMillis());
                assertTrue(stored.sourceUrl().contains(song ? "/recording/" : "/release/"));
            }
            assertEquals(5, repository.count());
        }
    }

    @Test void registrationBindsMetadataWithoutRequiringMissingProviderFields() throws Exception {
        var captured = new AtomicReference<BookDto.RegisterRequest>();
        var service = new BookService(null, null, null, null, null, null) {
            @Override public void upsertBook(BookDto.RegisterRequest request) { captured.set(request); }
        };
        var mvc = MockMvcBuilders.standaloneSetup(new BookController(service, null, null)).build();
        var result = mvc.perform(multipart("/books")
                .param("isbn", "9788937480256").param("title", "책").param("author", "저자")
                .param("publisher", "출판사").param("pageCount", "300 p.")
                .param("tableOfContents", "첫 장\n마지막 장").param("publicationDate", "2026")
                .param("deleteCustomCover", "false")).andReturn();
        assertEquals(200, result.getResponse().getStatus());
        assertEquals("300 p.", captured.get().pageCount());
        assertEquals("첫 장\n마지막 장", captured.get().tableOfContents());
        assertNull(captured.get().coverImg());
        assertNull(captured.get().pubDate());
        assertFalse(captured.get().deleteCustomCover());
        var media = mvc.perform(multipart("/books").param("isbn", "tmdb-tv-7").param("title", "작품")
                .param("mediaType", "TV").param("source", "TMDB").param("sourceId", "tv/7")).andReturn();
        assertEquals(200, media.getResponse().getStatus());
        assertEquals(org.neatore.weeklycomma.domain.MediaType.TV, captured.get().mediaType());
        assertNull(captured.get().publisher());
    }
}
