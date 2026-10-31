package org.neatore.weeklycomma.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "login_throttle", indexes = @Index(columnList = "resets_at"))
public class LoginThrottle {
    @Id @Column(name = "bucket_key", length = 64) private String bucketKey;
    @Column(name = "attempts", nullable = false) private int attempts;
    @Column(name = "resets_at", nullable = false) private long resetsAt;
}
