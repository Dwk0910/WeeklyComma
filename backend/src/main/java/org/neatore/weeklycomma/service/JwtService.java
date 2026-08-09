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
            Claims claims = Jwts.parser()
                    .verifyWith(this.secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            User user = this.userService.getUserById(UUID.fromString(claims.getSubject()));
            return user != null;
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

    public JwtToken createToken(User user, long exp) {
        return this.createToken(user.getId(), user.getUserType().toString(), exp);
    }

    public JwtToken createToken(UUID userId, String role, long exp) {
        UUID csrfToken = UUID.randomUUID();

        return new JwtToken(
                Jwts.builder()
                        .subject(userId.toString())
                        .claim("role", role)
                        .claim("csrf_token", csrfToken.toString())
                        .issuedAt(new Date())
                        .expiration(new Date(System.currentTimeMillis() + exp))
                        .signWith(this.secretKey)
                        .compact(),
                csrfToken.toString()
        );
    }

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
