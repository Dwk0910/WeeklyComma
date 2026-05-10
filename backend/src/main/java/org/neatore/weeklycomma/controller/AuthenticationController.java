package org.neatore.weeklycomma.controller;

import org.neatore.weeklycomma.dto.UserDto;
import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.service.OAuthService;
import org.neatore.weeklycomma.service.UserService;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

import java.time.Duration;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class AuthenticationController {
    private final OAuthService oAuthService;
    private final UserService userService;

    @PostMapping("/login/oauth_naver")
    public ResponseEntity<Void> login(@RequestBody UserDto.NaverOAuthRequest naverOAuthRequest) {
        String email = oAuthService.getEmail(naverOAuthRequest.auth_code(), naverOAuthRequest.redirect_uri(), naverOAuthRequest.state());
        User user = userService.getUserByEmail(email);

        // Generate cookie
        if (user != null) {
            String newToken = userService.newLoginSession(user);
            ResponseCookie cookie = ResponseCookie.from("WCA_LOGIN", newToken)
                    .httpOnly(true)
                    .path("/")
                    .maxAge(Duration.ofDays(365))
                    .sameSite("Lax")
                    .build();

            return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString()).build();
        } else return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    @GetMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(name = "WCA_LOGIN") String token) {
        userService.removeToken(token);

        // 말소 쿠키 작성
        ResponseCookie cookie = ResponseCookie.from("WCA_LOGIN", "")
                .maxAge(0)
                .httpOnly(true)
                .path("/")
                .sameSite("Lax")
                .build();

        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString()).build();
    }
}
