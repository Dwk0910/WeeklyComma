package org.neatore.weeklycomma.service;

import lombok.RequiredArgsConstructor;
import org.apache.commons.codec.digest.DigestUtils;
import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.dto.login.AuthType;
import org.neatore.weeklycomma.repository.UserRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class EmailSignupService {
    private final JdbcTemplate jdbc;
    private final Clock clock;
    private final SignupMailSender mail;
    private final UserRepository users;
    private final LoginPasswordService passwords;
    private static final SecureRandom random = new SecureRandom();
    public record Result(String status, String email, String loginMethod) {}

    // Identical response and mail path for both new and existing addresses.
    public void request(String rawEmail) {
        String email = LoginThrottleService.normalizeEmail(rawEmail);
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        String hash = hash(token);
        jdbc.update("INSERT INTO email_signup_link (token_hash,email,expires_at,consumed) VALUES (?,?,?,false)",
                hash, email, clock.millis() + 900_000);
        try { mail.sendLink(email, token); }
        catch (RuntimeException failure) {
            jdbc.update("DELETE FROM email_signup_link WHERE token_hash = ?", hash);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.");
        }
    }

    // Opening/scanning a link must never create an account or consume its registration permission.
    public Result inspect(String token) {
        var rows = jdbc.queryForList("SELECT email FROM email_signup_link WHERE token_hash = ? AND expires_at > ? AND consumed = false", hash(token), clock.millis());
        if (rows.size() != 1) throw invalid();
        return accountState(rows.get(0).get("email").toString());
    }

    @Transactional
    public Result complete(String token, String name, String password) {
        String hash = hash(token);
        // First write serializes completions in SQLite; rollback restores the link on invalid input.
        int changed = jdbc.update("UPDATE email_signup_link SET consumed = true WHERE token_hash = ? AND expires_at > ? AND consumed = false", hash, clock.millis());
        if (changed != 1) throw invalid();
        String email = jdbc.queryForObject("SELECT email FROM email_signup_link WHERE token_hash = ?", String.class, hash);
        Result state = accountState(email);
        if (state.status().equals("existing")) return state;
        String encoded = passwords.encode(password, name.trim(), email);
        users.saveAndFlush(new User(name.trim(), email, null, encoded, User.UserType.GENERAL, AuthType.LOCAL));
        jdbc.update("DELETE FROM email_signup_link WHERE email = ?", email);
        return new Result("created", email, "LOCAL");
    }
    private Result accountState(String email) {
        var existing = users.findAllByEmailIgnoreCase(email);
        return existing.isEmpty() ? new Result("new", email, null)
                : new Result("existing", email, existing.size() == 1 ? existing.get(0).getAuthType().name() : "UNKNOWN");
    }
    private static String hash(String token) {
        if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) throw invalid();
        return DigestUtils.sha256Hex(token);
    }
    private static ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "확인 링크가 만료되었거나 이미 사용되었습니다. 인증 메일을 다시 요청해 주세요.");
    }
    @Scheduled(fixedDelay = 600_000)
    public void cleanup() {
        jdbc.update("DELETE FROM email_signup_link WHERE expires_at <= ? OR consumed = true", clock.millis());
        // Remove obsolete code-based challenges left by the previous signup flow.
        jdbc.update("DELETE FROM email_signup_challenge WHERE expires_at <= ?", clock.millis());
    }
}
