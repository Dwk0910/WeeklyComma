package org.neatore.weeklycomma.service;

import org.neatore.weeklycomma.WeeklyComma;

import org.json.JSONObject;

import org.springframework.web.client.RestClient;
import org.springframework.stereotype.Service;

import java.util.Objects;

@Service
public class AuthService {
    public boolean authorize(String authCode, String redirectUri, String state) {
        // Access Token 구하기
        String clientId = System.getenv("OAUTH_CLIENT_ID");
        String clientKey = System.getenv("OAUTH_CLIENT_KEY");

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

            JSONObject userProfileResponse = new JSONObject(
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

            return WeeklyComma.ALLOWED_EMAILS.contains(userProfileResponse.optString("email"));
        } catch (NullPointerException e) {
            return false;
        }
    }
}
