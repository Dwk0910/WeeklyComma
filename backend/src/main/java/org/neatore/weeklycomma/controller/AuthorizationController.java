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
public class AuthorizationController {
    private final AuthService authService;
    private final UserVerifyService uvs;

    public AuthorizationController(AuthService authService, UserVerifyService uvs) {
        this.authService = authService;
        this.uvs = uvs;
    }

    @PostMapping("/getToken")
    public ResponseEntity<String> getToken(@RequestBody Map<String, Object> param) {
        if (authService.authorize(param.getOrDefault("auth_code", "").toString(), param.getOrDefault("redirect_uri", "").toString())) return ResponseEntity.ok(uvs.addSession());
        else return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
}
