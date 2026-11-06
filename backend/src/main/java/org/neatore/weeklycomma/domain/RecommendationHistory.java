package org.neatore.weeklycomma.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RecommendationHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int recommendationYear;
    private int recommendationMonth;
    private int recommendationWeek;
    private String difficulty;
    private String isbn;

    private Long recommendationPostId;

    public RecommendationHistory(
            int recommendationYear,
            int recommendationMonth,
            int recommendationWeek,
            String difficulty,
            String isbn,
            Long recommendationPostId
    ) {
        this.recommendationYear = recommendationYear;
        this.recommendationMonth = recommendationMonth;
        this.recommendationWeek = recommendationWeek;
        this.difficulty = difficulty;
        this.isbn = isbn;
        this.recommendationPostId = recommendationPostId;
    }
}
