package org.neatore.weeklycomma.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import jakarta.annotation.Nullable;
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

    @Value("${JWT_TOKEN_SECRET}")
    private String SECRET_KEY;

    private SecretKey secretKey;

    @PostConstruct
    protected void init() {
        this.secretKey = Keys.hmacShaKeyFor(SECRET_KEY.getBytes(StandardCharsets.UTF_8));
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(this.secretKey)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private Claims getPayload(String token) {
        return Jwts.parser()
                .verifyWith(this.secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String createToken(User user) {
        return this.createToken(user.getId(), user.getUserType().toString());
    }

    public String createToken(UUID userId, String role) {
        final long EXP_TIME = 1000 * 60 * 60; // 1 hour

        return Jwts.builder()
                .subject(userId.toString())
                .claim("role", role)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + EXP_TIME))
                .signWith(this.secretKey)
                .compact();
    }

    public @Nullable User getUser(String token) {
        return userService.getUserById(
            UUID.fromString(this.getPayload(token).getSubject())
        );
    }
}
