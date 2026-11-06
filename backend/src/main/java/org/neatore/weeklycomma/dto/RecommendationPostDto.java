package org.neatore.weeklycomma.dto;

import java.util.List;

public record RecommendationPostDto(
        PostDto.GetResponse post,
        BookDto.BookResponse book,
        long starCount,
        List<Designation> recommendations
) {
    public record Designation(int year, int month, int week, String difficulty,
            Long postId, boolean current) {}
}
