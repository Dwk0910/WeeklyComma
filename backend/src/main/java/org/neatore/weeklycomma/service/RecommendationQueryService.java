package org.neatore.weeklycomma.service;

import lombok.RequiredArgsConstructor;
import org.neatore.weeklycomma.domain.Book;
import org.neatore.weeklycomma.domain.Post;
import org.neatore.weeklycomma.domain.RecommendationHistory;
import org.neatore.weeklycomma.dto.RecommendationHistoryDto;
import org.neatore.weeklycomma.repository.BookRepository;
import org.neatore.weeklycomma.repository.PostRepository;
import org.neatore.weeklycomma.repository.RecommendationHistoryRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RecommendationQueryService {
    private final AdminSettingService adminSettingService;
    private final RecommendationHistoryRepository historyRepository;
    private final BookRepository bookRepository;
    private final PostRepository postRepository;

    @Transactional
    public List<RecommendationHistoryDto> getRecent(String isbn, String course, int limit) {
        if (limit < 1 || limit > 50 || (course != null && !AdminSettingService.RECOMMENDATION_COURSES.containsKey(course))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "코스와 조회 개수를 확인해 주세요. (1~50개)");
        }
        var current = adminSettingService.getRecommendations();
        LocalDate weekStart = LocalDate.parse(adminSettingService
                .getAdminSetting(RecommendationExpirationService.WEEK_START_KEY).getValue());
        List<RecommendationHistoryDto> result = new ArrayList<>();
        Map<String, Book> books = new HashMap<>();
        Map<Long, Post> posts = new HashMap<>();

        for (var selection : current.selections()) {
            if (isbn != null && !isbn.equals(selection.isbn())) continue;
            if (course != null && !course.equals(selection.course())) continue;
            result.add(toDto(null, weekStart.getYear(), weekStart.getMonthValue(),
                    (weekStart.getDayOfMonth() - 1) / 7 + 1,
                    AdminSettingService.RECOMMENDATION_COURSES.get(selection.course()),
                    selection.isbn(), selection.postId(), true, books, posts));
        }
        String difficulty = course == null ? null : AdminSettingService.RECOMMENDATION_COURSES.get(course);
        for (RecommendationHistory history : historyRepository.findRecent(isbn, difficulty, PageRequest.of(0, limit))) {
            result.add(toDto(history.getId(), history.getRecommendationYear(), history.getRecommendationMonth(),
                    history.getRecommendationWeek(), history.getDifficulty(), history.getIsbn(),
                    history.getRecommendationPostId(), false, books, posts));
        }
        return result.stream().limit(limit).toList();
    }

    private RecommendationHistoryDto toDto(Long id, int year, int month, int week, String difficulty,
            String isbn, Long postId, boolean current, Map<String, Book> books, Map<Long, Post> posts) {
        if (!books.containsKey(isbn)) books.put(isbn, bookRepository.getBookByIsbn(isbn));
        if (postId != null && !posts.containsKey(postId)) posts.put(postId, postRepository.getPostById(postId));
        Book book = books.get(isbn);
        Post post = posts.get(postId);
        boolean valid = post != null && post.isRecommendationFor(isbn);
        return new RecommendationHistoryDto(id, year, month, week, difficulty, isbn, valid ? postId : null,
                valid ? post.getTitle() : null, book == null ? null : book.toDto(), current);
    }
}
