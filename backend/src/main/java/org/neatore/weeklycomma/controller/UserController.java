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

    // Local signup is exclusively handled by /users/email/complete after email verification.
    @PostMapping
    public ResponseEntity<Void> signUp(@Valid @RequestBody UserDto.SignupRequest request, jakarta.servlet.http.HttpServletRequest http) {
        if (request.authType() == org.neatore.weeklycomma.dto.login.AuthType.LOCAL)
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND);
        long retry = throttle.reserveSignup(http.getRemoteAddr());
        if (retry > 0) throw new org.neatore.weeklycomma.exception.AuthenticationThrottledException(retry);
        userService.addUser(request);
        return ResponseEntity.ok().build();
    }
}
