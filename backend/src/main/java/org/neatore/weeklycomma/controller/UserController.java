package org.neatore.weeklycomma.controller;

import lombok.RequiredArgsConstructor;

import org.neatore.weeklycomma.dto.login.UserDto;
import org.neatore.weeklycomma.service.UserService;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequiredArgsConstructor
@RequestMapping("/users")
public class UserController {
    private final UserService userService;
    private final org.neatore.weeklycomma.service.LoginThrottleService throttle;

    // Keep unverified local registration closed until the signup/email-verification flow is ready.
    @org.springframework.beans.factory.annotation.Value("${security.local-signup-enabled:false}")
    private boolean localSignupEnabled;

    @PostMapping
    public ResponseEntity<Void> signUp(@Valid @RequestBody UserDto.SignupRequest request, jakarta.servlet.http.HttpServletRequest http) {
        if (request.authType() == org.neatore.weeklycomma.dto.login.AuthType.LOCAL && !localSignupEnabled)
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND);
        long retry = throttle.reserveSignup(http.getRemoteAddr());
        if (retry > 0) throw new org.neatore.weeklycomma.exception.AuthenticationThrottledException(retry);
        userService.addUser(request);
        return ResponseEntity.ok().build();
    }
}
