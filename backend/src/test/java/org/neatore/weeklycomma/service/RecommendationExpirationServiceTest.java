package org.neatore.weeklycomma.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.neatore.weeklycomma.domain.AdminSetting;
import org.neatore.weeklycomma.domain.Post;
import org.neatore.weeklycomma.domain.RecommendationHistory;
import org.neatore.weeklycomma.dto.PostDto;
import org.neatore.weeklycomma.repository.AdminSettingRepository;
import org.neatore.weeklycomma.repository.PostRepository;
import org.neatore.weeklycomma.repository.RecommendationHistoryRepository;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.sqlite.SQLiteDataSource;

import javax.sql.DataSource;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class RecommendationExpirationServiceTest {
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    @TempDir
    Path directory;
    private AnnotationConfigApplicationContext context;
    private MutableClock clock;
    private RecommendationExpirationService expiration;
    private AdminSettingService settings;
    private AdminSettingRepository settingRepository;
    private RecommendationHistoryRepository histories;
    private PostService posts;
    private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        clock = new MutableClock();
        clock.setDate("2026-10-14");
        SQLiteDataSource dataSource = new SQLiteDataSource();
        dataSource.setUrl("jdbc:sqlite:" + directory.resolve("test.db"));
        context = new AnnotationConfigApplicationContext();
        context.registerBean(DataSource.class, () -> dataSource);
        context.registerBean(Clock.class, () -> clock);
        context.register(TestConfiguration.class);
        context.refresh();
        expiration = context.getBean(RecommendationExpirationService.class);
        settings = context.getBean(AdminSettingService.class);
        settingRepository = context.getBean(AdminSettingRepository.class);
        histories = context.getBean(RecommendationHistoryRepository.class);
        posts = context.getBean(PostService.class);
        jdbc = new JdbcTemplate(dataSource);
    }

    @AfterEach
    void tearDown() {
        if (context != null) context.close();
    }

    @Test
    void firstStartupInitializesPeriodAndPreservesExistingSelections() {
        settingRepository.save(new AdminSetting("recommend_isbn_high", "book-a"));
        settingRepository.save(new AdminSetting("recommend_post_high", "101"));
        expiration.expireRecommendationsOnStartup();

        assertEquals("2026-10-08", value(RecommendationExpirationService.WEEK_START_KEY));
        assertEquals("book-a", value("recommend_isbn_high"));
        assertEquals(0, histories.count());
    }

    @Test
    void sameWeekKeepsSelectionsAndDoesNotArchiveUnselectedPosts() {
        select("high", "book-a", "101");
        posts.addPost("Unselected", "Content", "Curator", Post.PostType.G_RECOMMENDATION,
                new Post.Attribution("book-b"));
        clock.setDate("2026-10-14");
        expiration.expireRecommendations();

        assertEquals("book-a", settings.getAdminSetting("recommend_isbn_high").getValue());
        assertEquals(0, histories.count());
    }

    @Test
    void rolloverArchivesOnlySelectedBooksWithTheirCoursesAndClearsRecommendationSettings() {
        select("high", "book-a", "101");
        select("mid", "book-b", "205");
        select("low", "book-c", null);
        settings.updateAdminSetting("mainPick", "mid");
        settings.updateAdminSetting("leftBanner", "banner-id");
        settings.updateAdminSetting("recommend_post_unused", "999");
        posts.addPost("Unselected", "Content", "Curator", Post.PostType.G_RECOMMENDATION,
                new Post.Attribution("book-d"));
        clock.setDate("2026-10-15");
        expiration.expireRecommendations();

        assertEquals(3, histories.count());
        RecommendationHistory high = historyFor("book-a");
        assertPeriod(high, 2026, 10, 2);
        assertEquals("상급", high.getDifficulty());
        assertEquals(101L, high.getRecommendationPostId());
        assertEquals("중급", historyFor("book-b").getDifficulty());
        assertEquals("초급", historyFor("book-c").getDifficulty());
        assertNull(historyFor("book-c").getRecommendationPostId());
        assertEquals(0, settingRepository.findAll().stream()
                .filter(s -> s.getKey().startsWith("recommend_") || s.getKey().equals("mainPick"))
                .count());
        assertEquals("banner-id", value("leftBanner"));
        assertEquals("2026-10-15", value(RecommendationExpirationService.WEEK_START_KEY));

        expiration.expireRecommendations();
        expiration.expireRecommendationsOnStartup();
        assertEquals(3, histories.count());
    }

    @Test
    void sameBookAndPostCanBeSelectedAgainInAnotherWeek() {
        select("high", "book-a", "101");
        clock.setDate("2026-10-15");
        expiration.expireRecommendations();
        select("high", "book-a", "101");
        clock.setDate("2026-10-22");
        expiration.expireRecommendations();

        var records = histories.findAll();
        assertEquals(2, records.size());
        assertTrue(records.stream().anyMatch(h -> h.getRecommendationWeek() == 2));
        assertTrue(records.stream().anyMatch(h -> h.getRecommendationWeek() == 3));
        assertTrue(records.stream().allMatch(h -> h.getRecommendationPostId() == 101L));
    }

    @ParameterizedTest
    @CsvSource({
            "2026-10-07, 2026-10-08, 2026, 10, 1",
            "2026-10-31, 2026-11-01, 2026, 10, 5",
            "2026-12-31, 2027-01-01, 2026, 12, 5",
            "2028-02-29, 2028-03-01, 2028, 2, 5"
    })
    void rolloverHandlesWeekMonthYearAndLeapYearBoundaries(
            String selectedOn, String nextPeriod, int year, int month, int week) {
        clock.setDate(selectedOn);
        select("high", "book-a", "101");
        clock.setDate(nextPeriod);
        expiration.expireRecommendations();

        assertPeriod(historyFor("book-a"), year, month, week);
        assertNull(value("recommend_isbn_high"));
    }

    @Test
    void restartAfterDowntimeArchivesTheOriginalPeriodOnlyOnce() {
        select("high", "book-a", "101");
        clock.setDate("2026-11-05");
        expiration.expireRecommendationsOnStartup();
        expiration.expireRecommendationsOnStartup();

        assertEquals(1, histories.count());
        assertPeriod(historyFor("book-a"), 2026, 10, 2);
        assertEquals("2026-11-01", value(RecommendationExpirationService.WEEK_START_KEY));
    }

    @Test
    void settingsReadExpiresStaleSelectionsEvenBeforeScheduledJobRuns() {
        select("high", "book-a", "101");
        clock.setDate("2026-10-15");

        assertNull(settings.getAdminSetting("recommend_isbn_high"));
        assertEquals(1, histories.count());
    }

    @Test
    void newSelectionAfterBoundaryIsSavedAfterArchivingPreviousPeriod() {
        select("high", "book-a", "101");
        clock.setDate("2026-10-15");
        select("high", "book-b", "205");
        expiration.expireRecommendations();

        assertEquals("book-b", value("recommend_isbn_high"));
        assertEquals("205", value("recommend_post_high"));
        assertEquals(1, histories.count());
        assertEquals("book-a", histories.findAll().get(0).getIsbn());
    }

    @Test
    void archiveFailureRollsBackCleanupAndPeriodAdvanceSoRetryCanSucceed() {
        select("high", "book-a", "101");
        clock.setDate("2026-10-15");
        jdbc.execute("""
                CREATE TRIGGER reject_history BEFORE INSERT ON recommendation_history
                BEGIN SELECT RAISE(ABORT, 'simulate archive failure'); END
                """);

        assertThrows(RuntimeException.class, expiration::expireRecommendations);
        assertEquals(0, histories.count());
        assertEquals("book-a", value("recommend_isbn_high"));
        assertEquals("101", value("recommend_post_high"));
        assertEquals("2026-10-08", value(RecommendationExpirationService.WEEK_START_KEY));

        jdbc.execute("DROP TRIGGER reject_history");
        expiration.expireRecommendations();
        assertEquals(1, histories.count());
        assertNull(value("recommend_isbn_high"));
    }

    @Test
    void existingRecommendationPostRemainsEditableAndSearchableAfterRollover() {
        long id = posts.addPost("Old title", "Old content", "Curator",
                Post.PostType.G_RECOMMENDATION, new Post.Attribution("book-a"));
        select("high", "book-a", Long.toString(id));
        clock.setDate("2026-10-15");
        expiration.expireRecommendations();
        posts.editPost(id, new PostDto.PostRequest(
                Post.PostType.G_RECOMMENDATION, "New title", "New content", new Post.Attribution("book-a")));

        assertEquals("New content", posts.getPost(id).getContent());
        assertEquals(1, posts.getAllPosts(Post.PostType.G_RECOMMENDATION,
                new Post.Attribution("book-a")).size());
        assertEquals(0, posts.getAllPosts(Post.PostType.G_RECOMMENDATION,
                new Post.Attribution("book-b")).size());
    }

    private void select(String course, String isbn, String postId) {
        settings.updateAdminSetting("recommend_isbn_" + course, isbn);
        if (postId != null) settings.updateAdminSetting("recommend_post_" + course, postId);
    }

    private String value(String key) {
        AdminSetting setting = settingRepository.getAdminSettingByKey(key);
        return setting == null ? null : setting.getValue();
    }

    private RecommendationHistory historyFor(String isbn) {
        return histories.findAll().stream().filter(h -> h.getIsbn().equals(isbn)).findFirst().orElseThrow();
    }

    private void assertPeriod(RecommendationHistory history, int year, int month, int week) {
        assertEquals(year, history.getRecommendationYear());
        assertEquals(month, history.getRecommendationMonth());
        assertEquals(week, history.getRecommendationWeek());
    }

    private static class MutableClock extends Clock {
        private Instant instant;

        void setDate(String date) {
            instant = LocalDate.parse(date).atStartOfDay(SEOUL).toInstant();
        }

        @Override public ZoneId getZone() { return SEOUL; }
        @Override public Clock withZone(ZoneId zone) { return Clock.fixed(instant, zone); }
        @Override public Instant instant() { return instant; }
    }

    @Configuration
    @EnableTransactionManagement
    @EnableJpaAuditing
    @EnableJpaRepositories(basePackageClasses = AdminSettingRepository.class)
    static class TestConfiguration {
        @Bean
        LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
            var factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(dataSource);
            factory.setPackagesToScan("org.neatore.weeklycomma.domain");
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(Map.of(
                    "hibernate.dialect", "org.hibernate.community.dialect.SQLiteDialect",
                    "hibernate.physical_naming_strategy", "org.hibernate.boot.model.naming.PhysicalNamingStrategySnakeCaseImpl",
                    "hibernate.hbm2ddl.auto", "update"
            ));
            return factory;
        }

        @Bean
        JpaTransactionManager transactionManager(jakarta.persistence.EntityManagerFactory factory) {
            return new JpaTransactionManager(factory);
        }

        @Bean
        RecommendationHistoryService historyService(RecommendationHistoryRepository repository) {
            return new RecommendationHistoryService(repository);
        }

        @Bean
        RecommendationExpirationService expirationService(AdminSettingRepository repository,
                RecommendationHistoryService historyService, Clock clock) {
            return new RecommendationExpirationService(repository, historyService, clock);
        }

        @Bean
        AdminSettingService settingService(AdminSettingRepository repository,
                RecommendationExpirationService expirationService) {
            return new AdminSettingService(repository, expirationService);
        }

        @Bean
        PostService postService(PostRepository repository) {
            return new PostService(repository);
        }
    }
}
