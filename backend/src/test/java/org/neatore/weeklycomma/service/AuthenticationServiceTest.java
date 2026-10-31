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

    @BeforeEach void setUp() {
        var ds = new HikariDataSource();
        ds.setJdbcUrl("jdbc:sqlite:" + directory.resolve("auth.db"));
        ds.setMaximumPoolSize(1);
        context = new AnnotationConfigApplicationContext();
        context.getEnvironment().getPropertySources().addFirst(new MapPropertySource("test", Map.of("JWT_TOKEN_SECRET", "0123456789abcdef0123456789abcdef")));
        context.registerBean(DataSource.class, () -> ds);
        context.registerBean(Clock.class, Clock::systemUTC);
        context.register(RecommendationExpirationServiceTest.TestConfiguration.class);
        context.registerBean(LoginPasswordService.class);
        context.registerBean(UserService.class, () -> new UserService(context.getBean(UserRepository.class), null, null, null, null, context.getBean(LoginPasswordService.class)));
        context.registerBean(JwtService.class);
        context.refresh();
        users = context.getBean(UserService.class);
        repository = context.getBean(UserRepository.class);
        passwords = context.getBean(LoginPasswordService.class);
        jwt = context.getBean(JwtService.class);
        OAuthService oauth = new OAuthService() {
            @Override public JSONObject getUserProfileNaver(String code, String redirect, String state) {
                if (providerUnavailable) throw new RestClientException("test provider unavailable");
                return profile;
            }
        };
        controller = new AuthenticationController(oauth, users, jwt, passwords);
    }
    @AfterEach void close() { if (context != null) context.close(); }
    AuthDto.LoginRequest local(String email, String password) { return new AuthDto.LoginRequest(AuthType.LOCAL, email, password, null, null, null); }
    AuthDto.LoginRequest naver() { return new AuthDto.LoginRequest(AuthType.OAUTH_NAVER, null, null, "test-code", "http://localhost/authcallback/OAUTH_NAVER", "test-state"); }
    void createLocal() { users.addUser(new UserDto.SignupRequest(AuthType.LOCAL, "독자", "reader@example.test", "correct password", null, null, null)); }

    @Test void signupHashesPasswordsAndSuccessfulLoginIssuesMatchingSessionAndCsrf() {
        createLocal();
        User user = users.getUserByEmail("reader@example.test");
        assertNotEquals("correct password", user.getPassword());
        assertTrue(passwords.matches("correct password", user.getPassword()));
        var response = controller.login(local(" reader@example.test ", "correct password"));
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
        repository.save(new User("social", "social@example.test", "naver-id", passwords.encode("correct password"), User.UserType.GENERAL, AuthType.OAUTH_NAVER));
        for (var request : new AuthDto.LoginRequest[]{local("reader@example.test", "wrong password"), local("missing@example.test", "correct password"), local("social@example.test", "correct password")}) {
            var response = controller.login(request);
            assertEquals(401, response.getStatusCode().value());
            assertNull(response.getHeaders().getFirst(HttpHeaders.SET_COOKIE));
            assertNull(response.getBody());
        }
    }
    @Test void blankAndOversizedCredentialsAreRejectedIncludingUtf8ByteLength() {
        for (var request : new AuthDto.LoginRequest[]{local(null, "x"), local("", "x"), local("a@example.test", null), local("a@example.test", " "), local("a@example.test", "a".repeat(73)), local("a@example.test", "가".repeat(25))})
            assertEquals(400, controller.login(request).getStatusCode().value());
    }
    @Test void plaintextPasswordIsNeverAcceptedAsAHash() {
        repository.save(new User("legacy", "legacy@example.test", null, "plaintext", User.UserType.GENERAL, AuthType.LOCAL));
        assertEquals(401, controller.login(local("legacy@example.test", "plaintext")).getStatusCode().value());
    }
    @Test void passwordUpdateAlsoHashesAndInvalidatesOldPassword() {
        createLocal();
        users.updateUser(users.getUserByEmail("reader@example.test").getId(), new UserDto.SignupRequest(AuthType.LOCAL, "독자", "reader@example.test", "new password", null, null, null));
        assertEquals(401, controller.login(local("reader@example.test", "correct password")).getStatusCode().value());
        assertEquals(200, controller.login(local("reader@example.test", "new password")).getStatusCode().value());
    }
    @Test void missingProfileOrUnregisteredSocialUserDoesNotIssueCookie() {
        assertEquals(401, controller.login(naver()).getStatusCode().value());
        profile = new JSONObject();
        assertEquals(401, controller.login(naver()).getStatusCode().value());
        profile.put("id", "unknown");
        assertEquals(401, controller.login(naver()).getStatusCode().value());
    }
    @Test void validSocialUserLogsInAndProviderFailuresAreRetryable() {
        repository.save(new User("네이버 독자", "naver@example.test", "known", null, User.UserType.GENERAL, AuthType.OAUTH_NAVER));
        profile = new JSONObject().put("id", "known");
        assertEquals(200, controller.login(naver()).getStatusCode().value());
        providerUnavailable = true;
        assertEquals(503, controller.login(naver()).getStatusCode().value());
    }
    @Test void incompleteOAuthRequestIsRejectedBeforeProviderCall() {
        providerUnavailable = true;
        assertEquals(400, controller.login(new AuthDto.LoginRequest(AuthType.OAUTH_NAVER, null, null, null, null, null)).getStatusCode().value());
    }
}
