package org.neatore.weeklycomma.repository;

import org.neatore.weeklycomma.domain.RecommendationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface RecommendationHistoryRepository extends JpaRepository<RecommendationHistory, Long> {
    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE RecommendationHistory h SET h.recommendationPostId = null WHERE h.recommendationPostId = :postId")
    void unlinkPost(@Param("postId") long postId);

    List<RecommendationHistory> findByIsbnInOrderByRecommendationYearDescRecommendationMonthDescRecommendationWeekDescIdDesc(List<String> isbns);
    @Query("""
            SELECT h FROM RecommendationHistory h
            WHERE (:isbn IS NULL OR h.isbn = :isbn)
              AND (:difficulty IS NULL OR h.difficulty = :difficulty)
            ORDER BY h.recommendationYear DESC, h.recommendationMonth DESC,
                     h.recommendationWeek DESC, h.id DESC
            """)
    List<RecommendationHistory> findRecent(@Param("isbn") String isbn,
            @Param("difficulty") String difficulty, Pageable pageable);
}
