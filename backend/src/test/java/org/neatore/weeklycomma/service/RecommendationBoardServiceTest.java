package org.neatore.weeklycomma.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.neatore.weeklycomma.domain.Book;
import org.neatore.weeklycomma.domain.Post;
import org.neatore.weeklycomma.domain.RecommendationHistory;
import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.dto.BookDto;
import org.neatore.weeklycomma.dto.RecommendationSettingsDto;
import org.neatore.weeklycomma.dto.login.AuthType;
import org.neatore.weeklycomma.repository.BookRepository;
import org.neatore.weeklycomma.repository.RecommendationHistoryRepository;
import org.neatore.weeklycomma.repository.UserRepository;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.sqlite.SQLiteDataSource;

import javax.sql.DataSource;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class RecommendationBoardServiceTest {
    @TempDir Path directory;
    private AnnotationConfigApplicationContext context;
    private RecommendationBoardService board;
    private PostService posts;
    private BookRepository books;
    private RecommendationHistoryRepository history;
    private AdminSettingService settings;
    private JdbcTemplate jdbc;
    private final TestClock clock = new TestClock();

    @BeforeEach
    void setUp() {
        var source = new SQLiteDataSource();
        source.setUrl("jdbc:sqlite:" + directory.resolve("board.db"));
        context = new AnnotationConfigApplicationContext();
        context.registerBean(DataSource.class, () -> source);
        context.registerBean(Clock.class, () -> clock);
        context.register(RecommendationExpirationServiceTest.TestConfiguration.class,
                BookStarServiceTest.StarConfiguration.class, RecommendationBoardService.class);
        context.refresh();
        board = context.getBean(RecommendationBoardService.class);
        posts = context.getBean(PostService.class);
        books = context.getBean(BookRepository.class);
        history = context.getBean(RecommendationHistoryRepository.class);
        settings = context.getBean(AdminSettingService.class);
        jdbc = new JdbcTemplate(source);
    }

    @AfterEach
    void close() { if (context != null) context.close(); }

    @Test
    void generalListIncludesCurrentPastAndNeverSelectedBooksAndBothRecommendationTypes() {
        book("current"); book("past"); book("ordinary"); book("legacy");
        long current = post("current", Post.PostType.G_RECOMMENDATION);
        long past = post("past", Post.PostType.G_RECOMMENDATION);
        long ordinary = post("ordinary", Post.PostType.G_RECOMMENDATION);
        long legacy = post("legacy", Post.PostType.W_RECOMMENDATION);
        post("current", Post.PostType.NOTICE);
        post("ordinary", Post.PostType.EVENT);
        select("current", current);
        history.save(new RecommendationHistory(2026, 9, 3, "상급", "past", past));
        jdbc.update("UPDATE post SET created_at = ?", 1700000000000L);
        posts.pinPost(past, true);

        var items = board.getAll();
        assertEquals(List.of(legacy, ordinary, past, current), items.stream().map(item -> item.post().id()).toList());
        assertTrue(board.get(past).post().isPinned());
        assertTrue(board.get(current).recommendations().get(0).current());
        assertEquals(5, board.get(current).recommendations().get(0).week());
        assertTrue(board.get(ordinary).recommendations().isEmpty());
        assertEquals(0, board.get(ordinary).starCount());
        posts.pinPost(past, false);
        assertFalse(board.get(past).post().isPinned());
        assertEquals(4, board.getAll().size());
    }

    @Test
    void bookHistoryIsSharedAcrossItsPostsAndDoesNotMultiplyStarsOrDuplicateGeneralRows() {
        book("repeat");
        long first = post("repeat", Post.PostType.G_RECOMMENDATION);
        long second = post("repeat", Post.PostType.G_RECOMMENDATION);
        history.save(new RecommendationHistory(2026, 9, 1, "상급", "repeat", first));
        history.save(new RecommendationHistory(2026, 10, 2, "상급", "repeat", first));
        select("repeat", second);
        var users = context.getBean(UserRepository.class);
        var user = users.save(new User("Reader", "reader@example.test", null, null, User.UserType.GENERAL, AuthType.OAUTH_NAVER));
        context.getBean(BookStarService.class).addStar("repeat", user);

        assertEquals(2, board.getAll().size());
        for (var item : board.getAll()) {
            assertEquals(1, item.starCount());
            assertEquals(3, item.recommendations().size());
            assertEquals(List.of(5, 2, 1), item.recommendations().stream().map(issue -> issue.week()).toList());
            assertEquals(second, item.recommendations().get(0).postId());
        }
    }

    @Test
    void rolloverArchivesBeforeReadingAndKeepsTheTagAndSelectedPostLink() {
        book("rolling");
        long id = post("rolling", Post.PostType.G_RECOMMENDATION);
        select("rolling", id);
        clock.instant = Instant.parse("2026-11-05T03:00:00Z");
        var item = board.get(id);
        assertEquals(1, item.recommendations().size());
        var issue = item.recommendations().get(0);
        assertEquals(10, issue.month());
        assertEquals(5, issue.week());
        assertFalse(issue.current());
        assertEquals(id, issue.postId());
    }

    @Test
    void deletedBooksMissingPostsAndOtherBoardsCannotBeOpenedAsRecommendations() {
        book("exists");
        long notice = post("exists", Post.PostType.NOTICE);
        long broken = post("deleted", Post.PostType.G_RECOMMENDATION);
        posts.addPost("No book", "Text", "Curator", Post.PostType.G_RECOMMENDATION, null);
        assertTrue(board.getAll().isEmpty());
        for (long id : List.of(notice, broken, 99999L)) {
            assertEquals(404, assertThrows(ResponseStatusException.class, () -> board.get(id)).getStatusCode().value());
        }
    }

    private void book(String isbn) {
        books.save(new Book(new BookDto.RegisterRequest(isbn, "Book " + isbn, "Subtitle", "Author", "Publisher",
                1767225600L, "https://example.test/cover.jpg", null, "Description", "상급", false)));
    }
    private long post(String isbn, Post.PostType type) {
        return posts.addPost("Post " + isbn, "<p>Subtitle</p><p>Content</p>", "Curator", type, new Post.Attribution(isbn));
    }
    private void select(String isbn, long id) {
        settings.replaceRecommendations(new RecommendationSettingsDto(List.of(new RecommendationSettingsDto.Selection("high", isbn, id)), "high"));
    }
    private static class TestClock extends Clock {
        Instant instant = Instant.parse("2026-10-30T03:00:00Z");
        @Override public ZoneId getZone() { return ZoneId.of("Asia/Seoul"); }
        @Override public Clock withZone(ZoneId zone) { return Clock.fixed(instant, zone); }
        @Override public Instant instant() { return instant; }
    }
}
