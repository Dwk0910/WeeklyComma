package org.neatore.weeklycomma.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.neatore.weeklycomma.domain.AdminSetting;
import org.neatore.weeklycomma.domain.Book;
import org.neatore.weeklycomma.dto.BookDto;
import org.neatore.weeklycomma.dto.RecommendationSettingsDto;
import org.neatore.weeklycomma.repository.BookRepository;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
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
    private BookRepository bookRepository;
    private RecommendationQueryService queries;

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
        bookRepository = context.getBean(BookRepository.class);
        queries = context.getBean(RecommendationQueryService.class);
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
        settingRepository.save(new AdminSetting("mainPick", "mid"));
        settings.updateAdminSetting("leftBanner", "banner-id");
        settingRepository.save(new AdminSetting("recommend_post_unused", "999"));
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

    @Test
    void pairSelectionRequiresARecommendationPostAndCannotBeBypassedWithIndividualKeys() {
        long postId = createBookAndPost("book-a", "상급");
        var missingPost = new RecommendationSettingsDto(List.of(
                new RecommendationSettingsDto.Selection("high", "book-a", null)), "high");
        assertThrows(ResponseStatusException.class, () -> settings.replaceRecommendations(missingPost));
        assertThrows(ResponseStatusException.class, () -> settings.updateAdminSetting("recommend_isbn_high", "book-a"));
        assertThrows(ResponseStatusException.class, () -> settings.updateAdminSetting("recommend_post_high", Long.toString(postId)));
        assertThrows(ResponseStatusException.class, () -> settings.deleteAdminSetting("recommend_post_high"));
        assertThrows(ResponseStatusException.class, () -> settings.updateAdminSetting("mainPick", "high"));
        assertThrows(ResponseStatusException.class, () -> settings.updateAdminSetting(RecommendationExpirationService.WEEK_START_KEY, "2000-01-01"));
        assertNull(value("recommend_isbn_high"));
    }

    @Test
    void pairSelectionRejectsMismatchedMissingAndNonRecommendationPosts() {
        long correctPost = createBookAndPost("book-a", "상급");
        long otherPost = createBookAndPost("book-b", "상급");
        long notice = posts.addPost("Notice", "Content", "Curator", Post.PostType.NOTICE, new Post.Attribution("book-a"));
        for (long invalidPost : List.of(otherPost, notice, 999999L)) {
            assertThrows(ResponseStatusException.class,
                    () -> settings.replaceRecommendations(selection("high", "book-a", invalidPost)));
        }
        assertThrows(ResponseStatusException.class,
                () -> settings.replaceRecommendations(selection("low", "book-a", correctPost)));
        assertThrows(ResponseStatusException.class,
                () -> settings.replaceRecommendations(selection("high", "missing-book", correctPost)));
        assertNull(value("recommend_isbn_high"));
    }

    @Test
    void validPairsAreSavedTogetherAndInvalidReplacementPreservesAllExistingSettings() {
        long postA = createBookAndPost("book-a", "상급");
        long postB = createBookAndPost("book-b", "초급");
        settings.replaceRecommendations(selection("high", "book-a", postA));
        var invalid = new RecommendationSettingsDto(List.of(
                new RecommendationSettingsDto.Selection("low", "book-b", postB),
                new RecommendationSettingsDto.Selection("high", "book-a", postB)), "low");
        assertThrows(ResponseStatusException.class, () -> settings.replaceRecommendations(invalid));
        assertEquals("book-a", value("recommend_isbn_high"));
        assertEquals(Long.toString(postA), value("recommend_post_high"));
        assertNull(value("recommend_isbn_low"));
        assertEquals("high", value("mainPick"));

        settings.replaceRecommendations(selection("low", "book-b", postB));
        assertNull(value("recommend_isbn_high"));
        assertNull(value("recommend_post_high"));
        assertEquals("book-b", value("recommend_isbn_low"));
        assertEquals(Long.toString(postB), value("recommend_post_low"));
    }

    @Test
    void selectionRejectsDuplicateCoursesAndInvalidMainPickAndSupportsClearingAll() {
        long postId = createBookAndPost("book-a", "상급");
        var pair = new RecommendationSettingsDto.Selection("high", "book-a", postId);
        assertThrows(ResponseStatusException.class,
                () -> settings.replaceRecommendations(new RecommendationSettingsDto(List.of(pair, pair), "high")));
        assertThrows(ResponseStatusException.class,
                () -> settings.replaceRecommendations(new RecommendationSettingsDto(List.of(pair), "low")));
        settings.replaceRecommendations(selection("high", "book-a", postId));
        settings.replaceRecommendations(new RecommendationSettingsDto(List.of(), null));
        assertNull(value("recommend_isbn_high"));
        assertNull(value("recommend_post_high"));
        assertNull(value("mainPick"));
    }

    @Test
    void atomicPairReplacementAfterBoundaryArchivesOldPairBeforeSavingNewPair() {
        long oldPost = createBookAndPost("book-a", "상급");
        long newPost = createBookAndPost("book-b", "상급");
        settings.replaceRecommendations(selection("high", "book-a", oldPost));
        clock.setDate("2026-10-15");
        settings.replaceRecommendations(selection("high", "book-b", newPost));
        assertEquals(1, histories.count());
        assertEquals("book-a", histories.findAll().get(0).getIsbn());
        assertEquals("book-b", value("recommend_isbn_high"));
        assertEquals(Long.toString(newPost), value("recommend_post_high"));
    }

    @Test
    void deletingASelectedPostClearsBothSelectionKeysAndMainPick() {
        long postId = createBookAndPost("book-a", "상급");
        settings.replaceRecommendations(selection("high", "book-a", postId));
        posts.deletePost(postId);
        assertNull(value("recommend_isbn_high"));
        assertNull(value("recommend_post_high"));
        assertNull(value("mainPick"));
    }

    @Test
    void deletingMainSelectionKeepsAnotherSelectedCourseAsMainPick() {
        long highPost = createBookAndPost("book-a", "상급");
        long lowPost = createBookAndPost("book-b", "초급");
        settings.replaceRecommendations(new RecommendationSettingsDto(List.of(
                new RecommendationSettingsDto.Selection("high", "book-a", highPost),
                new RecommendationSettingsDto.Selection("low", "book-b", lowPost)), "high"));
        posts.deletePost(highPost);
        assertEquals("low", value("mainPick"));
        assertEquals("book-b", value("recommend_isbn_low"));
        assertEquals(Long.toString(lowPost), value("recommend_post_low"));
    }

    @Test
    void recentRecommendationsIncludeCurrentAndArchivedSelectionsNewestFirstAndFilterByBookOrCourse() {
        long postA = createBookAndPost("book-a", "상급");
        long postB = createBookAndPost("book-b", "초급");
        settings.replaceRecommendations(selection("high", "book-a", postA));
        clock.setDate("2026-10-15");
        settings.replaceRecommendations(selection("low", "book-b", postB));
        var recent = queries.getRecent(null, null, 12);
        assertEquals(2, recent.size());
        assertTrue(recent.get(0).current());
        assertEquals("book-b", recent.get(0).book().isbn());
        assertEquals("Post book-b", recent.get(0).recommendationPostTitle());
        assertFalse(recent.get(1).current());
        assertEquals(2, recent.get(1).recommendationWeek());
        assertEquals("book-a", queries.getRecent(null, "high", 12).get(0).isbn());
        assertEquals(1, queries.getRecent("book-b", null, 12).size());
        assertEquals(1, queries.getRecent(null, null, 1).size());
        assertThrows(ResponseStatusException.class, () -> queries.getRecent(null, null, 0));
        assertThrows(ResponseStatusException.class, () -> queries.getRecent(null, "unknown", 12));
    }

    @Test
    void recentHistorySurvivesDeletedBooksAndPosts() {
        context.getBean(RecommendationHistoryService.class).archive(2026, 9, 5, "상급", "deleted-book", 999L);
        var recent = queries.getRecent("deleted-book", null, 12);
        assertEquals(1, recent.size());
        assertNull(recent.get(0).book());
        assertNull(recent.get(0).recommendationPostTitle());
        assertEquals("deleted-book", recent.get(0).isbn());
    }

    private long createBookAndPost(String isbn, String difficulty) {
        bookRepository.save(new Book(new BookDto.RegisterRequest(isbn, "Book " + isbn, "Subtitle", "Author", "Publisher",
                Instant.now().getEpochSecond(), "https://example.test/cover.jpg", null, "Description", difficulty, false)));
        return posts.addPost("Post " + isbn, "Content " + isbn, "Curator", Post.PostType.G_RECOMMENDATION,
                new Post.Attribution(isbn));
    }

    private RecommendationSettingsDto selection(String course, String isbn, long postId) {
        return new RecommendationSettingsDto(List.of(new RecommendationSettingsDto.Selection(course, isbn, postId)), course);
    }

    private void select(String course, String isbn, String postId) {
        // Raw fixtures also exercise compatibility with incomplete pre-validation selections.
        expiration.expireRecommendations();
        settingRepository.save(new AdminSetting("recommend_isbn_" + course, isbn));
        if (postId != null) settingRepository.save(new AdminSetting("recommend_post_" + course, postId));
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
                RecommendationExpirationService expirationService, BookRepository books, PostRepository posts) {
            return new AdminSettingService(repository, expirationService, books, posts);
        }

        @Bean
        PostService postService(PostRepository repository, AdminSettingService settings) {
            return new PostService(repository, settings);
        }

        @Bean
        RecommendationQueryService queryService(AdminSettingService settings,
                RecommendationHistoryRepository history, BookRepository books, PostRepository posts) {
            return new RecommendationQueryService(settings, history, books, posts);
        }
    }
}
