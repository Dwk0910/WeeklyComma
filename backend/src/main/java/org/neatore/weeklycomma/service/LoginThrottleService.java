package org.neatore.weeklycomma.service;

import lombok.RequiredArgsConstructor;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.time.Duration;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class LoginThrottleService {
    public static final int ACCOUNT_LIMIT = 5;
    public static final int IP_LIMIT = 60;
    public static final long WINDOW_MILLIS = Duration.ofMinutes(15).toMillis();
    private final JdbcTemplate jdbc;
    private final Clock clock;

    public static String normalizeEmail(String email) { return email == null ? "" : email.trim().toLowerCase(Locale.ROOT); }
    private String key(String scope, String value) { return DigestUtils.sha256Hex(scope + ":" + value); }

    // Count reservations before expensive hashing, including concurrent attempts. SQLite persists the counters across restarts.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public long reserveLogin(String email, String ip) {
        long retry = reserve(key("login-ip", ip), IP_LIMIT);
        return retry > 0 ? retry : reserve(key("login-account", normalizeEmail(email)), ACCOUNT_LIMIT);
    }
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public long reserveOAuth(String ip) { return reserve(key("login-ip", ip), IP_LIMIT); }
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public long reserveSignup(String ip) { return reserve(key("signup-ip", ip), 10); }
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public long reserveSignupEmail(String email) { return reserve(key("signup-email", normalizeEmail(email)), 3); }
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public long reserveVerification(String ip) { return reserve(key("signup-verify", ip), 30); }
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void succeeded(String email) { jdbc.update("DELETE FROM login_throttle WHERE bucket_key = ?", key("login-account", normalizeEmail(email))); }

    private long reserve(String key, int limit) {
        long now = clock.millis();
        int changed = jdbc.update("""
            INSERT INTO login_throttle (bucket_key, attempts, resets_at) VALUES (?, 1, ?)
            ON CONFLICT(bucket_key) DO UPDATE SET
                attempts = CASE WHEN resets_at <= ? THEN 1 ELSE attempts + 1 END,
                resets_at = CASE WHEN resets_at <= ? THEN ? ELSE resets_at END
            WHERE attempts < ? OR resets_at <= ?
            """, key, now + WINDOW_MILLIS, now, now, now + WINDOW_MILLIS, limit, now);
        if (changed == 1) return 0;
        Long reset = jdbc.queryForObject("SELECT resets_at FROM login_throttle WHERE bucket_key = ?", Long.class, key);
        return Math.max(1, ((reset == null ? now + WINDOW_MILLIS : reset) - now + 999) / 1000);
    }
    @Scheduled(fixedDelay = 600_000)
    @Transactional
    public void cleanup() { jdbc.update("DELETE FROM login_throttle WHERE resets_at <= ?", clock.millis()); }
}
