package org.neatore.weeklycomma.service;

import org.json.JSONObject;

import org.neatore.weeklycomma.WeeklyComma;

import com.google.api.client.auth.oauth2.TokenResponse;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeTokenRequest;
import com.google.api.client.http.GenericUrl;
import com.google.api.client.http.HttpRequest;
import com.google.api.client.http.HttpRequestFactory;
import com.google.api.client.http.HttpResponse;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
public class AuthService {
    public boolean authorize(String authCode, String redirectUri) {
        // Google Access Token 구하기
        String clientId = System.getenv("OAUTH_CLIENT_ID");
        String clientKey = System.getenv("OAUTH_CLIENT_KEY");

        if (clientId == null || clientKey == null) throw new RuntimeException("Google OAuth Client ID/SECRET not set.");

        try {
            TokenResponse tokenResponse = new GoogleAuthorizationCodeTokenRequest(
                    new NetHttpTransport(),
                    new GsonFactory(),
                    "https://oauth2.googleapis.com/token",
                    clientId, clientKey, authCode, redirectUri
            ).execute();

            String accessToken = tokenResponse.getAccessToken();

            // 구한 Google Access Token을 사용하여 유저 이메일 검증
            HttpRequestFactory requestFactory = new NetHttpTransport().createRequestFactory();
            GenericUrl url = new GenericUrl("https://www.googleapis.com/oauth2/v3/userinfo");

            HttpRequest request = requestFactory.buildGetRequest(url);
            request.getHeaders().setAuthorization("Bearer " + accessToken);
            HttpResponse response_ = request.execute();
            JSONObject response = new JSONObject(response_.parseAsString());

            System.out.println(response.getString("email"));

            return WeeklyComma.ALLOWED_EMAILS.contains(response.getString("email"));
        } catch (IOException e) {
            WeeklyComma.LOGGER.error("", e);
        }
        return false;
    }
}
