package org.neatore.weeklycomma;

import io.jsonwebtoken.JwtException;

import org.neatore.weeklycomma.exception.PostNotFoundException;
import org.neatore.weeklycomma.exception.UserNotFoundException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handlerResponseStatusException(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode())
                .headers(exception.getHeaders())
                .body(Map.of("message", exception.getReason() == null ? "요청을 처리할 수 없습니다." : exception.getReason()));
    }

    @ExceptionHandler({ UserNotFoundException.class, PostNotFoundException.class })
    public ResponseEntity<Void> handlerUserNotFoundException() {
        return ResponseEntity.notFound().build();
    }

    @ExceptionHandler(JwtException.class)
    public ResponseEntity<Void> handlerJwtException() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
}
