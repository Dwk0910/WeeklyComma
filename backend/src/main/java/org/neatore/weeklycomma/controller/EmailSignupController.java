package org.neatore.weeklycomma.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.neatore.weeklycomma.service.*;
import org.neatore.weeklycomma.exception.AuthenticationThrottledException;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/users/email")
@RequiredArgsConstructor
public class EmailSignupController {
    private final EmailSignupService signup;
    private final LoginThrottleService throttle;
    @org.springframework.beans.factory.annotation.Value("${signup.mail.enabled:false}")
    private boolean enabled;
    public record Start(@NotBlank @Size(max=254) @Email String email) {}
    public record Inspect(@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{43}") String token) {}
    public record Complete(@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{43}") String token,
                           @NotBlank @Size(max=80) String userName,
                           @NotBlank @Size(max=256) String password) {}
    private void check() {
        if (!enabled) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "이메일 회원가입을 준비 중입니다.");
    }
    private void limit(long retry) { if (retry > 0) throw new AuthenticationThrottledException(retry); }
    @PostMapping("/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void request(@Valid @RequestBody Start request, HttpServletRequest http) {
        check();
        limit(throttle.reserveSignup(http.getRemoteAddr()));
        limit(throttle.reserveSignupEmail(request.email()));
        signup.request(request.email());
    }
    @PostMapping("/inspect")
    public EmailSignupService.Result inspect(@Valid @RequestBody Inspect request, HttpServletRequest http) {
        check();
        limit(throttle.reserveVerification(http.getRemoteAddr()));
        return signup.inspect(request.token());
    }
    @PostMapping("/complete")
    public EmailSignupService.Result complete(@Valid @RequestBody Complete request, HttpServletRequest http) {
        check();
        limit(throttle.reserveVerification(http.getRemoteAddr()));
        return signup.complete(request.token(), request.userName(), request.password());
    }
}
