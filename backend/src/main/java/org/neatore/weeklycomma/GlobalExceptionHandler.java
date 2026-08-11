package org.neatore.weeklycomma;

import io.jsonwebtoken.JwtException;

import org.neatore.weeklycomma.exception.PostNotFoundException;
import org.neatore.weeklycomma.exception.UserNotFoundException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler({ UserNotFoundException.class, PostNotFoundException.class })
    public ResponseEntity<Void> handlerUserNotFoundException() {
        return ResponseEntity.notFound().build();
    }

    @ExceptionHandler(JwtException.class)
    public ResponseEntity<Void> handlerJwtException() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
}
