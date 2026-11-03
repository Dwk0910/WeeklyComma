package org.neatore.weeklycomma.service;

import lombok.RequiredArgsConstructor;
import org.neatore.weeklycomma.domain.Post;
import org.neatore.weeklycomma.dto.RecommendationPostDto;
import org.neatore.weeklycomma.dto.RecommendationPostDto.Designation;
import org.neatore.weeklycomma.repository.BookRepository;
import org.neatore.weeklycomma.repository.BookStarRepository;
import org.neatore.weeklycomma.repository.PostRepository;
import org.neatore.weeklycomma.repository.RecommendationHistoryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecommendationBoardService {
    private static final List<Post.PostType> TYPES = List.of(Post.PostType.G_RECOMMENDATION, Post.PostType.W_RECOMMENDATION);
    private final PostRepository posts;
    private final BookRepository books;
    private final BookStarRepository stars;
    private final RecommendationHistoryRepository history;
    private final AdminSettingService settings;

    @Transactional
    public List<RecommendationPostDto> getAll() {
        return enrich(posts.findByPostTypeInOrderByCreatedAtDescIdDesc(TYPES));
    }

    @Transactional
    public RecommendationPostDto get(long id) {
        Post post = posts.getPostById(id);
        if (post == null || !TYPES.contains(post.getPostType())) throw missing();
        return enrich(List.of(post)).stream().findFirst().orElseThrow(RecommendationBoardService::missing);
    }

    private static ResponseStatusException missing() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "추천글을 찾을 수 없습니다.");
    }

    private List<RecommendationPostDto> enrich(List<Post> source) {
        var isbns = source.stream().map(Post::getAttribution).filter(Objects::nonNull)
                .map(Post.Attribution::getBookId).filter(Objects::nonNull).distinct().toList();
        if (isbns.isEmpty()) return List.of();
        // Resolve rollover before reading history, so the two sources describe the same period.
        var current = settings.getRecommendations();
        var weekStart = LocalDate.parse(settings.getAdminSetting(RecommendationExpirationService.WEEK_START_KEY).getValue());
        var bookMap = books.findByIsbnIn(isbns).stream().collect(Collectors.toMap(b -> b.getIsbn(), Function.identity()));
        var counts = stars.countForIsbns(isbns).stream().collect(Collectors.toMap(BookStarRepository.CountByIsbn::getIsbn, BookStarRepository.CountByIsbn::getStarCount));
        Map<String, List<Designation>> designations = new HashMap<>();
        for (var selection : current.selections()) {
            if (!bookMap.containsKey(selection.isbn())) continue;
            designations.computeIfAbsent(selection.isbn(), key -> new ArrayList<>()).add(new Designation(
                    weekStart.getYear(), weekStart.getMonthValue(), (weekStart.getDayOfMonth() - 1) / 7 + 1,
                    AdminSettingService.RECOMMENDATION_COURSES.get(selection.course()), selection.postId(), true));
        }
        Map<Long, Post> historyPosts = new HashMap<>();
        for (var item : history.findByIsbnInOrderByRecommendationYearDescRecommendationMonthDescRecommendationWeekDescIdDesc(isbns)) {
            designations.computeIfAbsent(item.getIsbn(), key -> new ArrayList<>()).add(new Designation(
                    item.getRecommendationYear(), item.getRecommendationMonth(), item.getRecommendationWeek(),
                    item.getDifficulty(), validHistoryPost(item.getIsbn(), item.getRecommendationPostId(), historyPosts), false));
        }
        var newestFirst = Comparator.comparingInt(Designation::year).thenComparingInt(Designation::month)
                .thenComparingInt(Designation::week).reversed();
        designations.values().forEach(items -> items.sort(newestFirst));
        List<RecommendationPostDto> result = new ArrayList<>();
        for (Post post : source) {
            if (post.getAttribution() == null) continue;
            var book = bookMap.get(post.getAttribution().getBookId());
            // A deleted book must not leave a broken public recommendation card.
            if (book == null) continue;
            result.add(new RecommendationPostDto(post.toQueryDto(), book.toDto(), counts.getOrDefault(book.getIsbn(), 0L),
                    List.copyOf(designations.getOrDefault(book.getIsbn(), List.of()))));
        }
        return result;
    }
    private Long validHistoryPost(String isbn, Long id, Map<Long, Post> cache) {
        if (id == null) return null;
        if (!cache.containsKey(id)) cache.put(id, posts.getPostById(id));
        Post post = cache.get(id);
        return post != null && post.isRecommendationFor(isbn) ? id : null;
    }

}
