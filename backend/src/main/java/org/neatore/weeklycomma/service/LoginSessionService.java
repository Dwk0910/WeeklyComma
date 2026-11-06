package org.neatore.weeklycomma.service;

import lombok.RequiredArgsConstructor;
import org.apache.commons.codec.digest.DigestUtils;
import org.neatore.weeklycomma.domain.LoginSession;
import org.neatore.weeklycomma.repository.LoginSessionRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LoginSessionService {
    public static final Duration MAX_AGE = Duration.ofHours(12);
    public static final Duration IDLE_TIMEOUT = Duration.ofMinutes(30);
    private final LoginSessionRepository sessions;
    private final Clock clock;
    public long now() { return clock.millis(); }

    @Transactional
    public void register(String token, UUID userId, long expiresAt) {
        sessions.save(new LoginSession(DigestUtils.sha256Hex(token), userId, expiresAt, now()));
    }
    @Transactional
    public boolean isActive(String token, UUID userId) {
        long now = now();
        return sessions.touchActive(DigestUtils.sha256Hex(token), userId, now, now - IDLE_TIMEOUT.toMillis()) == 1;
    }
    @Transactional
    public void revoke(String token) {
        if (token != null && !token.isBlank()) sessions.deleteById(DigestUtils.sha256Hex(token));
    }
    @Transactional
    public void revokeForUser(UUID userId) { sessions.revokeForUser(userId); }
    @Scheduled(fixedDelay = 600_000)
    @Transactional
    public void cleanup() { sessions.deleteExpired(now(), now() - IDLE_TIMEOUT.toMillis()); }
}
