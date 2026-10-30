package org.neatore.weeklycomma.service;

import org.neatore.weeklycomma.domain.AdminSetting;
import org.neatore.weeklycomma.domain.Book;
import org.neatore.weeklycomma.domain.Post;
import org.neatore.weeklycomma.dto.RecommendationSettingsDto;
import org.neatore.weeklycomma.repository.AdminSettingRepository;
import org.neatore.weeklycomma.repository.BookRepository;
import org.neatore.weeklycomma.repository.PostRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class AdminSettingService {
    private final AdminSettingRepository adminSettingRepository;
    private final RecommendationExpirationService recommendationExpirationService;
    private final BookRepository bookRepository;
    private final PostRepository postRepository;

    public static final Map<String, String> RECOMMENDATION_COURSES = Map.of(
            "low", "초급", "mid", "중급", "high", "상급"
    );

    @Transactional
    public AdminSetting getAdminSetting(String key) {
        recommendationExpirationService.expireRecommendations();
        return adminSettingRepository.getAdminSettingByKey(key);
    }

    @Transactional
    public List<AdminSetting> getAdminSettingsByValue(String value) {
        recommendationExpirationService.expireRecommendations();
        return this.adminSettingRepository.getAdminSettingsByValue(value);
    }

    @Transactional
    public void updateAdminSetting(String key, String value) {
        rejectIndividualRecommendationChange(key);
        recommendationExpirationService.expireRecommendations();
        adminSettingRepository.save(new AdminSetting(key, value));
    }

    @Transactional
    public void deleteAdminSetting(String key) {
        rejectIndividualRecommendationChange(key);
        recommendationExpirationService.expireRecommendations();
        adminSettingRepository.deleteById(key);
    }

    @Transactional
    public void deleteAdminSetting(AdminSetting as) {
        recommendationExpirationService.expireRecommendations();
        String course = courseOf(as.getKey());
        if (course == null) {
            adminSettingRepository.delete(as);
            return;
        }
        adminSettingRepository.deleteById("recommend_isbn_" + course);
        adminSettingRepository.deleteById("recommend_post_" + course);
        AdminSetting mainPick = adminSettingRepository.getAdminSettingByKey("mainPick");
        if (mainPick != null && course.equals(mainPick.getValue())) {
            String replacement = List.of("high", "mid", "low").stream()
                    .filter(other -> !other.equals(course))
                    .filter(other -> adminSettingRepository.getAdminSettingByKey("recommend_isbn_" + other) != null
                            && adminSettingRepository.getAdminSettingByKey("recommend_post_" + other) != null)
                    .findFirst().orElse(null);
            if (replacement == null) adminSettingRepository.delete(mainPick);
            else {
                mainPick.setValue(replacement);
                adminSettingRepository.save(mainPick);
            }
        }
    }

    @Transactional
    public RecommendationSettingsDto getRecommendations() {
        recommendationExpirationService.expireRecommendations();
        List<RecommendationSettingsDto.Selection> selections = new ArrayList<>();
        for (String course : List.of("high", "mid", "low")) {
            AdminSetting isbn = adminSettingRepository.getAdminSettingByKey("recommend_isbn_" + course);
            AdminSetting post = adminSettingRepository.getAdminSettingByKey("recommend_post_" + course);
            if (isbn != null) {
                Long postId = null;
                try {
                    if (post != null) postId = Long.valueOf(post.getValue());
                } catch (NumberFormatException ignored) {
                    // Keep legacy incomplete selections visible so a curator can replace them.
                }
                selections.add(new RecommendationSettingsDto.Selection(course, isbn.getValue(), postId));
            }
        }
        AdminSetting mainPick = adminSettingRepository.getAdminSettingByKey("mainPick");
        return new RecommendationSettingsDto(selections, mainPick == null ? null : mainPick.getValue());
    }

    @Transactional
    public void replaceRecommendations(RecommendationSettingsDto request) {
        if (request == null || request.selections() == null || request.selections().size() > 3) {
            throw invalidSelection("코스별 도서와 추천글을 함께 선택해 주세요.");
        }
        Map<String, String> desired = new HashMap<>();
        for (RecommendationSettingsDto.Selection selection : request.selections()) {
            if (selection == null || selection.course() == null
                    || !RECOMMENDATION_COURSES.containsKey(selection.course())
                    || selection.isbn() == null || selection.isbn().isBlank()
                    || selection.postId() == null || selection.postId() <= 0) {
                throw invalidSelection("코스별 도서와 추천글을 함께 선택해 주세요.");
            }
            if (desired.containsKey("recommend_isbn_" + selection.course())) {
                throw invalidSelection("같은 코스를 중복으로 선택할 수 없습니다.");
            }
            Book book = bookRepository.getBookByIsbn(selection.isbn());
            Post post = postRepository.getPostById(selection.postId());
            if (book == null || !Objects.equals(book.getDifficulty(), RECOMMENDATION_COURSES.get(selection.course()))) {
                throw invalidSelection("선택한 코스에 맞는 등록된 도서를 선택해 주세요.");
            }
            if (post == null || post.getPostType() != Post.PostType.G_RECOMMENDATION
                    || post.getAttribution() == null
                    || !selection.isbn().equals(post.getAttribution().getBookId())) {
                throw invalidSelection("선택한 책에 연결된 추천글을 선택해 주세요.");
            }
            desired.put("recommend_isbn_" + selection.course(), selection.isbn());
            desired.put("recommend_post_" + selection.course(), Long.toString(selection.postId()));
        }
        if (!request.selections().isEmpty()) {
            if (request.mainPick() == null || !desired.containsKey("recommend_isbn_" + request.mainPick())) {
                throw invalidSelection("선정된 코스 중 대표 코스를 선택해 주세요.");
            }
            desired.put("mainPick", request.mainPick());
        } else if (request.mainPick() != null && !request.mainPick().isBlank()) {
            throw invalidSelection("선정된 도서가 없으면 대표 코스를 지정할 수 없습니다.");
        }

        recommendationExpirationService.expireRecommendations();
        adminSettingRepository.deleteAll(adminSettingRepository.findAll().stream()
                .filter(setting -> isRecommendationKey(setting.getKey()) && !desired.containsKey(setting.getKey()))
                .toList());
        desired.forEach((key, value) -> adminSettingRepository.save(new AdminSetting(key, value)));
    }

    private void rejectIndividualRecommendationChange(String key) {
        if (isRecommendationKey(key) || RecommendationExpirationService.WEEK_START_KEY.equals(key)) {
            throw invalidSelection("추천 설정은 도서와 추천글을 함께 저장하는 API를 사용해 주세요.");
        }
    }

    private boolean isRecommendationKey(String key) {
        return key != null && (key.startsWith("recommend_isbn_")
                || key.startsWith("recommend_post_") || key.equals("mainPick"));
    }

    private String courseOf(String key) {
        if (key.startsWith("recommend_isbn_")) return key.substring("recommend_isbn_".length());
        if (key.startsWith("recommend_post_")) return key.substring("recommend_post_".length());
        return null;
    }

    private ResponseStatusException invalidSelection(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
