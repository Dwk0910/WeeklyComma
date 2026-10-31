package org.neatore.weeklycomma.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.json.JSONObject;
import org.json.JSONException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.List;

@Component
public class GoogleOAuthClient {
    private final String clientId;
    private final String clientSecret;
    private final RestClient client;
    private final GoogleIdTokenVerifier verifier;

    @Autowired
    public GoogleOAuthClient(@Value("${OAUTH_GOOGLE_CLI_ID:}") String clientId,
                             @Value("${OAUTH_GOOGLE_CLI_KEY:}") String clientSecret) {
        this(clientId, clientSecret, httpClient(), new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(List.of(clientId)).setAcceptableTimeSkewSeconds(60).build());
    }

    GoogleOAuthClient(String clientId, String clientSecret, RestClient client, GoogleIdTokenVerifier verifier) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.client = client;
        this.verifier = verifier;
    }

    private static RestClient httpClient() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(10_000);
        return RestClient.builder().requestFactory(factory).build();
    }

    public JSONObject getUserProfile(String code, String redirectUri, String codeVerifier, String nonce) {
        if (clientId.isBlank() || clientSecret.isBlank())
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Google 로그인 설정을 확인해 주세요.");
        if (codeVerifier == null || !codeVerifier.matches("[A-Za-z0-9._~-]{43,128}")
                || nonce == null || !nonce.matches("[A-Za-z0-9_-]{16,128}"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        var form = new LinkedMultiValueMap<String, String>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("code", code);
        form.add("redirect_uri", redirectUri);
        form.add("code_verifier", codeVerifier);
        try {
            String body = client.post().uri("https://oauth2.googleapis.com/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form).retrieve().body(String.class);
            if (body == null) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
            String encoded = new JSONObject(body).optString("id_token");
            if (encoded.isBlank()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
            // The Google SDK checks the signature, issuer, audience and validity period using cached Google keys.
            GoogleIdToken token = verifier.verify(encoded);
            if (token == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
            var payload = token.getPayload();
            if (!nonce.equals(payload.getNonce())
                    || payload.getAuthorizedParty() != null && !clientId.equals(payload.getAuthorizedParty())
                    || payload.getSubject() == null || payload.getSubject().isBlank() || payload.getSubject().length() > 255
                    || !Boolean.TRUE.equals(payload.getEmailVerified())
                    || payload.getEmail() == null || payload.getEmail().isBlank() || payload.getEmail().length() > 254)
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
            return new JSONObject().put("id", payload.getSubject()).put("email", payload.getEmail());
        } catch (RestClientResponseException error) {
            // Never expose the provider response (which may contain credentials) to the browser or logs.
            throw new ResponseStatusException(error.getStatusCode().is4xxClientError()
                    ? HttpStatus.UNAUTHORIZED : HttpStatus.SERVICE_UNAVAILABLE);
        } catch (RestClientException | IOException | GeneralSecurityException | JSONException error) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
        }
    }
}
