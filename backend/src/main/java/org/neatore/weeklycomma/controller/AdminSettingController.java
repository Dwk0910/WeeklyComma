package org.neatore.weeklycomma.controller;

import org.neatore.weeklycomma.annotations.RequiresAuthorization;
import org.neatore.weeklycomma.service.AdminSettingService;
import org.neatore.weeklycomma.domain.AdminSetting;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.http.ResponseEntity;

import lombok.RequiredArgsConstructor;

@RestController
@RequiresAuthorization
@RequiredArgsConstructor
@RequestMapping("/adminsettings")
public class AdminSettingController {
    private final AdminSettingService adminSettingService;

    @PostMapping
    public ResponseEntity<?> setWeeklyBook(@Valid @RequestBody AdminSetting adminSetting) {
        adminSettingService.updateAdminSetting(adminSetting.getKey(), adminSetting.getValue());
    }
}
