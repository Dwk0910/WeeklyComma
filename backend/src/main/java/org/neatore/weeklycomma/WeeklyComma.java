package org.neatore.weeklycomma;

import org.neatore.weeklycomma.service.UserService;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;

import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Path;
import java.util.Set;
import java.util.TimeZone;

@Component
@SpringBootApplication
public class WeeklyComma {
    public static final Logger LOGGER = LogManager.getLogger(WeeklyComma.class);
    public static Set<String> ALLOWED_EMAILS = null;

    @Value("${allowed_emails}")
    private Set<String> allowedEmailsValue;

    @PostConstruct
    public void init() {
        // Insert allowed emails value into static variable
        ALLOWED_EMAILS = allowedEmailsValue;

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
        return (sessionId != null && us.hasToken(sessionId)) ? ResponseEntity.ok("OK_LOGIN") : ResponseEntity.ok("OK");
    }
}