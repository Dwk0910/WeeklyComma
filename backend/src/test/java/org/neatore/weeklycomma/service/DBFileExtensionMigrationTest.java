package org.neatore.weeklycomma.service;

import com.zaxxer.hikari.HikariDataSource;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.*;

class DBFileExtensionMigrationTest {
    @TempDir Path directory;
    @Test void expandsLegacyConstraintWithoutLosingRowsColumnsOrIndexesAndIsIdempotent() throws Exception {
        try (var source = new HikariDataSource()) {
            source.setJdbcUrl("jdbc:sqlite:" + directory.resolve("old.db")); source.setMaximumPoolSize(1);
            try (var connection = source.getConnection(); var s = connection.createStatement()) {
                s.executeUpdate("CREATE TABLE dbfile (id blob primary key, extension varchar(255) check ((extension in ('JPEG','JPG','PNG','PDF'))), original_file_name varchar(255), is_secured boolean, owner_id blob)");
                s.executeUpdate("CREATE INDEX existing_file_name ON dbfile(original_file_name)");
                s.executeUpdate("INSERT INTO dbfile VALUES (X'01', 'PNG', '표지.PNG', 1, NULL)");
            }
            var migration = new DBFileExtensionMigration(source); migration.migrate(); migration.migrate();
            try (var connection = source.getConnection(); var s = connection.createStatement()) {
                try (var rows = s.executeQuery("SELECT * FROM dbfile WHERE id=X'01'")) {
                    assertTrue(rows.next()); assertEquals("표지.PNG", rows.getString("original_file_name")); assertTrue(rows.getBoolean("is_secured")); assertNull(rows.getBytes("owner_id"));
                }
                s.executeUpdate("INSERT INTO dbfile(id,extension) VALUES (X'02','WEBP'),(X'03','MP4'),(X'04','MKV')");
                assertThrows(java.sql.SQLException.class, () -> s.executeUpdate("INSERT INTO dbfile(id,extension) VALUES (X'05','EXE')"));
                try (var indexes = s.executeQuery("SELECT name FROM sqlite_master WHERE name='existing_file_name'")) { assertTrue(indexes.next()); }
            }
        }
    }
}
