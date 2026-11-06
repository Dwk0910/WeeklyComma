package org.neatore.weeklycomma.service;

import lombok.RequiredArgsConstructor;
import org.neatore.weeklycomma.WeeklyComma;
import org.neatore.weeklycomma.domain.AdminSetting;
import org.neatore.weeklycomma.repository.AdminSettingRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecommendationExpirationService {
    // The period of the current selections, independent of post creation dates.
    static final String WEEK_START_KEY = "recommendationWeekStart";
    private static final Map<String, String> COURSES = Map.of(
            "low", "초급", "mid", "중급", "high", "상급"
    );

    private final AdminSettingRepository adminSettingRepository;
    private final RecommendationHistoryService recommendationHistoryService;
    private final Clock recommendationClock;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void expireRecommendationsOnStartup() {
        expireRecommendations();
    }

    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Seoul")
    @Transactional
    public void expireRecommendations() {
        LocalDate today = LocalDate.now(recommendationClock);
        LocalDate currentWeekStart = today.withDayOfMonth((today.getDayOfMonth() - 1) / 7 * 7 + 1);
        AdminSetting period = adminSettingRepository.getAdminSettingByKey(WEEK_START_KEY);

        // On the first run, existing selections belong to the current period.
        if (period == null) {
            adminSettingRepository.save(new AdminSetting(WEEK_START_KEY, currentWeekStart.toString()));
            return;
        }

        LocalDate previousWeekStart = LocalDate.parse(period.getValue());
        if (!previousWeekStart.isBefore(currentWeekStart)) return;

        List<AdminSetting> settings = adminSettingRepository.findAll();
        Map<String, AdminSetting> settingsByKey = settings.stream()
                .collect(Collectors.toMap(AdminSetting::getKey, Function.identity()));

        COURSES.forEach((course, label) -> {
            String isbn = valueOf(settingsByKey, "recommend_isbn_" + course);
            if (isbn == null || isbn.isBlank()) return;

            recommendationHistoryService.archive(
                    previousWeekStart.getYear(),
                    previousWeekStart.getMonthValue(),
                    (previousWeekStart.getDayOfMonth() - 1) / 7 + 1,
                    label,
                    isbn,
                    postIdOf(valueOf(settingsByKey, "recommend_post_" + course))
            );
        });

        // History, selection cleanup and the period advance commit together.
        adminSettingRepository.deleteAll(settings.stream()
                .filter(setting -> setting.getKey().startsWith("recommend_isbn_")
                        || setting.getKey().startsWith("recommend_post_")
                        || setting.getKey().equals("mainPick"))
                .toList());
        period.setValue(currentWeekStart.toString());
        adminSettingRepository.save(period);
    }

    private String valueOf(Map<String, AdminSetting> settings, String key) {
        AdminSetting setting = settings.get(key);
        return setting == null ? null : setting.getValue();
    }

    private Long postIdOf(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException e) {
            WeeklyComma.LOGGER.warn("Archiving recommendation without invalid post ID: {}", value);
            return null;
        }
    }
}
