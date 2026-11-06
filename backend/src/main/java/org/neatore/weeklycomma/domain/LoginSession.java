package org.neatore.weeklycomma.domain;

import jakarta.persistence.*;
import lombok.Getter;
import java.util.UUID;

@Entity
@Table(name = "login_session", indexes = {@Index(columnList = "user_id"), @Index(columnList = "expires_at"), @Index(columnList = "last_seen")})
@Getter
public class LoginSession {
    protected LoginSession() {}
    public LoginSession(String tokenHash, UUID userId, long expiresAt, long lastSeen) {
        this.tokenHash = tokenHash; this.userId = userId; this.expiresAt = expiresAt; this.lastSeen = lastSeen;
    }
    @Id @Column(name = "token_hash", length = 64) private String tokenHash;
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(name = "expires_at", nullable = false) private long expiresAt;
    @Column(name = "last_seen", nullable = false) private long lastSeen;
}
