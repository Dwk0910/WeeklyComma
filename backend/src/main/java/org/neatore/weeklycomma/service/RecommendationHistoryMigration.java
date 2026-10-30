package org.neatore.weeklycomma.service;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

/** Removes the old per-post uniqueness constraint without losing existing SQLite history. */
@Component
@RequiredArgsConstructor
public class RecommendationHistoryMigration {
    private final DataSource dataSource;

    @EventListener(ApplicationReadyEvent.class)
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public void migrate() {
        try (Connection connection = dataSource.getConnection()) {
            if (!needsMigration(connection)) return;

            connection.setAutoCommit(false);
            try (Statement statement = connection.createStatement()) {
                // SQLite cannot drop an inline UNIQUE or NOT NULL constraint in place.
                statement.executeUpdate("""
                        CREATE TABLE recommendation_history_updated (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            recommendation_year INTEGER NOT NULL,
                            recommendation_month INTEGER NOT NULL,
                            recommendation_week INTEGER NOT NULL,
                            difficulty VARCHAR(255),
                            isbn VARCHAR(255),
                            recommendation_post_id BIGINT
                        )
                        """);
                statement.executeUpdate("""
                        INSERT INTO recommendation_history_updated
                            (id, recommendation_year, recommendation_month, recommendation_week,
                             difficulty, isbn, recommendation_post_id)
                        SELECT id, recommendation_year, recommendation_month, recommendation_week,
                               difficulty, isbn, recommendation_post_id
                        FROM recommendation_history
                        """);
                statement.executeUpdate("DROP TABLE recommendation_history");
                statement.executeUpdate("ALTER TABLE recommendation_history_updated RENAME TO recommendation_history");
                connection.commit();
            } catch (SQLException e) {
                connection.rollback();
                throw e;
            }
        } catch (SQLException e) {
            throw new IllegalStateException("Failed to migrate recommendation history", e);
        }
    }

    private boolean needsMigration(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             var columns = statement.executeQuery("PRAGMA table_info('recommendation_history')")) {
            while (columns.next()) {
                if (columns.getString("name").equals("recommendation_post_id")
                        && columns.getInt("notnull") != 0) return true;
            }
        }

        try (Statement statement = connection.createStatement();
             var indexes = statement.executeQuery("PRAGMA index_list('recommendation_history')")) {
            while (indexes.next()) {
                if (indexes.getInt("unique") == 0) continue;
                String indexName = indexes.getString("name").replace("\"", "\"\"");
                try (Statement indexStatement = connection.createStatement();
                     var columns = indexStatement.executeQuery("PRAGMA index_info(\"" + indexName + "\")")) {
                    if (columns.next()
                            && "recommendation_post_id".equals(columns.getString("name"))
                            && !columns.next()) return true;
                }
            }
        }
        return false;
    }
}
