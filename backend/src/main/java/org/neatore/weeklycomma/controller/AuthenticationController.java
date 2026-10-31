package org.neatore.weeklycomma.controller;

import org.json.JSONObject;

import org.neatore.weeklycomma.annotations.RequiresAuthentication;
import org.neatore.weeklycomma.dto.login.AuthDto;
import org.neatore.weeklycomma.dto.login.AuthType;

import org.neatore.weeklycomma.domain.User;

import org.neatore.weeklycomma.service.JwtService;
import org.neatore.weeklycomma.service.OAuthService;
import org.neatore.weeklycomma.service.UserService;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

import jakarta.validation.Valid;

import java.time.Duration;

@RestController
@RequiredArgsConstructor
@RequestMapping("/authsessions")
public class AuthenticationController {
    private final OAuthService oAuthService;
    private final UserService userService;
    private final JwtService jwtService;
    private final org.neatore.weeklycomma.service.LoginPasswordService passwords;

    private final Duration EXPIRATION_DURATION = Duration.ofDays(30);

    private String getLSData(JwtService.JwtToken jwtToken) {
        User user = this.jwtService.getUser(jwtToken.jwtToken());

        JSONObject result = new JSONObject();
        result.put("userName", user.getUserName());
        result.put("userType", user.getUserType());
        result.put("csrfToken", jwtToken.csrfToken());

        return result.toString();
    }

    @GetMapping("/me")
    @RequiresAuthentication
    public ResponseEntity<String> me(@CookieValue("WCA_ACCESS") String accessToken, @RequestHeader("X-Csrf-Token") String csrfToken) {
        if (!jwtService.validateToken(accessToken)) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(this.getLSData(new JwtService.JwtToken(accessToken, csrfToken)));
    }

    @PostMapping
    public ResponseEntity<String> login(@Valid @RequestBody AuthDto.LoginRequest request) {
        User user;
        if (request.authType() == AuthType.LOCAL) {
            if (request.email() == null || request.email().isBlank() || request.email().length() > 254
                    || !passwords.valid(request.password()))
                return ResponseEntity.badRequest().build();
            user = userService.getUserByEmail(request.email().trim());
            String hash = user != null && user.getAuthType() == AuthType.LOCAL ? user.getPassword() : null;
            if (!passwords.matches(request.password(), hash)) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } else {
            if (request.auth_code() == null || request.auth_code().isBlank() || request.auth_code().length() > 2048
                    || request.state() == null || request.state().isBlank() || request.state().length() > 512
                    || request.redirect_uri() == null || request.redirect_uri().isBlank() || request.redirect_uri().length() > 2048)
                return ResponseEntity.badRequest().build();
            JSONObject profile;
            try {
                profile = oAuthService.getUserProfileNaver(request.auth_code(), request.redirect_uri(), request.state());
            } catch (org.springframework.web.client.RestClientException ex) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
            }
            if (profile == null || profile.optString("id").isBlank())
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            user = userService.getUserByOauthId(profile.optString("id"));
            if (user == null || user.getAuthType() != AuthType.OAUTH_NAVER)
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        JwtService.JwtToken jwtToken = jwtService.createToken(user, EXPIRATION_DURATION.toMillis());
        ResponseCookie cookie = ResponseCookie.from("WCA_ACCESS", jwtToken.jwtToken())
                .httpOnly(true).secure(true).path("/").maxAge(EXPIRATION_DURATION).sameSite("None").build();
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString()).body(getLSData(jwtToken));
    }

    @DeleteMapping
    @RequiresAuthentication
    public ResponseEntity<Void> logout() {
        // 말소 쿠키 작성
        ResponseCookie ac = ResponseCookie.from("WCA_ACCESS")
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(0)
                .sameSite("None")
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, ac.toString())
                .build();
    }
}
