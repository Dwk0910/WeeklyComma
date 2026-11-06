package org.neatore.weeklycomma.service;

import com.zaxxer.hikari.HikariDataSource;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.*;

class OAuthProviderMigrationTest {
    @TempDir Path directory;
    @Test void preservesAccountsReferencesIndexesAndTriggersWithForeignKeysEnabled() throws Exception {
        try (var source = new HikariDataSource()) {
            source.setJdbcUrl("jdbc:sqlite:" + directory.resolve("old.db")); source.setMaximumPoolSize(1);
            try (var connection = source.getConnection(); var s = connection.createStatement()) {
                s.execute("PRAGMA foreign_keys=ON");
                s.executeUpdate("CREATE TABLE user (id blob primary key, auth_type varchar(255) check ((auth_type in ('LOCAL','OAUTH_NAVER'))), email text not null unique, oauth_id text unique, password text, auth_version text)");
                s.executeUpdate("INSERT INTO user VALUES (X'01','OAUTH_NAVER','reader@example.test','existing',NULL,'existing-version')");
                s.executeUpdate("CREATE INDEX user_email_index ON user(email)");
                s.executeUpdate("CREATE TABLE child (id integer primary key, owner_id blob REFERENCES user(id) ON DELETE CASCADE)");
                s.executeUpdate("INSERT INTO child VALUES (1,X'01')");
                s.executeUpdate("CREATE TABLE audit (email text)");
                s.executeUpdate("CREATE TRIGGER user_audit AFTER INSERT ON user BEGIN INSERT INTO audit VALUES (NEW.email); END");
            }
            var migration = new OAuthProviderMigration(source); migration.migrate(); migration.migrate();
            try (var connection = source.getConnection(); var s = connection.createStatement()) {
                try (var rows = s.executeQuery("SELECT user.* FROM user JOIN child ON user.id=child.owner_id")) {
                    assertTrue(rows.next()); assertArrayEquals(new byte[]{1},rows.getBytes("id"));
                    assertEquals("OAUTH_NAVER",rows.getString("auth_type")); assertEquals("existing",rows.getString("oauth_id"));
                    assertEquals("existing-version",rows.getString("auth_version")); assertFalse(rows.next());
                }
                s.executeUpdate("INSERT INTO user VALUES (X'02','OAUTH_GOOGLE','google@example.test','OAUTH_GOOGLE:subject',NULL,'google-version')");
                try (var rows = s.executeQuery("SELECT email FROM audit")) { assertTrue(rows.next()); assertEquals("google@example.test",rows.getString(1)); }
                assertThrows(java.sql.SQLException.class, () -> s.executeUpdate("INSERT INTO user(id,auth_type,email) VALUES (X'03','INVALID','invalid@example.test')"));
                try (var rows = s.executeQuery("SELECT name FROM sqlite_master WHERE name='user_email_index'")) { assertTrue(rows.next()); }
                try (var rows = s.executeQuery("PRAGMA foreign_keys")) { rows.next(); assertEquals(1,rows.getInt(1)); }
                try (var rows = s.executeQuery("PRAGMA foreign_key_check")) { assertFalse(rows.next()); }
                try (var rows = s.executeQuery("PRAGMA integrity_check")) { rows.next(); assertEquals("ok",rows.getString(1)); }
            }
        }
    }
    @Test void failedCopyRollsBackWithoutLosingOriginalAccounts() throws Exception {
        try (var source = new HikariDataSource()) {
            source.setJdbcUrl("jdbc:sqlite:" + directory.resolve("unexpected.db")); source.setMaximumPoolSize(1);
            try (var connection = source.getConnection(); var s = connection.createStatement()) {
                s.execute("PRAGMA foreign_keys=ON");
                s.executeUpdate("CREATE TABLE user (id integer primary key, auth_type text check (auth_type in ('LOCAL','OAUTH_NAVER','LEGACY')))");
                s.executeUpdate("INSERT INTO user VALUES (1,'LEGACY')");
            }
            assertThrows(IllegalStateException.class, () -> new OAuthProviderMigration(source).migrate());
            try (var connection = source.getConnection(); var s = connection.createStatement()) {
                try (var rows = s.executeQuery("SELECT auth_type FROM user WHERE id=1")) { assertTrue(rows.next()); assertEquals("LEGACY",rows.getString(1)); }
                try (var rows = s.executeQuery("PRAGMA foreign_keys")) { rows.next(); assertEquals(1,rows.getInt(1)); }
                try (var rows = s.executeQuery("SELECT name FROM sqlite_master WHERE name='user_updated'")) { assertFalse(rows.next()); }
            }
        }
    }
}
