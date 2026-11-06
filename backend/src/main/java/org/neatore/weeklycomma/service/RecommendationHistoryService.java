package org.neatore.weeklycomma.service;

import org.neatore.weeklycomma.domain.RecommendationHistory;
import org.neatore.weeklycomma.repository.RecommendationHistoryRepository;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RecommendationHistoryService {
    private final RecommendationHistoryRepository recommendationHistoryRepository;

    public void archive(
            int year,
            int month,
            int week,
            String difficulty,
            String isbn,
            Long recommendationPostId
    ) {
        recommendationHistoryRepository.save(new RecommendationHistory(
                year,
                month,
                week,
                difficulty,
                isbn,
                recommendationPostId
        ));
    }
}
