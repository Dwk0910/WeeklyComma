package org.neatore.weeklycomma.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.sqlite.SQLiteDataSource;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class RecommendationHistoryMigrationTest {
    @TempDir
    Path directory;

    @Test
    void legacyHistoryIsPreservedAndSamePostCanBeArchivedAgainOrOmitted() {
        SQLiteDataSource dataSource = new SQLiteDataSource();
        dataSource.setUrl("jdbc:sqlite:" + directory.resolve("legacy.db"));
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        jdbc.execute("""
                CREATE TABLE recommendation_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    recommendation_year INTEGER NOT NULL,
                    recommendation_month INTEGER NOT NULL,
                    recommendation_week INTEGER NOT NULL,
                    difficulty VARCHAR(255),
                    isbn VARCHAR(255),
                    recommendation_post_id BIGINT NOT NULL UNIQUE
                )
                """);
        jdbc.update("INSERT INTO recommendation_history VALUES (7, 2026, 10, 2, '상급', 'book-a', 101)");

        RecommendationHistoryMigration migration = new RecommendationHistoryMigration(dataSource);
        migration.migrate();
        migration.migrate();

        var old = jdbc.queryForMap("SELECT * FROM recommendation_history WHERE id = 7");
        assertEquals("book-a", old.get("isbn"));
        assertEquals("상급", old.get("difficulty"));
        assertEquals(2, ((Number) old.get("recommendation_week")).intValue());
        assertEquals(101, ((Number) old.get("recommendation_post_id")).intValue());
        jdbc.update("""
                INSERT INTO recommendation_history
                    (recommendation_year, recommendation_month, recommendation_week, difficulty, isbn, recommendation_post_id)
                VALUES (2026, 10, 3, '상급', 'book-a', 101), (2026, 10, 3, '초급', 'book-b', NULL)
                """);
        assertEquals(3, jdbc.queryForObject("SELECT COUNT(*) FROM recommendation_history", Integer.class));
        assertTrue(jdbc.queryForObject("SELECT MAX(id) FROM recommendation_history", Long.class) > 7);
    }

    @Test
    void nullableLegacyUniqueIndexIsAlsoRemoved() {
        SQLiteDataSource dataSource = new SQLiteDataSource();
        dataSource.setUrl("jdbc:sqlite:" + directory.resolve("nullable.db"));
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        jdbc.execute("""
                CREATE TABLE recommendation_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    recommendation_year INTEGER NOT NULL,
                    recommendation_month INTEGER NOT NULL,
                    recommendation_week INTEGER NOT NULL,
                    difficulty VARCHAR(255),
                    isbn VARCHAR(255),
                    recommendation_post_id BIGINT UNIQUE
                )
                """);
        new RecommendationHistoryMigration(dataSource).migrate();
        jdbc.update("INSERT INTO recommendation_history VALUES (1, 2026, 10, 2, '상급', 'book-a', 101)");
        jdbc.update("INSERT INTO recommendation_history VALUES (2, 2026, 10, 3, '상급', 'book-a', 101)");
        assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM recommendation_history", Integer.class));
    }

    @Test
    void absentHistoryTableIsLeftForHibernateToCreate() {
        SQLiteDataSource dataSource = new SQLiteDataSource();
        dataSource.setUrl("jdbc:sqlite:" + directory.resolve("empty.db"));
        assertDoesNotThrow(() -> new RecommendationHistoryMigration(dataSource).migrate());
    }
}
