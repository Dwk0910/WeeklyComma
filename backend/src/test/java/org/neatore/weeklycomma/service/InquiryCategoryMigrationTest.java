package org.neatore.weeklycomma.service;

import com.zaxxer.hikari.HikariDataSource;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.*;

class InquiryCategoryMigrationTest {
    @TempDir Path directory;

    @Test void addsBookCategoryPreservingExistingInquiriesAndReferences() throws Exception {
        try (var source = new HikariDataSource()) {
            source.setJdbcUrl("jdbc:sqlite:" + directory.resolve("old.db"));
            source.setMaximumPoolSize(1);
            try (var connection = source.getConnection(); var s = connection.createStatement()) {
                s.executeUpdate("CREATE TABLE inquiry (id integer primary key, category varchar(255) not null check ((category in ('BUG','SUGGESTION','OTHER'))), owner_id blob not null, content clob, answer clob)");
                s.executeUpdate("CREATE INDEX inquiry_owner_index ON inquiry(owner_id)");
                s.executeUpdate("INSERT INTO inquiry VALUES (7, 'OTHER', X'01', '기존 문의', '기존 답변')");
                s.executeUpdate("CREATE TABLE dbfile (id integer primary key, inquiry_id bigint)");
                s.executeUpdate("INSERT INTO dbfile VALUES (1, 7)");
            }
            var migration = new InquiryCategoryMigration(source);
            migration.migrate();
            migration.migrate();
            try (var connection = source.getConnection(); var s = connection.createStatement()) {
                try (var rows = s.executeQuery("SELECT inquiry.* FROM inquiry JOIN dbfile ON inquiry.id=dbfile.inquiry_id")) {
                    assertTrue(rows.next());
                    assertEquals(7, rows.getLong("id"));
                    assertEquals("OTHER", rows.getString("category"));
                    assertArrayEquals(new byte[]{1}, rows.getBytes("owner_id"));
                    assertEquals("기존 문의", rows.getString("content"));
                    assertEquals("기존 답변", rows.getString("answer"));
                    assertFalse(rows.next());
                }
                s.executeUpdate("INSERT INTO inquiry(category,owner_id) VALUES ('BOOK',X'01'),('BUG',X'01'),('SUGGESTION',X'01'),('OTHER',X'01')");
                assertThrows(java.sql.SQLException.class, () -> s.executeUpdate("INSERT INTO inquiry(category,owner_id) VALUES ('INVALID',X'01')"));
                try (var indexes = s.executeQuery("SELECT name FROM sqlite_master WHERE name='inquiry_owner_index'")) { assertTrue(indexes.next()); }
                try (var result = s.executeQuery("PRAGMA integrity_check")) { assertTrue(result.next()); assertEquals("ok", result.getString(1)); }
            }
        }
    }
}
