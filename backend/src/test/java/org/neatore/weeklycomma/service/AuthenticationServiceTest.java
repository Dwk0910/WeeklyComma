package org.neatore.weeklycomma.service;

import com.zaxxer.hikari.HikariDataSource;
import org.json.JSONObject;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.neatore.weeklycomma.controller.AuthenticationController;
import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.dto.login.AuthDto;
import org.neatore.weeklycomma.dto.login.AuthType;
import org.neatore.weeklycomma.dto.login.UserDto;
import org.neatore.weeklycomma.repository.UserRepository;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.env.MapPropertySource;
import org.springframework.http.HttpHeaders;
import org.springframework.web.client.RestClientException;
import javax.sql.DataSource;
import java.nio.file.Path;
import java.time.Clock;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class AuthenticationServiceTest {
    @TempDir Path directory;
    AnnotationConfigApplicationContext context;
    UserService users;
    UserRepository repository;
    JwtService jwt;
    LoginPasswordService passwords;
    AuthenticationController controller;
    JSONObject profile;
    boolean providerUnavailable;
    MutableClock clock;
    LoginThrottleService throttle;
    LoginSessionService sessions;
    static class MutableClock extends Clock {
        java.time.Instant instant = java.time.Instant.parse("2026-10-31T12:00:00Z");
        void advance(java.time.Duration duration) { instant = instant.plus(duration); }
        public java.time.Instant instant() { return instant; }
        public java.time.ZoneId getZone() { return java.time.ZoneOffset.UTC; }
        public Clock withZone(java.time.ZoneId zone) { return this; }
    }
    org.springframework.mock.web.MockHttpServletRequest http(String ip) {
        var request = new org.springframework.mock.web.MockHttpServletRequest(); request.setRemoteAddr(ip); return request;
    }
    org.springframework.http.ResponseEntity<String> login(AuthDto.LoginRequest request) {
        return controller.login(request, http("127.0.0.1"), null);
    }

    @BeforeEach void setUp() {
        var ds = new HikariDataSource();
        ds.setJdbcUrl("jdbc:sqlite:" + directory.resolve("auth.db"));
        ds.setMaximumPoolSize(1);
        context = new AnnotationConfigApplicationContext();
        context.getEnvironment().getPropertySources().addFirst(new MapPropertySource("test", Map.of("JWT_TOKEN_SECRET", "0123456789abcdef0123456789abcdef")));
        context.registerBean(DataSource.class, () -> ds);
        clock = new MutableClock();
        context.registerBean(Clock.class, () -> clock);
        context.register(RecommendationExpirationServiceTest.TestConfiguration.class);
        context.registerBean(LoginPasswordService.class);
        context.registerBean(LoginSessionService.class);
        context.registerBean(org.springframework.jdbc.core.JdbcTemplate.class, () -> new org.springframework.jdbc.core.JdbcTemplate(ds));
        context.registerBean(LoginThrottleService.class);
        OAuthService oauth = new OAuthService() {
            @Override public JSONObject getUserProfileNaver(String code, String redirect, String state) {
                if (providerUnavailable) throw new RestClientException("test provider unavailable");
                return profile;
            }
            @Override public JSONObject getUserProfileGoogle(String code, String redirect, String verifier, String nonce) {
                if (providerUnavailable) throw new RestClientException("test provider unavailable");
                return profile;
            }
        };
        context.registerBean(UserService.class, () -> new UserService(context.getBean(UserRepository.class), oauth, null, null, null, context.getBean(LoginPasswordService.class), context.getBean(LoginSessionService.class)));
        context.registerBean(JwtService.class);
        context.refresh();
        users = context.getBean(UserService.class);
        repository = context.getBean(UserRepository.class);
        passwords = context.getBean(LoginPasswordService.class);
        jwt = context.getBean(JwtService.class);
        throttle = context.getBean(LoginThrottleService.class);
        sessions = context.getBean(LoginSessionService.class);
        controller = new AuthenticationController(oauth, users, jwt, passwords, throttle);
    }
    @AfterEach void close() { if (context != null) context.close(); }
    AuthDto.LoginRequest local(String email, String password) { return new AuthDto.LoginRequest(AuthType.LOCAL, email, password, null, null, null); }
    AuthDto.LoginRequest naver() { return new AuthDto.LoginRequest(AuthType.OAUTH_NAVER, null, null, "test-code", "http://localhost/authcallback/OAUTH_NAVER", "test-state"); }
    void createLocal() { users.addUser(new UserDto.SignupRequest(AuthType.LOCAL, "독자", "reader@example.test", "correct password1", null, null, null)); }

    @Test void signupHashesPasswordsAndSuccessfulLoginIssuesMatchingSessionAndCsrf() {
        createLocal();
        User user = users.getUserByEmail("reader@example.test");
        assertNotEquals("correct password1", user.getPassword());
        assertTrue(passwords.matches("correct password1", user.getPassword()));
        var response = login(local(" reader@example.test ", "correct password1"));
        assertEquals(200, response.getStatusCode().value());
        String cookie = response.getHeaders().getFirst(HttpHeaders.SET_COOKIE);
        assertNotNull(cookie);
        assertTrue(cookie.contains("HttpOnly"));
        assertTrue(cookie.contains("Secure"));
        assertTrue(cookie.contains("SameSite=None"));
        String token = cookie.substring("WCA_ACCESS=".length(), cookie.indexOf(';'));
        JSONObject data = new JSONObject(response.getBody());
        assertTrue(jwt.validateToken(token));
        assertEquals(user.getId(), jwt.getUser(token).getId());
        assertEquals(jwt.getCsrfToken(token), data.getString("csrfToken"));
        assertEquals("독자", data.getString("userName"));
        assertFalse(data.has("password"));
    }
    @Test void wrongPasswordUnknownUserAndSocialAccountAllFailWithoutSession() {
        createLocal();
        repository.save(new User("social", "social@example.test", "naver-id", passwords.encode("correct password1"), User.UserType.GENERAL, AuthType.OAUTH_NAVER));
        for (var request : new AuthDto.LoginRequest[]{local("reader@example.test", "wrong password"), local("missing@example.test", "correct password1"), local("social@example.test", "correct password1")}) {
            var response = login(request);
            assertEquals(401, response.getStatusCode().value());
            assertNull(response.getHeaders().getFirst(HttpHeaders.SET_COOKIE));
            assertNull(response.getBody());
        }
    }
    @Test void blankAndOversizedCredentialsAreRejectedByCharacterCount() {
        for (var request : new AuthDto.LoginRequest[]{local(null, "x"), local("", "x"), local("a@example.test", null), local("a@example.test", " "), local("a@example.test", "a".repeat(129)), local("a@example.test", "가".repeat(129))})
            assertEquals(400, login(request).getStatusCode().value());
    }
    @Test void plaintextPasswordIsNeverAcceptedAsAHash() {
        repository.save(new User("legacy", "legacy@example.test", null, "plaintext", User.UserType.GENERAL, AuthType.LOCAL));
        assertEquals(401, login(local("legacy@example.test", "plaintext")).getStatusCode().value());
    }
    @Test void passwordUpdateAlsoHashesAndInvalidatesOldPassword() {
        createLocal();
        users.changePassword(users.getUserByEmail("reader@example.test").getId(), "correct password1", "new correct password1");
        assertEquals(401, login(local("reader@example.test", "correct password1")).getStatusCode().value());
        assertEquals(200, login(local("reader@example.test", "new correct password1")).getStatusCode().value());
    }
    @Test void missingProfileOrUnregisteredSocialUserDoesNotIssueCookie() {
        assertEquals(401, login(naver()).getStatusCode().value());
        profile = new JSONObject();
        assertEquals(401, login(naver()).getStatusCode().value());
        profile.put("id", "unknown");
        assertEquals(401, login(naver()).getStatusCode().value());
    }
    @Test void validSocialUserLogsInAndProviderFailuresAreRetryable() {
        repository.save(new User("네이버 독자", "naver@example.test", "known", null, User.UserType.GENERAL, AuthType.OAUTH_NAVER));
        profile = new JSONObject().put("id", "known");
        assertEquals(200, login(naver()).getStatusCode().value());
        providerUnavailable = true;
        assertEquals(503, login(naver()).getStatusCode().value());
    }
    @Test void incompleteOAuthRequestIsRejectedBeforeProviderCall() {
        providerUnavailable = true;
        assertEquals(400, login(new AuthDto.LoginRequest(AuthType.OAUTH_NAVER, null, null, null, null, null)).getStatusCode().value());
    }
    @Test void argon2UsesDistinctSaltsAndAcceptsLongUnicodePassphrasesWithoutTruncation() {
        String phrase = "가나다라".repeat(16) + "a1";
        String first = passwords.encode(phrase), second = passwords.encode(phrase);
        assertTrue(first.startsWith("$argon2id$v=19$m=19456,t=2,p=1$"));
        assertNotEquals(first, second);
        assertTrue(passwords.matches(phrase, first));
        assertFalse(passwords.matches(phrase + "끝", first));
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> passwords.encode("short"));
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> passwords.encode("passwordpassword"));
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> passwords.encode("x".repeat(128)));
    }
    @Test void signupAndPasswordChangesAcceptTenCharacterPasswords() {
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> passwords.validateNew("vK8!tL3@r"));
        assertDoesNotThrow(() -> passwords.validateNew("가📚".repeat(4) + "a1"));
        assertDoesNotThrow(() -> passwords.validateNew("가📚".repeat(63) + "a1"));
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> passwords.validateNew("가📚".repeat(63) + "a12"));
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> passwords.validateNew("1q2w3e4r5t"));
        users.addUser(new UserDto.SignupRequest(AuthType.LOCAL, "독자", "reader@example.test", "vK8!tL3@rQ", null, null, null));
        var user = users.authenticateLocal("reader@example.test", "vK8!tL3@rQ");
        assertNotNull(user);
        users.changePassword(user.getId(), "vK8!tL3@rQ", "tZ9#qN4!fL");
        assertNotNull(users.authenticateLocal("reader@example.test", "tZ9#qN4!fL"));
    }
    @Test void newPasswordsRequireLowercaseAndOneAdditionalCharacterType() {
        for (String password : new String[]{"abcdefghijklmno1", "abcdefghijklmnoA", "abcdefghijklmno!", "가나다라마바사아자차카타파하a📚"})
            assertDoesNotThrow(() -> passwords.validateNew(password));
        for (String password : new String[]{"abcdefghijklmno", "ABCDEFGHIJKLMN1", "12345678901234567", "가나다라마바사아자차카타파하가", "abcdefghijklmno "})
            assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> passwords.validateNew(password));
        // Existing credentials still authenticate without satisfying the new signup rule.
        String existing = passwords.upgrade("only lowercase password");
        assertTrue(passwords.matches("only lowercase password", existing));
    }
    @Test void newPasswordsExcludeAccountInformationWithCaseAndUnicodeNormalization() {
        for (String password : new String[]{"Reader-sunrise!482", "reader@example.test!482", "ＲＥＡＤＥＲ-sunrise!482", "독자와읽는책이야기를함께해요a1",
                java.text.Normalizer.normalize("독자와읽는책이야기를함께해요a1", java.text.Normalizer.Form.NFD)})
            assertThrows(org.springframework.web.server.ResponseStatusException.class,
                    () -> passwords.validateNew(password, " 독자 ", " READER@example.test "));
        assertDoesNotThrow(() -> passwords.validateNew("unrelated-example.test!482", "독자", "reader@example.test"));
        assertDoesNotThrow(() -> passwords.validateNew("vK8!tL3@rQ7#nB5$", "", null));
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> passwords.validateNew("vK8!tL3@rQ7#nB5$", "k", "reader@example.test"));
    }
    @Test void signupAndPasswordChangesRejectAccountInformationWithoutChangingCredentials() {
        for (String password : new String[]{"Reader-sunrise!482", "독자와읽는책이야기를함께해요a1"}) {
            var error = assertThrows(org.springframework.web.server.ResponseStatusException.class,
                    () -> users.addUser(new UserDto.SignupRequest(AuthType.LOCAL, "독자", "reader@example.test", password, null, null, null)));
            assertEquals(400, error.getStatusCode().value());
        }
        assertNull(users.getUserByEmail("reader@example.test"));
        createLocal();
        User user = users.getUserByEmail("reader@example.test");
        String hash = user.getPassword();
        var token = jwt.createToken(user, LoginSessionService.MAX_AGE.toMillis());
        for (String password : new String[]{"Reader-sunrise!482", "독자와읽는책이야기를함께해요a1"})
            assertThrows(org.springframework.web.server.ResponseStatusException.class,
                    () -> users.changePassword(user.getId(), "correct password1", password));
        assertEquals(hash, users.getUserByEmail("reader@example.test").getPassword());
        assertTrue(jwt.validateToken(token.jwtToken()));
        assertNotNull(users.authenticateLocal("reader@example.test", "correct password1"));
    }
    @Test void bcryptIsUpgradedOnlyAfterSuccessfulAuthentication() {
        String oldHash = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode("older password");
        repository.save(new User("legacy", "old@example.test", null, oldHash, User.UserType.GENERAL, AuthType.LOCAL));
        assertEquals(401, login(local("old@example.test", "wrong")).getStatusCode().value());
        assertEquals(oldHash, users.getUserByEmail("old@example.test").getPassword());
        assertEquals(200, login(local("OLD@example.test", "older password")).getStatusCode().value());
        assertTrue(users.getUserByEmail("old@example.test").getPassword().startsWith("$argon2id$"));
    }
    @Test void logoutRevokesCopiedTokensAndOnlyTheirOwnSession() {
        createLocal();
        User user = users.getUserByEmail("reader@example.test");
        var first = jwt.createToken(user, LoginSessionService.MAX_AGE.toMillis());
        var other = jwt.createToken(user, LoginSessionService.MAX_AGE.toMillis());
        assertTrue(jwt.validateToken(first.jwtToken()));
        controller.logout(first.jwtToken());
        assertFalse(jwt.validateToken(first.jwtToken()));
        assertTrue(jwt.validateToken(other.jwtToken()));
        var persisted = context.getBean(org.neatore.weeklycomma.repository.LoginSessionRepository.class).findAll();
        assertEquals(1, persisted.size());
        assertFalse(persisted.get(0).getTokenHash().contains(other.jwtToken()));
    }
    @Test void changingPasswordRequiresCurrentPasswordAndRevokesAllSessionsIncludingRacingOldLogin() {
        createLocal();
        User stale = users.getUserByEmail("reader@example.test");
        var first = jwt.createToken(stale, LoginSessionService.MAX_AGE.toMillis());
        var second = jwt.createToken(stale, LoginSessionService.MAX_AGE.toMillis());
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> users.changePassword(stale.getId(), "incorrect", "new correct password1"));
        assertTrue(jwt.validateToken(first.jwtToken()));
        users.changePassword(stale.getId(), "correct password1", "new correct password1");
        assertFalse(jwt.validateToken(first.jwtToken()));
        assertFalse(jwt.validateToken(second.jwtToken()));
        var racing = jwt.createToken(stale, LoginSessionService.MAX_AGE.toMillis());
        assertFalse(jwt.validateToken(racing.jwtToken()));
    }
    @Test void idleAndAbsoluteTimeoutsAreEnforcedOnTheServer() {
        createLocal(); User user = users.getUserByEmail("reader@example.test");
        var idle = jwt.createToken(user, LoginSessionService.MAX_AGE.toMillis());
        clock.advance(java.time.Duration.ofMinutes(30));
        assertFalse(jwt.validateToken(idle.jwtToken()));
        var active = jwt.createToken(user, java.time.Duration.ofDays(30).toMillis());
        for (int i = 0; i < 35; i++) {
            clock.advance(java.time.Duration.ofMinutes(20)); assertTrue(jwt.validateToken(active.jwtToken()));
        }
        clock.advance(java.time.Duration.ofMinutes(20)); assertFalse(jwt.validateToken(active.jwtToken()));
        sessions.cleanup();
        assertEquals(0, context.getBean(org.neatore.weeklycomma.repository.LoginSessionRepository.class).count());
    }
    @Test void repeatedFailuresAreLimitedAcrossEmailCaseAndSourceAddressesAndExpire() {
        createLocal();
        for (int i = 0; i < 5; i++) assertEquals(401, login(local("reader@example.test", "wrong")).getStatusCode().value());
        var failure = assertThrows(org.neatore.weeklycomma.exception.AuthenticationThrottledException.class,
                () -> controller.login(local(" READER@example.test ", "correct password1"), http("192.0.2.2"), null));
        assertEquals("900", failure.getHeaders().getFirst("Retry-After"));
        // A new service instance still reads the persisted limits.
        var restarted = new LoginThrottleService(context.getBean(org.springframework.jdbc.core.JdbcTemplate.class), clock);
        assertTrue(restarted.reserveLogin("reader@example.test", "192.0.2.3") > 0);
        clock.advance(java.time.Duration.ofMinutes(15));
        assertEquals(200, login(local("reader@example.test", "correct password1")).getStatusCode().value());
    }
    @Test void accountEnumerationAndPasswordSprayingCannotBypassLimits() {
        for (int i = 0; i < 5; i++) assertEquals(401, login(local("missing@example.test", "wrong")).getStatusCode().value());
        assertThrows(org.neatore.weeklycomma.exception.AuthenticationThrottledException.class,
                () -> login(local("missing@example.test", "wrong")));
        for (int i = 0; i < LoginThrottleService.IP_LIMIT; i++) assertEquals(0, throttle.reserveLogin("different" + i + "@example.test", "192.0.2.99"));
        assertTrue(throttle.reserveLogin("one-more@example.test", "192.0.2.99") > 0);
    }
    @Test void concurrentReservationsCannotExceedTheAccountBudget() throws Exception {
        var pool = java.util.concurrent.Executors.newFixedThreadPool(10);
        try {
            var jobs = new java.util.ArrayList<java.util.concurrent.Callable<Long>>();
            for (int i = 0; i < 20; i++) { final int n = i; jobs.add(() -> throttle.reserveLogin("same@example.test", "192.0.2." + n)); }
            long allowed = 0;
            for (var result : pool.invokeAll(jobs)) if (result.get() == 0) allowed++;
            assertEquals(5, allowed);
        } finally { pool.shutdownNow(); }
    }
    @Test void successResetsOnlyTheAccountCounterAndSignupHasAnIndependentIpLimit() {
        for (int i = 0; i < 5; i++) assertEquals(0, throttle.reserveLogin("reader@example.test", "192.0.2.1"));
        throttle.succeeded("reader@example.test");
        assertEquals(0, throttle.reserveLogin("reader@example.test", "192.0.2.1"));
        for (int i = 0; i < 54; i++) assertEquals(0, throttle.reserveLogin("other" + i + "@example.test", "192.0.2.1"));
        assertTrue(throttle.reserveLogin("another@example.test", "192.0.2.1") > 0);
        for (int i = 0; i < 10; i++) assertEquals(0, throttle.reserveSignup("192.0.2.1"));
        assertTrue(throttle.reserveSignup("192.0.2.1") > 0);
    }

    @Test void databaseFailureIsNotMisreportedAsAnExpiredSession() {
        createLocal();
        var token = jwt.createToken(users.getUserByEmail("reader@example.test"), LoginSessionService.MAX_AGE.toMillis());
        ((HikariDataSource) context.getBean(DataSource.class)).close();
        assertThrows(org.springframework.transaction.CannotCreateTransactionException.class, () -> jwt.validateToken(token.jwtToken()));
    }

    AuthDto.LoginRequest google() {
        return new AuthDto.LoginRequest(AuthType.OAUTH_GOOGLE, null, null, "google-code",
                "http://localhost:5173/authcallback/OAUTH_GOOGLE", "state", "v".repeat(43), "test-nonce-123456789");
    }
    @Test void googleLoginDoesNotAuthenticateANaverUserWithTheSameProviderSubject() {
        repository.save(new User("naver", "naver@example.test", "same-subject", null, User.UserType.CURATOR, AuthType.OAUTH_NAVER));
        profile = new JSONObject().put("id", "same-subject");
        assertEquals(401, login(google()).getStatusCode().value());
        var own = repository.save(new User("google", "google@example.test", AuthType.OAUTH_GOOGLE.subjectKey("same-subject"), null, User.UserType.GENERAL, AuthType.OAUTH_GOOGLE));
        var response = login(google());
        assertEquals(200, response.getStatusCode().value());
        assertEquals("GENERAL", new JSONObject(response.getBody()).getString("userType"));
        String cookie = response.getHeaders().getFirst(HttpHeaders.SET_COOKIE);
        String token = cookie.substring("WCA_ACCESS=".length(), cookie.indexOf(';'));
        assertEquals(own.getId(), jwt.getUser(token).getId());
        assertTrue(jwt.validateToken(token));
    }
    @Test void googleSignupUsesNamespacedIdentityAndNeverLinksByEmail() {
        profile = new JSONObject().put("id", "google-subject").put("email", "google@example.test");
        var request = new UserDto.SignupRequest(AuthType.OAUTH_GOOGLE, "google", null, null, "code",
                "http://localhost:5173/signupcallback/OAUTH_GOOGLE", "state", "v".repeat(43), "test-nonce-123456789");
        users.addUser(request);
        User added = users.getUserByEmail("google@example.test");
        assertEquals(AuthType.OAUTH_GOOGLE, added.getAuthType());
        assertEquals("OAUTH_GOOGLE:google-subject", added.getOauthId());
        assertNull(added.getPassword());
        assertEquals(User.UserType.GENERAL, added.getUserType());
        var duplicate = assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> users.addUser(request));
        assertEquals(409, duplicate.getStatusCode().value());
        createLocal();
        profile = new JSONObject().put("id", "another-subject").put("email", "reader@example.test");
        var conflict = assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> users.addUser(request));
        assertEquals(409, conflict.getStatusCode().value());
        assertEquals(AuthType.LOCAL, users.getUserByEmail("reader@example.test").getAuthType());
        assertEquals(401, login(google()).getStatusCode().value());
    }

}
