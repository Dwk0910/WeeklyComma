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
        if (request.authType() == AuthType.LOCAL) {
            User user = userService.getUserByEmail(request.email());
            if (user != null) {
                // TODO: 비밀번호 검증
            }
        } else {
            // OAUTH(소셜) 로그인

            String oauthId = switch (request.authType()) {
                case OAUTH_NAVER -> oAuthService.getUserProfileNaver(request.auth_code(), request.redirect_uri(), request.state()).optString("id");
                default -> null;
            };

            User user = userService.getUserByOauthId(oauthId);

            // Generate cookie
            if (user != null) {
                JwtService.JwtToken jwtToken = this.jwtService.createToken(user, EXPIRATION_DURATION.toMillis());

                ResponseCookie jwtCookie = ResponseCookie.from("WCA_ACCESS", jwtToken.jwtToken())
                        .httpOnly(true)
                        .secure(true)
                        .path("/")
                        .domain(null)
                        .maxAge(EXPIRATION_DURATION)
                        .sameSite("none")
                        .build();

                return ResponseEntity.ok()
                        .header(HttpHeaders.SET_COOKIE, jwtCookie.toString())
                        .body(this.getLSData(jwtToken));
            }
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
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
                .sameSite("none")
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, ac.toString())
                .build();
    }
}
