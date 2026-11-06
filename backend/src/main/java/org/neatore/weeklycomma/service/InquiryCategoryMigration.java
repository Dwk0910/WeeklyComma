package org.neatore.weeklycomma.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.neatore.weeklycomma.domain.Inquiry;
import org.springframework.context.annotation.DependsOn;
import org.springframework.stereotype.Component;
import javax.sql.DataSource;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/** SQLite cannot update an existing enum CHECK constraint through Hibernate ddl-auto. */
@Component @DependsOn("entityManagerFactory") @RequiredArgsConstructor
public class InquiryCategoryMigration {
    private final DataSource dataSource;

    @PostConstruct public void migrate() {
        try (var connection = dataSource.getConnection(); var statement = connection.createStatement()) {
            String sql;
            try (var result = statement.executeQuery("SELECT sql FROM sqlite_master WHERE type='table' AND lower(name)='inquiry'")) {
                if (!result.next()) return;
                sql = result.getString(1);
            }
            var matcher = Pattern.compile("(?i)(category\\s+in\\s*\\()[^)]*(\\))").matcher(sql);
            if (!matcher.find()) return;
            String constraint = matcher.group();
            if (Arrays.stream(Inquiry.Category.values()).allMatch(category -> constraint.contains("'" + category.name() + "'"))) return;
            String values = Arrays.stream(Inquiry.Category.values()).map(category -> "'" + category.name() + "'").collect(Collectors.joining(","));
            String updated = matcher.replaceFirst("$1" + values + "$2")
                    .replaceFirst("(?i)CREATE TABLE [\"`\\[]?inquiry[\"`\\]]?", "CREATE TABLE inquiry_updated");
            if (updated.equals(sql) || !updated.contains("CREATE TABLE inquiry_updated")) throw new IllegalStateException("Unexpected Inquiry schema");
            var extras = new ArrayList<String>();
            try (var result = statement.executeQuery("SELECT sql FROM sqlite_master WHERE lower(tbl_name)='inquiry' AND type IN ('index','trigger') AND sql IS NOT NULL")) {
                while (result.next()) extras.add(result.getString(1));
            }
            connection.setAutoCommit(false);
            try {
                statement.executeUpdate(updated);
                statement.executeUpdate("INSERT INTO inquiry_updated SELECT * FROM inquiry");
                statement.executeUpdate("DROP TABLE inquiry");
                statement.executeUpdate("ALTER TABLE inquiry_updated RENAME TO inquiry");
                for (String extra : extras) statement.executeUpdate(extra);
                connection.commit();
            } catch (SQLException e) { connection.rollback(); throw e; }
        } catch (SQLException e) { throw new IllegalStateException("Failed to migrate inquiry categories", e); }
    }
}
