package org.neatore.weeklycomma.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AccessLevel;
import org.neatore.weeklycomma.domain.abs.BaseTimeEntity;
import java.time.Instant;
import java.util.UUID;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(indexes = @Index(name = "inquiry_owner_index", columnList = "owner_id"))
public class Inquiry extends BaseTimeEntity {
    public enum Category { BUG, SUGGESTION, OTHER }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;
    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;
    @Column(nullable = false)
    private String authorName;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private Category category;
    @Column(nullable = false, length = 150)
    private String title;
    @Lob @Column(nullable = false)
    private String content;
    @Lob
    private String answer;
    private Instant answeredAt;

    public Inquiry(User owner, Category category, String title, String content) {
        this.ownerId = owner.getId();
        this.authorName = owner.getUserName();
        this.category = category;
        this.title = title;
        this.content = content;
    }

    public void answer(String text) { this.answer = text; this.answeredAt = Instant.now(); }
}
