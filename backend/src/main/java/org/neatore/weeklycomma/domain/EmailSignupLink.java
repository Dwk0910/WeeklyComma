package org.neatore.weeklycomma.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "email_signup_link")
public class EmailSignupLink {
    @Id private String tokenHash;
    @Column(nullable = false) private String email;
    private long expiresAt;
    private boolean consumed;
    protected EmailSignupLink() {}
}
