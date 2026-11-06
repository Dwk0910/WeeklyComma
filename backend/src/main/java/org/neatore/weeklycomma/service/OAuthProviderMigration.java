package org.neatore.weeklycomma.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.neatore.weeklycomma.dto.login.AuthType;
import org.springframework.context.annotation.DependsOn;
import org.springframework.stereotype.Component;
import javax.sql.DataSource;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/** SQLite needs a table rebuild to expand an existing enum CHECK constraint. */
@Component
@DependsOn("entityManagerFactory")
@RequiredArgsConstructor
public class OAuthProviderMigration {
    private final DataSource dataSource;

    @PostConstruct public void migrate() {
        try (var connection = dataSource.getConnection(); var statement = connection.createStatement()) {
            String sql;
            try (var rows = statement.executeQuery("SELECT sql FROM sqlite_master WHERE type='table' AND lower(name)='user'")) {
                if (!rows.next()) return;
                sql = rows.getString(1);
            }
            var matcher = Pattern.compile("(?i)(auth_type\\s+in\\s*\\()[^)]*(\\))").matcher(sql);
            if (!matcher.find()) return;
            String constraint = matcher.group();
            if (Arrays.stream(AuthType.values()).allMatch(type -> constraint.contains("'" + type.name() + "'"))) return;
            String values = Arrays.stream(AuthType.values()).map(type -> "'" + type.name() + "'").collect(Collectors.joining(","));
            String updated = matcher.replaceFirst("$1" + values + "$2")
                    .replaceFirst("(?i)CREATE TABLE [\"`\\[]?user[\"`\\]]?", "CREATE TABLE user_updated");
            if (updated.equals(sql) || !updated.contains("CREATE TABLE user_updated")) throw new IllegalStateException("Unexpected user schema");
            var extras = new ArrayList<String>();
            try (var rows = statement.executeQuery("SELECT sql FROM sqlite_master WHERE lower(tbl_name)='user' AND type IN ('index','trigger') AND sql IS NOT NULL")) {
                while (rows.next()) extras.add(rows.getString(1));
            }
            int foreignKeys;
            try (var rows = statement.executeQuery("PRAGMA foreign_keys")) { rows.next(); foreignKeys = rows.getInt(1); }
            // Disable before BEGIN: dropping the parent table must not cascade into books, inquiries or files.
            statement.execute("PRAGMA foreign_keys=OFF");
            connection.setAutoCommit(false);
            try {
                statement.executeUpdate(updated);
                statement.executeUpdate("INSERT INTO user_updated SELECT * FROM user");
                statement.executeUpdate("DROP TABLE user");
                statement.executeUpdate("ALTER TABLE user_updated RENAME TO user");
                for (String extra : extras) statement.executeUpdate(extra);
                try (var rows = statement.executeQuery("PRAGMA foreign_key_check")) {
                    if (rows.next()) throw new SQLException("Foreign key integrity check failed");
                }
                connection.commit();
            } catch (SQLException error) {
                connection.rollback();
                throw error;
            } finally {
                connection.setAutoCommit(true);
                statement.execute("PRAGMA foreign_keys=" + foreignKeys);
            }
        } catch (SQLException error) { throw new IllegalStateException("Failed to migrate OAuth providers", error); }
    }
}
