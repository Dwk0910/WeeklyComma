package org.neatore.weeklycomma.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import jakarta.annotation.PostConstruct;

import lombok.RequiredArgsConstructor;

import org.neatore.weeklycomma.domain.User;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JwtService {
    private final UserService userService;
    private final LoginSessionService sessions;

    @Value("${JWT_TOKEN_SECRET}")
    private String SECRET_KEY;

    private SecretKey secretKey;

    @PostConstruct
    protected void init() {
        this.secretKey = Keys.hmacShaKeyFor(SECRET_KEY.getBytes(StandardCharsets.UTF_8));
    }

    public record JwtToken(String jwtToken, String csrfToken) {}

    public boolean validateToken(String token) {
        try {
            Claims claims = getPayload(token);
            UUID userId = UUID.fromString(claims.getSubject());
            User user = userService.getUserById(userId);
            return user != null && java.util.Objects.equals(user.getAuthVersion(), claims.get("auth_version", String.class))
                    && sessions.isActive(token, userId);
        } catch (io.jsonwebtoken.JwtException | IllegalArgumentException | org.neatore.weeklycomma.exception.UserNotFoundException e) {
            return false;
        }
    }

    private Claims getPayload(String token) {
        return Jwts.parser()
                .verifyWith(this.secretKey)
                .requireIssuer("weeklycomma")
                .clock(() -> new Date(sessions.now()))
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public JwtToken createToken(User user, long exp) {
        UUID csrfToken = UUID.randomUUID();

        long now = sessions.now();
        long expiresAt = now + Math.min(exp, LoginSessionService.MAX_AGE.toMillis());
        String token = Jwts.builder()
                .issuer("weeklycomma").id(UUID.randomUUID().toString())
                .subject(user.getId().toString()).claim("role", user.getUserType().name()).claim("csrf_token", csrfToken.toString())
                .claim("auth_version", user.getAuthVersion())
                .issuedAt(new Date(now)).expiration(new Date(expiresAt))
                .signWith(secretKey).compact();
        sessions.register(token, user.getId(), expiresAt);
        return new JwtToken(token, csrfToken.toString());
    }

    public void revokeToken(String token) { sessions.revoke(token); }

    public String getCsrfToken(String token) {
        return this.getPayload(token).get("csrf_token").toString();
    }

    public User.UserType getUserType(String token) {
        return this.getUser(token).getUserType();
    }

    public User getUser(String token) {
        return userService.getUserById(
            UUID.fromString(this.getPayload(token).getSubject())
        );
    }
}
