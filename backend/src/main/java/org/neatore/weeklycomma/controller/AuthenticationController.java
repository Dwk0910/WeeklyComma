package org.neatore.weeklycomma.controller;

import org.neatore.weeklycomma.service.AuthService;
import org.neatore.weeklycomma.service.UserVerifyService;

import org.springframework.http.HttpStatus;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthenticationController {
    private final AuthService authService;
    private final UserVerifyService uvs;

    public AuthenticationController(AuthService authService, UserVerifyService uvs) {
        this.authService = authService;
        this.uvs = uvs;
    }

    @PostMapping("/addSession")
    public ResponseEntity<String> getToken(@RequestBody Map<String, Object> param) {
        String redirect_uri = param.getOrDefault("redirect_uri", "").toString();
        String auth_code = param.getOrDefault("auth_code", "").toString();
        String state = param.getOrDefault("state", "").toString();

        if (authService.authorize(auth_code, redirect_uri, state)) return ResponseEntity.ok(uvs.addSession());
        else return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
}
