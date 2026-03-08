package org.neatore.weeklycomma;

import org.neatore.weeklycomma.service.UserVerifyService;

import jakarta.annotation.PostConstruct;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.http.ResponseEntity;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Path;
import java.util.Set;

@Component
@SpringBootApplication
public class WeeklyComma {
    public static final Logger LOGGER = LogManager.getLogger(WeeklyComma.class);
    public static Set<String> ALLOWED_EMAILS = null;

    @Value("${allowed_emails}")
    private Set<String> allowedEmailsValue;

    @PostConstruct
    public void init() {
        ALLOWED_EMAILS = allowedEmailsValue;
    }

    public static void main(String[] args) {
        Path path = Path.of(System.getProperty("user.dir"), "weeklycomma.properties");
        if (!path.toFile().exists()) {
            LOGGER.fatal("weeklycomma.properties not found. Please create the file with the required configuration.");
            LOGGER.fatal("The properties file should be located at {}", path.toString());
            System.exit(-1);
        }

        new SpringApplicationBuilder(WeeklyComma.class)
                .properties("spring.config.import=optional:file:" + path)
                .run(args);
    }
}

@RestController
class Controller {
    private final UserVerifyService uvs;

    public Controller(UserVerifyService uvs) {
        this.uvs = uvs;
    }

    @GetMapping("/health")
    public ResponseEntity<String> health(@RequestHeader(name = "X-Client-Session-ID", required = false) String sessionId) {
        return uvs.verify(sessionId) ? ResponseEntity.ok("OK_LOGIN") : ResponseEntity.ok("OK");
    }
}