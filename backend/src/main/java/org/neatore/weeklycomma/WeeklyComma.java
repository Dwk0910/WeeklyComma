package org.neatore.weeklycomma;

import org.springframework.http.ResponseEntity;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
public class WeeklyComma {
    public static void main(String[] args) {
        SpringApplication.run(WeeklyComma.class, args);
    }
}

@RestController
class Controller {
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }
}