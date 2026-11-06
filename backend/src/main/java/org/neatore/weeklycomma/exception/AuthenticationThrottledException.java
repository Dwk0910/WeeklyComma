package org.neatore.weeklycomma.exception;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public class AuthenticationThrottledException extends ResponseStatusException {
    private final long seconds;
    public AuthenticationThrottledException(long seconds) {
        super(HttpStatus.TOO_MANY_REQUESTS, "잠시 후 다시 시도해 주세요.");
        this.seconds = Math.max(1, seconds);
    }
    @Override public HttpHeaders getHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.RETRY_AFTER, Long.toString(seconds));
        return headers;
    }
}
