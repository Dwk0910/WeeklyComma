package org.neatore.weeklycomma.service;

import com.zaxxer.hikari.HikariDataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.neatore.weeklycomma.domain.Book;
import org.neatore.weeklycomma.domain.Post;
import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.dto.BookDto;
import org.neatore.weeklycomma.dto.RecommendationSettingsDto;
import org.neatore.weeklycomma.dto.login.AuthType;
import org.neatore.weeklycomma.repository.BookRepository;
import org.neatore.weeklycomma.repository.BookStarRepository;
import org.neatore.weeklycomma.repository.UserRepository;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.server.ResponseStatusException;

import javax.sql.DataSource;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

class BookStarServiceTest {
    @TempDir Path directory;
    private AnnotationConfigApplicationContext context;
    private BookStarService stars;
    private BookRepository books;
    private UserRepository users;
    private RecommendationHistoryService history;
    private MutableClock clock;

    @BeforeEach
    void setUp() {
        clock = new MutableClock();
        clock.setDate("2026-10-14");
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl("jdbc:sqlite:" + directory.resolve("stars.db") + "?busy_timeout=5000");
        dataSource.setMaximumPoolSize(1);
        dataSource.setConnectionInitSql("PRAGMA foreign_keys=ON");
        context = new AnnotationConfigApplicationContext();
        context.registerBean(DataSource.class, () -> dataSource);
        context.registerBean(Clock.class, () -> clock);
        context.register(RecommendationExpirationServiceTest.TestConfiguration.class, StarConfiguration.class);
        context.refresh();
        stars = context.getBean(BookStarService.class);
        books = context.getBean(BookRepository.class);
        users = context.getBean(UserRepository.class);
        history = context.getBean(RecommendationHistoryService.class);
    }

    @AfterEach
    void tearDown() { if (context != null) context.close(); }

    @Test
    void statusIsPublicButMutationsRequireAUserAndExistingBook() {
        book("book-a");
        assertEquals(0, stars.getStatus("book-a", null).starCount());
        assertFalse(stars.getStatus("book-a", null).starred());
        assertEquals(401, assertThrows(ResponseStatusException.class,
                () -> stars.addStar("book-a", null)).getStatusCode().value());
        assertEquals(401, assertThrows(ResponseStatusException.class,
                () -> stars.removeStar("book-a", null)).getStatusCode().value());
        User user = user(0);
        assertEquals(404, assertThrows(ResponseStatusException.class,
                () -> stars.addStar("missing", user)).getStatusCode().value());
        assertEquals(404, assertThrows(ResponseStatusException.class,
                () -> stars.getStatus("missing", null)).getStatusCode().value());
    }

    @Test
    void eachUserCanRegisterAndCancelOnlyTheirOwnSingleStar() {
        book("book-a");
        User first = user(0), second = user(1);
        assertEquals(1, stars.addStar("book-a", first).starCount());
        assertTrue(stars.addStar("book-a", first).starred());
        assertEquals(1, stars.getStatus("book-a", first).starCount());
        assertFalse(stars.getStatus("book-a", second).starred());
        assertFalse(stars.getStatus("book-a", null).starred());
        assertEquals(2, stars.addStar("book-a", second).starCount());
        assertEquals(1, stars.removeStar("book-a", first).starCount());
        assertFalse(stars.removeStar("book-a", first).starred());
        assertEquals(1, stars.getStatus("book-a", null).starCount());
        assertTrue(stars.getStatus("book-a", second).starred());
    }

    @Test
    void onlyArchivedRecommendationsWithStrictlyMoreThanTenStarsQualify() {
        List<User> voters = voters(12);
        for (String isbn : List.of("ten", "eleven", "twelve", "never-selected")) book(isbn);
        archive("ten", 1);
        archive("eleven", 2);
        archive("twelve", 3);
        vote("ten", voters.subList(0, 10));
        vote("eleven", voters.subList(0, 11));
        vote("twelve", voters);
        vote("never-selected", voters);

        var ranked = stars.getPopularRecommendations(6);
        assertEquals(List.of("twelve", "eleven"), ranked.stream().map(b -> b.isbn()).toList());
        assertEquals(List.of(12L, 11L), ranked.stream().map(b -> b.starCount()).toList());
        stars.removeStar("eleven", voters.get(0));
        assertEquals(List.of("twelve"), stars.getPopularRecommendations(6).stream().map(b -> b.isbn()).toList());
    }

    @Test
    void rankingIsLimitedToSixAndUsesIsbnToBreakTies() {
        List<User> voters = voters(17);
        for (int i = 0; i < 8; i++) {
            String isbn = "rank-" + i;
            book(isbn);
            archive(isbn, i + 1);
            vote(isbn, voters.subList(0, 11 + i % 7));
        }
        var ranked = stars.getPopularRecommendations(6);
        assertEquals(6, ranked.size());
        assertEquals(List.of("rank-6", "rank-5", "rank-4", "rank-3", "rank-2", "rank-1"),
                ranked.stream().map(b -> b.isbn()).toList());
        book("rank-0-tie");
        archive("rank-0-tie", 99);
        vote("rank-0-tie", voters.subList(0, 11));
        var all = stars.getPopularRecommendations(50);
        assertEquals(List.of("rank-0", "rank-0-tie", "rank-7"),
                all.stream().filter(b -> b.starCount() == 11).map(b -> b.isbn()).toList());
    }

    @Test
    void repeatSelectionHistoryDoesNotDuplicateBooksOrMultiplyStarCountsAndIncludesCoverFileId() {
        Book book = book("book-a");
        book.setCustomCoverImg("stored-cover-file-id");
        books.save(book);
        archive("book-a", 1);
        archive("book-a", 2);
        vote("book-a", voters(11));
        var ranked = stars.getPopularRecommendations(6);
        assertEquals(1, ranked.size());
        assertEquals(11, ranked.get(0).starCount());
        assertEquals("stored-cover-file-id", ranked.get(0).customCoverImg());
    }

    @Test
    void currentWeekOnlyBecomesPastRecommendationAfterPeriodRollover() {
        book("book-a");
        var posts = context.getBean(PostService.class);
        long postId = posts.addPost("Recommendation", "Content", "Curator",
                Post.PostType.G_RECOMMENDATION, new Post.Attribution("book-a"));
        context.getBean(AdminSettingService.class).replaceRecommendations(new RecommendationSettingsDto(
                List.of(new RecommendationSettingsDto.Selection("high", "book-a", postId)), "high"));
        vote("book-a", voters(11));
        assertTrue(stars.getPopularRecommendations(6).isEmpty());
        clock.setDate("2026-10-15");
        assertEquals("book-a", stars.getPopularRecommendations(6).get(0).isbn());
    }

    @Test
    void deletingBookOrUserRemovesAssociatedStars() {
        book("book-a");
        book("book-b");
        List<User> voters = voters(11);
        archive("book-a", 1);
        archive("book-b", 2);
        vote("book-a", voters);
        vote("book-b", voters);
        context.getBean(BookService.class).deleteBook("book-a");
        assertEquals(List.of("book-b"), stars.getPopularRecommendations(6).stream().map(b -> b.isbn()).toList());
        context.getBean(UserService.class).deleteUser(voters.get(0).getId());
        assertEquals(10, stars.getStatus("book-b", null).starCount());
        assertTrue(stars.getPopularRecommendations(6).isEmpty());
    }

    @Test
    void repeatedConcurrentRegistrationStillCountsOneStar() throws Exception {
        book("book-a");
        User user = user(0);
        var executor = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            var first = executor.submit(() -> { start.await(); return stars.addStar("book-a", user); });
            var second = executor.submit(() -> { start.await(); return stars.addStar("book-a", user); });
            start.countDown();
            assertTrue(first.get(10, TimeUnit.SECONDS).starred());
            assertTrue(second.get(10, TimeUnit.SECONDS).starred());
            assertEquals(1, stars.getStatus("book-a", user).starCount());
        } finally { executor.shutdownNow(); }
    }

    @Test
    void popularListRejectsInvalidLimits() {
        assertThrows(ResponseStatusException.class, () -> stars.getPopularRecommendations(0));
        assertThrows(ResponseStatusException.class, () -> stars.getPopularRecommendations(51));
    }

    @Test
    void favoritesRequireLoginAndIncludeOnlyThatUsersBooksWithoutPopularityOrHistoryLimits() {
        book("shared"); book("only-first"); book("only-second");
        User first = user(0), second = user(1);
        stars.addStar("shared", first);
        stars.addStar("shared", second);
        stars.addStar("only-first", first);
        stars.addStar("only-second", second);
        archive("shared", 101);
        archive("shared", 102);

        assertEquals(401, assertThrows(ResponseStatusException.class,
                () -> stars.getStarredBooks(null)).getStatusCode().value());
        var firstList = stars.getStarredBooks(first);
        assertEquals(List.of("only-first", "shared"), firstList.stream().map(item -> item.book().isbn()).toList());
        assertEquals(List.of(1L, 2L), firstList.stream().map(item -> item.starCount()).toList());
        assertEquals(List.of("only-second", "shared"), stars.getStarredBooks(second).stream().map(item -> item.book().isbn()).toList());
        assertTrue(stars.getStarredBooks(user(2)).isEmpty());
    }

    @Test
    void favoritesTrackRemovalAndDeletionAndKeepCustomCovers() {
        var book = book("saved");
        book.setCustomCoverImg("saved-cover-file");
        books.save(book);
        User first = user(0), second = user(1);
        stars.addStar("saved", first);
        stars.addStar("saved", second);
        assertEquals("saved-cover-file", stars.getStarredBooks(first).get(0).book().customCoverImg());

        stars.removeStar("saved", first);
        assertTrue(stars.getStarredBooks(first).isEmpty());
        assertEquals(1, stars.getStarredBooks(second).get(0).starCount());
        // This repository fixture has no file storage; cover retrieval was checked above.
        book.setCustomCoverImg(null);
        books.save(book);
        context.getBean(BookService.class).deleteBook("saved");
        assertTrue(stars.getStarredBooks(second).isEmpty());
    }

    private Book book(String isbn) {
        return books.save(new Book(new BookDto.RegisterRequest(isbn, "Title " + isbn, "Subtitle", "Author", "Publisher",
                1767225600L, "https://example.test/cover.jpg", null, "Description", "상급", false)));
    }

    private User user(int number) {
        return users.save(new User("User " + number, "star" + number + "@example.test", null,
                null, User.UserType.GENERAL, AuthType.OAUTH_NAVER));
    }

    private List<User> voters(int count) {
        List<User> result = new ArrayList<>();
        for (int i = 0; i < count; i++) result.add(user(i));
        return result;
    }

    private void vote(String isbn, List<User> voters) { voters.forEach(user -> stars.addStar(isbn, user)); }
    private void archive(String isbn, long postId) { history.archive(2026, 9, 5, "상급", isbn, postId); }

    private static class MutableClock extends Clock {
        private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
        private Instant instant;
        void setDate(String date) { instant = LocalDate.parse(date).atStartOfDay(SEOUL).toInstant(); }
        @Override public ZoneId getZone() { return SEOUL; }
        @Override public Clock withZone(ZoneId zone) { return Clock.fixed(instant, zone); }
        @Override public Instant instant() { return instant; }
    }

    @Configuration
    static class StarConfiguration {
        @Bean BookStarService starService(BookRepository books, BookStarRepository stars, RecommendationExpirationService expiration) {
            return new BookStarService(books, stars, expiration);
        }
        @Bean BookService bookService(BookRepository books, BookStarRepository stars, AdminSettingService settings) {
            return new BookService(books, null, null, stars, settings);
        }
        @Bean DBFileService fileService(org.neatore.weeklycomma.repository.DBFileRepository files) {
            return new DBFileService(files, System.getProperty("java.io.tmpdir"));
        }
        @Bean UserService userService(UserRepository users, BookStarRepository stars, org.neatore.weeklycomma.repository.InquiryRepository inquiries, DBFileService files) {
            return new UserService(users, null, stars, inquiries, files);
        }
    }
}
