package org.neatore.weeklycomma.dto;

public record RecommendationHistoryDto(
        Long id,
        int recommendationYear,
        int recommendationMonth,
        int recommendationWeek,
        String difficulty,
        String isbn,
        Long recommendationPostId,
        String recommendationPostTitle,
        BookDto.BookResponse book,
        boolean current
) {}
