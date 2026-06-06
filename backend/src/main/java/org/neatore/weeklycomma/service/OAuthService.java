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
    @Value("${oauth_naver_cli_id}")
    private String clientId;

    @Value("${oauth_naver_cli_key}")
    private String clientKey;

    public String getEmailNaver(String authCode, String redirectUri, String state) {
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

            return userProfileResponse.optString("email");
        } catch (NullPointerException e) {
            return null;
        }
    }
}
