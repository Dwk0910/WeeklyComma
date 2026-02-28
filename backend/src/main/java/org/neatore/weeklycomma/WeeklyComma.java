package org.neatore.weeklycomma;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;

@SpringBootApplication
public class WeeklyComma {
    public static void main(String[] args) {
        SpringApplication.run(WeeklyComma.class, args);
    }
}

@CrossOrigin(origins = { "http://localhost:5173" })
@RestController
class SysController {
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }
}