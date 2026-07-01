package org.neatore.weeklycomma;

import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.service.UserService;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;

import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Path;
import java.util.Objects;
import java.util.TimeZone;

@Component
@EnableJpaAuditing
@SpringBootApplication
public class WeeklyComma {
    public static final Logger LOGGER = LogManager.getLogger(WeeklyComma.class);

    @PostConstruct
    public void init() {
        // Set timezone to UTC(+0) (for DB)
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    }

    public static void main(String[] args) {
        Path propertiesPath = Path.of(System.getProperty("user.dir"), "weeklycomma.properties");
        if (!propertiesPath.toFile().exists()) {
            LOGGER.fatal("weeklycomma.properties not found. Please create the file with the required configuration.");
            LOGGER.fatal("The properties file should be located at {}", propertiesPath.toString());
            System.exit(-1);
        }

        new SpringApplicationBuilder(WeeklyComma.class)
                .properties("spring.config.import=optional:file:" + propertiesPath)
                .run(args);
    }
}

@RestController
@RequiredArgsConstructor
class Controller {
    private final UserService us;

    @GetMapping("/health")
    public ResponseEntity<String> health(@CookieValue(name = "WCA_LOGIN", required = false) String sessionId) {
        if (sessionId != null && us.hasToken(sessionId)) {
            User user = us.getUserByToken(sessionId);
            if (Objects.requireNonNull(user).getUserType() == User.UserType.CURATOR) return ResponseEntity.ok("OK_ADMIN");
            else return ResponseEntity.ok("OK_LOGIN");
        }

        return ResponseEntity.ok("OK");
    }
}