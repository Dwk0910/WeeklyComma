package org.neatore.weeklycomma.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.neatore.weeklycomma.domain.Post;
import org.neatore.weeklycomma.dto.PostDto;
import org.neatore.weeklycomma.exception.PostNotFoundException;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.sqlite.SQLiteDataSource;

import javax.sql.DataSource;
import java.nio.file.Path;
import java.time.Clock;

import static org.junit.jupiter.api.Assertions.*;

class PostServiceNoticeTest {
    @TempDir Path directory;
    private AnnotationConfigApplicationContext context;
    private PostService posts;
    private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        var dataSource = new SQLiteDataSource();
        dataSource.setUrl("jdbc:sqlite:" + directory.resolve("notices.db"));
        context = new AnnotationConfigApplicationContext();
        context.registerBean(DataSource.class, () -> dataSource);
        context.registerBean(Clock.class, Clock::systemUTC);
        context.register(RecommendationExpirationServiceTest.TestConfiguration.class);
        context.refresh();
        posts = context.getBean(PostService.class);
        jdbc = new JdbcTemplate(dataSource);
    }

    @AfterEach
    void tearDown() {
        if (context != null) context.close();
    }

    @Test
    void latestNoticeReturnsOnlyOneNoticeAndBreaksTimestampTiesByActualId() {
        long first = add("First notice", Post.PostType.NOTICE);
        long latest = add("Latest notice", Post.PostType.NOTICE);
        add("Later event", Post.PostType.EVENT);
        jdbc.update("UPDATE post SET created_at = ?", 1_700_000_000_000L);
        posts.pinPost(first, true);

        assertEquals(latest, posts.getLatestNotice().getId());
        var notices = posts.getAllPosts(Post.PostType.NOTICE, null);
        assertEquals(2, notices.size());
        assertTrue(notices.stream().anyMatch(post -> post.getId() == first && post.isPinned()));
    }

    @Test
    void latestNoticeUsesPublishDateRatherThanPinOrModificationDate() {
        long first = add("First notice", Post.PostType.NOTICE);
        long second = add("Second notice", Post.PostType.NOTICE);
        jdbc.update("UPDATE post SET created_at = ? WHERE id = ?", 1_700_000_000_000L, first);
        jdbc.update("UPDATE post SET created_at = ? WHERE id = ?", 1_710_000_000_000L, second);
        posts.pinPost(first, true);
        posts.editPost(first, new PostDto.PostRequest(Post.PostType.NOTICE, "Edited first notice", "Updated", null));
        assertEquals(second, posts.getLatestNotice().getId());

        // Publication order must also take precedence over the numeric ID.
        jdbc.update("UPDATE post SET created_at = ? WHERE id = ?", 1_720_000_000_000L, first);
        assertEquals(first, posts.getLatestNotice().getId());
    }

    @Test
    void missingNoticeIsStillReportedWhenOnlyOtherPostTypesExist() {
        add("Event", Post.PostType.EVENT);
        assertThrows(PostNotFoundException.class, posts::getLatestNotice);
        assertThrows(PostNotFoundException.class, () -> posts.getPost(99999));
    }

    private long add(String title, Post.PostType type) {
        return posts.addPost(title, "<p>Notice content</p>", "Curator", type, null);
    }
}
