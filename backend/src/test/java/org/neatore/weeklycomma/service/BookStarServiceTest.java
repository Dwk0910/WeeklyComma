package org.neatore.weeklycomma.service;

import com.zaxxer.hikari.HikariDataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.neatore.weeklycomma.domain.Book;
import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.dto.BookDto;
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
    void deletingBookOrUserRemovesAssociatedStars() {
        book("book-a");
        book("book-b");
        List<User> voters = voters(11);
        vote("book-a", voters);
        vote("book-b", voters);
        context.getBean(BookService.class).deleteBook("book-a");
        assertNull(books.getBookByIsbn("book-a"));
        assertEquals(11, context.getBean(BookStarRepository.class).count());
        assertEquals(11, stars.getStatus("book-b", null).starCount());
        context.getBean(UserService.class).deleteUser(voters.get(0).getId());
        assertEquals(10, stars.getStatus("book-b", null).starCount());
        assertEquals(10, context.getBean(BookStarRepository.class).count());
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
        @Bean BookStarService starService(BookRepository books, BookStarRepository stars) {
            return new BookStarService(books, stars);
        }
        @Bean BookService bookService(BookRepository books, BookStarRepository stars, AdminSettingService settings) {
            return new BookService(books, null, null, stars, settings);
        }
        @Bean UserService userService(UserRepository users, BookStarRepository stars) {
            return new UserService(users, null, stars);
        }
    }
}
