package org.neatore.weeklycomma.controller;

import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.dto.AdminSettingDto;
import org.neatore.weeklycomma.service.AdminSettingService;
import org.neatore.weeklycomma.annotations.RequiresAuthentication;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.http.ResponseEntity;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequiresAuthentication(User.UserType.CURATOR)
@RequestMapping("/adminsettings")
public class AdminSettingController {
    private final AdminSettingService adminSettingService;

    @GetMapping
    public ResponseEntity<String> getAdminSetting(@RequestParam String key) {
        return ResponseEntity.ok(adminSettingService.getAdminSetting(key).getValue());
    }

    @PutMapping
    public ResponseEntity<?> setAdminSetting(@Valid @RequestBody AdminSettingDto adminSetting) {
        adminSettingService.updateAdminSetting(adminSetting.key(), adminSetting.value());
        return ResponseEntity.ok().build();
    }
}
