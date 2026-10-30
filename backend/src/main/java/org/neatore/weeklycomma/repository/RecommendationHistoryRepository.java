package org.neatore.weeklycomma.repository;

import org.neatore.weeklycomma.domain.RecommendationHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecommendationHistoryRepository extends JpaRepository<RecommendationHistory, Long> {
}
