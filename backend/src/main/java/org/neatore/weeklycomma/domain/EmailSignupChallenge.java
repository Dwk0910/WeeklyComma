package org.neatore.weeklycomma.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "email_signup_challenge")
public class EmailSignupChallenge {
    @Id private String id;
    @Column(nullable = false) private String email;
    @Column(nullable = false) private String codeHash;
    private long expiresAt;
    private int attempts;
    protected EmailSignupChallenge() {}
}
