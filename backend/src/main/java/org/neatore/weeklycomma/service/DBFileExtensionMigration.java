package org.neatore.weeklycomma.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.neatore.weeklycomma.domain.DBFile;
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
public class DBFileExtensionMigration {
    private final DataSource dataSource;

    @PostConstruct public void migrate() {
        try (var connection = dataSource.getConnection(); var statement = connection.createStatement()) {
            String sql;
            try (var result = statement.executeQuery("SELECT sql FROM sqlite_master WHERE type='table' AND lower(name)='dbfile'")) {
                if (!result.next()) return;
                sql = result.getString(1);
            }
            var matcher = Pattern.compile("(?i)(extension\\s+in\\s*\\()[^)]*(\\))").matcher(sql);
            if (!matcher.find()) return;
            String constraint = matcher.group();
            if (Arrays.stream(DBFile.FileExtension.values()).allMatch(ext -> constraint.contains("'" + ext.name() + "'"))) return;
            String values = Arrays.stream(DBFile.FileExtension.values()).map(ext -> "'" + ext.name() + "'").collect(Collectors.joining(","));
            String updated = matcher.replaceFirst("$1" + values + "$2")
                    .replaceFirst("(?i)CREATE TABLE [\"`\\[]?dbfile[\"`\\]]?", "CREATE TABLE dbfile_updated");
            if (updated.equals(sql) || !updated.contains("CREATE TABLE dbfile_updated")) throw new IllegalStateException("Unexpected DBFile schema");
            var extras = new ArrayList<String>();
            try (var result = statement.executeQuery("SELECT sql FROM sqlite_master WHERE lower(tbl_name)='dbfile' AND type IN ('index','trigger') AND sql IS NOT NULL")) {
                while (result.next()) extras.add(result.getString(1));
            }
            connection.setAutoCommit(false);
            try {
                statement.executeUpdate(updated);
                statement.executeUpdate("INSERT INTO dbfile_updated SELECT * FROM dbfile");
                statement.executeUpdate("DROP TABLE dbfile");
                statement.executeUpdate("ALTER TABLE dbfile_updated RENAME TO dbfile");
                for (String extra : extras) statement.executeUpdate(extra);
                connection.commit();
            } catch (SQLException e) { connection.rollback(); throw e; }
        } catch (SQLException e) { throw new IllegalStateException("Failed to migrate file extensions", e); }
    }
}
