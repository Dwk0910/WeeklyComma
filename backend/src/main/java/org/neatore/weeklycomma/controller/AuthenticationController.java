package org.neatore.weeklycomma.controller;

import org.json.JSONObject;

import org.neatore.weeklycomma.annotations.RequiresAuthentication;
import org.neatore.weeklycomma.dto.login.AuthDto;
import org.neatore.weeklycomma.dto.login.AuthType;

import org.neatore.weeklycomma.domain.User;

import org.neatore.weeklycomma.service.JwtService;
import org.neatore.weeklycomma.service.LoginThrottleService;
import org.neatore.weeklycomma.service.LoginSessionService;
import org.neatore.weeklycomma.exception.AuthenticationThrottledException;
import jakarta.servlet.http.HttpServletRequest;
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

    private final LoginThrottleService throttle;

    private final Duration EXPIRATION_DURATION = LoginSessionService.MAX_AGE;

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
        return ResponseEntity.ok(this.getLSData(new JwtService.JwtToken(accessToken, csrfToken)));
    }

    @PostMapping
    public ResponseEntity<String> login(@Valid @RequestBody AuthDto.LoginRequest request, HttpServletRequest http,
            @CookieValue(value = "WCA_ACCESS", required = false) String previousToken) {
        User user;
        if (request.authType() == AuthType.LOCAL) {
            if (request.email() == null || request.email().isBlank() || request.email().length() > 254
                    || !passwords.valid(request.password()))
                return ResponseEntity.badRequest().build();
            long retry = throttle.reserveLogin(request.email(), http.getRemoteAddr());
            if (retry > 0) throw new AuthenticationThrottledException(retry);
            user = userService.authenticateLocal(request.email(), request.password());
            if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            throttle.succeeded(request.email());
        } else {
            if (request.auth_code() == null || request.auth_code().isBlank() || request.auth_code().length() > 2048
                    || request.state() == null || request.state().isBlank() || request.state().length() > 512
                    || request.redirect_uri() == null || request.redirect_uri().isBlank() || request.redirect_uri().length() > 2048)
                return ResponseEntity.badRequest().build();
            long retry = throttle.reserveOAuth(http.getRemoteAddr());
            if (retry > 0) throw new AuthenticationThrottledException(retry);
            JSONObject profile;
            try {
                profile = oAuthService.getUserProfile(request.authType(), request.auth_code(), request.redirect_uri(), request.state(), request.code_verifier(), request.nonce());
            } catch (org.springframework.web.client.RestClientException ex) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
            }
            if (profile == null || profile.optString("id").isBlank())
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            user = userService.getUserByOauthId(request.authType(), profile.optString("id"));
            if (user == null || user.getAuthType() != request.authType())
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        jwtService.revokeToken(previousToken);
        JwtService.JwtToken jwtToken = jwtService.createToken(user, EXPIRATION_DURATION.toMillis());
        ResponseCookie cookie = ResponseCookie.from("WCA_ACCESS", jwtToken.jwtToken())
                .httpOnly(true).secure(true).path("/").maxAge(EXPIRATION_DURATION).sameSite("None").build();
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString()).body(getLSData(jwtToken));
    }

    @org.springframework.web.bind.annotation.PutMapping("/password")
    @RequiresAuthentication
    public ResponseEntity<Void> changePassword(@CookieValue("WCA_ACCESS") String token,
            @Valid @RequestBody AuthDto.PasswordChangeRequest request, HttpServletRequest http) {
        User user = jwtService.getUser(token);
        long retry = throttle.reserveLogin(user.getEmail(), http.getRemoteAddr());
        if (retry > 0) throw new AuthenticationThrottledException(retry);
        userService.changePassword(user.getId(), request.currentPassword(), request.newPassword());
        throttle.succeeded(user.getEmail());
        return logout(token);
    }

    // Origin + custom-header guard protects this idempotent endpoint, even when the session/CSRF cache has expired.
    @DeleteMapping
    public ResponseEntity<Void> logout(@CookieValue(value = "WCA_ACCESS", required = false) String token) {
        jwtService.revokeToken(token);
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
