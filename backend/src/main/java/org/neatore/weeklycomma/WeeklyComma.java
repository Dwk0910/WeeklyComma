package org.neatore.weeklycomma;

import lombok.RequiredArgsConstructor;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.context.annotation.Bean;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.scheduling.annotation.EnableScheduling;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.Clock;

@Component
@EnableJpaAuditing
@EnableScheduling
@SpringBootApplication
public class WeeklyComma {
    public static final Logger LOGGER = LogManager.getLogger(WeeklyComma.class);
    @Bean
    public Clock recommendationClock() {
        return Clock.system(ZoneId.of("Asia/Seoul"));
    }

    public static void main(String[] args) {
        new SpringApplicationBuilder(WeeklyComma.class).run(args);
    }
}

@RestController
@RequiredArgsConstructor
class Controller {
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }

    @GetMapping("/current-week")
    public ResponseEntity<CurrentWeekResponse> currentWeek() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        int weekOfMonth = (today.getDayOfMonth() - 1) / 7 + 1;

        return ResponseEntity.ok(
                new CurrentWeekResponse(
                        today.getYear(),
                        today.getMonthValue(),
                        weekOfMonth,
                        today.getYear() + "년 " + today.getMonthValue() + "월",
                        weekOfMonth + "주차"
                )
        );
    }

    record CurrentWeekResponse(
            int year,
            int month,
            int week,
            String monthLabel,
            String weekLabel
    ) {}
}
