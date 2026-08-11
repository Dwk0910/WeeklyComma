package org.neatore.weeklycomma;

import lombok.RequiredArgsConstructor;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@Component
@EnableJpaAuditing
@SpringBootApplication
public class WeeklyComma {
    public static final Logger LOGGER = LogManager.getLogger(WeeklyComma.class);
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
}