package org.neatore.weeklycomma.controller;

import lombok.RequiredArgsConstructor;
import org.neatore.weeklycomma.annotations.RequiresAuthentication;
import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.dto.RecommendationHistoryDto;
import org.neatore.weeklycomma.service.RecommendationQueryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/recommendation-history")
public class RecommendationHistoryController {
    private final RecommendationQueryService recommendationQueryService;

    @GetMapping
    @RequiresAuthentication(User.UserType.CURATOR)
    public List<RecommendationHistoryDto> getRecent(
            @RequestParam(required = false) String isbn,
            @RequestParam(required = false) String course,
            @RequestParam(defaultValue = "12") int limit
    ) {
        return recommendationQueryService.getRecent(isbn, course, limit);
    }
}
