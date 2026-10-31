package org.neatore.weeklycomma.service;

import org.json.JSONObject;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestClient;

import lombok.RequiredArgsConstructor;

import java.util.Objects;

@Service
@RequiredArgsConstructor
public class OAuthService {
    @org.springframework.beans.factory.annotation.Autowired
    private GoogleOAuthClient google;

    @Value("${OAUTH_NAVER_CLI_ID}")
    private String clientId;

    @Value("${OAUTH_NAVER_CLI_KEY}")
    private String clientKey;

    public JSONObject getUserProfile(org.neatore.weeklycomma.dto.login.AuthType type, String code, String redirectUri,
                                     String state, String codeVerifier, String nonce) {
        if (code == null || code.isBlank() || code.length() > 2048
                || redirectUri == null || redirectUri.isBlank() || redirectUri.length() > 2048
                || state == null || state.isBlank() || state.length() > 512)
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST);
        return switch (type) {
            case OAUTH_NAVER -> getUserProfileNaver(code, redirectUri, state);
            case OAUTH_GOOGLE -> getUserProfileGoogle(code, redirectUri, codeVerifier, nonce);
            case LOCAL -> throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST);
        };
    }

    public JSONObject getUserProfileGoogle(String code, String redirectUri, String codeVerifier, String nonce) {
        return google.getUserProfile(code, redirectUri, codeVerifier, nonce);
    }

    public JSONObject getUserProfileNaver(String authCode, String redirectUri, String state) {
        // Access Token 구하기
        if (clientId == null || clientKey == null) throw new RuntimeException("OAuth Client ID/SECRET not set.");

        RestClient rc = RestClient.create();

        try {
            JSONObject accessTokenResponse = new JSONObject(
                    Objects.requireNonNull(
                            rc.post()
                                    .uri(uriBuilder -> uriBuilder
                                            .scheme("https")
                                            .host("nid.naver.com")
                                            .path("/oauth2.0/token")
                                            .queryParam("grant_type", "authorization_code")
                                            .queryParam("state", state)
                                            .queryParam("code", authCode)
                                            .queryParam("client_id", clientId)
                                            .queryParam("client_secret", clientKey)
                                            .queryParam("redirect_uri", redirectUri)
                                            .build())
                                    .retrieve()
                                    .body(String.class)
                    ));

            return new JSONObject(
                    Objects.requireNonNull(
                            rc.post()
                                    .uri(uriBuilder -> uriBuilder
                                            .scheme("https")
                                            .host("openapi.naver.com")
                                            .path("/v1/nid/me")
                                            .build())
                                    .header("Authorization", "Bearer " + accessTokenResponse.optString("access_token"))
                                    .retrieve()
                                    .body(String.class)
                    )).optJSONObject("response");
        } catch (NullPointerException e) {
            return null;
        }
    }
}
