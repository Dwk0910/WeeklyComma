package org.neatore.weeklycomma.service;

import org.neatore.weeklycomma.exception.AuthenticationThrottledException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.concurrent.Semaphore;
import java.util.function.Supplier;

@Service
public class LoginPasswordService {
    // OWASP Argon2id minimum: 19 MiB, two iterations, one lane. Salt is random per hash.
    private final Argon2PasswordEncoder encoder = new Argon2PasswordEncoder(16, 32, 1, 19456, 2);
    private final BCryptPasswordEncoder legacy = new BCryptPasswordEncoder();
    private final String dummyHash = encoder.encode("unused-account-timing-placeholder");
    private final Semaphore hashing = new Semaphore(4);
    private static final Set<String> EXTRA_COMMON = Set.of("passwordpassword", "passwordpassword123", "123456789012345", "1234567890123456", "qwertyuiopasdfgh", "qwertyuiopasdfghjkl", "iloveyouiloveyou", "weeklycommaweeklycomma");

    private static final Pattern LOWERCASE = Pattern.compile("[a-z]");
    private static final Pattern ADDITIONAL_CHARACTER = Pattern.compile("[A-Z0-9\\p{P}\\p{S}]");
    private static final Set<String> COMMON = loadCommon();
    private static Set<String> loadCommon() {
        var stream = LoginPasswordService.class.getResourceAsStream("/security/common-passwords.txt");
        if (stream == null) throw new IllegalStateException("Password blocklist is missing");
        try (var reader = new java.io.BufferedReader(new java.io.InputStreamReader(stream, StandardCharsets.UTF_8))) {
            var result = reader.lines().map(s -> s.toLowerCase(Locale.ROOT)).collect(java.util.stream.Collectors.toSet());
            result.addAll(EXTRA_COMMON);
            return Set.copyOf(result);
        } catch (java.io.IOException error) { throw new IllegalStateException("Cannot load password blocklist", error); }
    }

    public boolean valid(String password) {
        return password != null && !password.isBlank() && password.length() <= 256
                && password.codePointCount(0, password.length()) <= 128
                && password.codePoints().noneMatch(cp -> cp >= 0xD800 && cp <= 0xDFFF);
    }
    public void validateNew(String password) {
        if (!valid(password) || password.codePointCount(0, password.length()) < 10)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호는 10~128자로 입력해 주세요.");
        if (!LOWERCASE.matcher(password).find())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "영문 소문자를 포함해 주세요.");
        if (!ADDITIONAL_CHARACTER.matcher(password).find())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "숫자·영문 대문자·특수문자 중 하나 이상 포함해 주세요.");
        if (COMMON.contains(password.toLowerCase(Locale.ROOT)) || password.codePoints().distinct().count() == 1)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "쉽게 추측할 수 있는 비밀번호는 사용할 수 없습니다.");
    }
    public String encode(String password) {
        validateNew(password);
        return upgrade(password);
    }
    public void validateNew(String password, String userName, String email) {
        validateNew(password);
        String normalized = accountComparisonValue(password);
        String address = accountComparisonValue(email);
        for (String value : new String[]{accountComparisonValue(userName), address, address.split("@", -1)[0]}) {
            if (!value.isEmpty() && normalized.contains(value))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "닉네임이나 이메일의 @ 앞부분을 비밀번호에 포함하지 마세요.");
        }
    }
    private static String accountComparisonValue(String value) {
        return value == null ? "" : Normalizer.normalize(value, Normalizer.Form.NFKC).strip().toLowerCase(Locale.ROOT);
    }
    public String encode(String password, String userName, String email) {
        validateNew(password, userName, email);
        return upgrade(password);
    }
    // A successful legacy login may upgrade a password that predates the current length policy.
    public String upgrade(String password) {
        if (!valid(password)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        return bounded(() -> encoder.encode(password));
    }
    public boolean needsUpgrade(String encoded) {
        return !encoded.startsWith("$argon2id$") || encoder.upgradeEncoding(encoded);
    }
    public boolean matches(String password, String encoded) {
        if (!valid(password)) return false;
        return bounded(() -> {
            if (encoded != null && encoded.startsWith("$argon2id$")) return encoder.matches(password, encoded);
            if (encoded != null && encoded.matches("\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}") && password.getBytes(StandardCharsets.UTF_8).length <= 72)
                return legacy.matches(password, encoded);
            encoder.matches(password, dummyHash);
            return false;
        });
    }
    private <T> T bounded(Supplier<T> work) {
        if (!hashing.tryAcquire()) throw new AuthenticationThrottledException(1);
        try { return work.get(); } finally { hashing.release(); }
    }
}
