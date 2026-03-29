package org.neatore.weeklycomma.controller;

import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.dto.AdminSettingDto;
import org.neatore.weeklycomma.service.AdminSettingService;
import org.neatore.weeklycomma.annotations.RequiresAuthentication;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.http.ResponseEntity;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequiresAuthentication(User.UserType.CURATOR)
@RequestMapping("/admin")
public class AdminSettingController {
    private final AdminSettingService adminSettingService;

    @PostMapping
    public ResponseEntity<?> setWeeklyBook(@Valid @RequestBody AdminSettingDto adminSetting) {
        adminSettingService.updateAdminSetting(adminSetting.key(), adminSetting.value());
        return ResponseEntity.ok().build();
    }
}
