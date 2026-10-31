package org.neatore.weeklycomma.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.auth.oauth2.GooglePublicKeysManager;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.json.webtoken.JsonWebSignature;
import org.json.JSONObject;
import org.junit.jupiter.api.*;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.http.client.MockClientHttpRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.util.List;
import java.util.function.Consumer;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class GoogleOAuthClientTest {
    static KeyPair keys;
    static KeyPair attackerKeys;
    static final String CLIENT = "test-client.apps.googleusercontent.com";
    static final String NONCE = "test-nonce-123456789";
    GoogleOAuthClient google;
    MockRestServiceServer server;
    @BeforeAll static void keys() throws Exception {
        var generator = KeyPairGenerator.getInstance("RSA"); generator.initialize(2048);
        keys = generator.generateKeyPair(); attackerKeys = generator.generateKeyPair();
    }
    @BeforeEach void setup() {
        var builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        var cachedKeys = new GooglePublicKeysManager(new NetHttpTransport(), GsonFactory.getDefaultInstance());
        // Seed the SDK's public-key cache with ephemeral test keys; no Google network calls or real credentials.
        ReflectionTestUtils.setField(cachedKeys, "publicKeys", List.of(keys.getPublic()));
        ReflectionTestUtils.setField(cachedKeys, "expirationTimeMilliseconds", Long.MAX_VALUE);
        var verifier = new GoogleIdTokenVerifier.Builder(cachedKeys).setAudience(List.of(CLIENT))
                .setAcceptableTimeSkewSeconds(0).build();
        google = new GoogleOAuthClient(CLIENT, "test-secret", builder.build(), verifier);
    }
    String token(Consumer<GoogleIdToken.Payload> change, PrivateKey key) throws Exception {
        long now = System.currentTimeMillis() / 1000;
        var payload = new GoogleIdToken.Payload().setIssuer("https://accounts.google.com").setAudience(CLIENT)
                .setSubject("google-subject").setIssuedAtTimeSeconds(now - 10).setExpirationTimeSeconds(now + 600)
                .setEmail("reader@example.test").setEmailVerified(true).setNonce(NONCE).setAuthorizedParty(CLIENT);
        change.accept(payload);
        return JsonWebSignature.signUsingRsaSha256(key, GsonFactory.getDefaultInstance(),
                new JsonWebSignature.Header().setAlgorithm("RS256"), payload);
    }
    void response(String token) {
        server.expect(request -> {
            assertEquals("https://oauth2.googleapis.com/token", request.getURI().toString());
            assertEquals(HttpMethod.POST, request.getMethod());
            assertTrue(MediaType.APPLICATION_FORM_URLENCODED.isCompatibleWith(request.getHeaders().getContentType()));
            String body = ((MockClientHttpRequest) request).getBodyAsString();
            assertTrue(body.contains("client_secret=test-secret"));
            assertTrue(body.contains("code_verifier=" + "v".repeat(43)));
            assertFalse(request.getURI().toString().contains("test-secret"));
        }).andRespond(withSuccess(new JSONObject().put("id_token", token).toString(), MediaType.APPLICATION_JSON));
    }
    JSONObject profile() { return google.getUserProfile("code", "http://localhost:5173/authcallback/OAUTH_GOOGLE", "v".repeat(43), NONCE); }
    @Test void acceptsSignedGoogleTokenAndExposesOnlyVerifiedIdentity() throws Exception {
        response(token(p -> {}, keys.getPrivate()));
        JSONObject profile = profile();
        assertEquals("google-subject", profile.getString("id"));
        assertEquals("reader@example.test", profile.getString("email"));
        assertEquals(2, profile.length());
        server.verify();
    }
    @Test void rejectsInvalidSignatureIssuerAudienceExpiryNonceAndUnverifiedEmail() throws Exception {
        List<Consumer<GoogleIdToken.Payload>> changes = List.of(
                p -> p.setIssuer("https://attacker.test"), p -> p.setAudience("another-app"),
                p -> p.setExpirationTimeSeconds(System.currentTimeMillis() / 1000 - 60),
                p -> p.setNonce("different-nonce"), p -> p.setEmailVerified(false),
                p -> p.setAuthorizedParty("another-app"), p -> p.setSubject(""));
        for (var change : changes) {
            server.reset(); response(token(change, keys.getPrivate()));
            assertEquals(401, assertThrows(ResponseStatusException.class, this::profile).getStatusCode().value());
            server.verify();
        }
        server.reset(); response(token(p -> {}, attackerKeys.getPrivate()));
        assertEquals(401, assertThrows(ResponseStatusException.class, this::profile).getStatusCode().value());
    }
    @Test void rejectsMissingPkceAndNonceBeforeContactingGoogle() {
        assertEquals(400, assertThrows(ResponseStatusException.class,
                () -> google.getUserProfile("code", "redirect", null, NONCE)).getStatusCode().value());
        assertEquals(400, assertThrows(ResponseStatusException.class,
                () -> google.getUserProfile("code", "redirect", "v".repeat(43), null)).getStatusCode().value());
        server.verify();
    }
    @Test void providerFailuresDoNotExposeResponseBodies() {
        server.expect(request -> {}).andRespond(withStatus(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.APPLICATION_JSON).body("{\"error\":\"invalid_grant\",\"debug\":\"test-secret\"}"));
        var invalid = assertThrows(ResponseStatusException.class, this::profile);
        assertEquals(401, invalid.getStatusCode().value());
        assertFalse(invalid.toString().contains("test-secret"));
        server.reset(); server.expect(request -> {}).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));
        assertEquals(503, assertThrows(ResponseStatusException.class, this::profile).getStatusCode().value());
    }
    @Test void missingGoogleConfigurationFailsClosed() {
        var disabled = new GoogleOAuthClient("", "");
        assertEquals(503, assertThrows(ResponseStatusException.class,
                () -> disabled.getUserProfile("code", "redirect", "v".repeat(43), NONCE)).getStatusCode().value());
    }
}
