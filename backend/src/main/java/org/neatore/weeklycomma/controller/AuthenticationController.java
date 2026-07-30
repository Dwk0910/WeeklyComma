package org.neatore.weeklycomma.controller;

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

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

    @PostMapping
    public ResponseEntity<Void> login(@Valid @RequestBody AuthDto.LoginRequest request) {
        if (request.authType() == AuthType.LOCAL) {
            User user = userService.getUserByEmail(request.email());
            if (user != null) {
                // TODO: 비밀번호 검증
            }
        } else {
            // OAUTH(소셜) 로그인

            String email = switch (request.authType()) {
                case OAUTH_NAVER -> oAuthService.getEmailNaver(request.auth_code(), request.redirect_uri(), request.state());
                default -> null;
            };

            User user = userService.getUserByEmail(email);

            // Generate cookie
            if (user != null) {
                JwtService.JwtToken jwtToken = this.jwtService.createToken(user, EXPIRATION_DURATION.toMillis());

                ResponseCookie jwtCookie = ResponseCookie.from("WCA_ACCESS", jwtToken.jwtToken())
                        .httpOnly(true)
                        .secure(true)
                        .path("/")
                        .maxAge(EXPIRATION_DURATION)
                        .sameSite("none")
                        .build();

                ResponseCookie csrfCookie = ResponseCookie.from("WCA_CSRF", jwtToken.csrfToken())
                        .secure(true)
                        .path("/")
                        .maxAge(EXPIRATION_DURATION)
                        .sameSite("none")
                        .build();


                return ResponseEntity.ok()
                        .header(HttpHeaders.SET_COOKIE, jwtCookie.toString())
                        .header(HttpHeaders.SET_COOKIE, csrfCookie.toString())
                        .build();
            }
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
}
