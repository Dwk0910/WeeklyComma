package org.neatore.weeklycomma.service;

import org.neatore.weeklycomma.domain.AdminSetting;
import org.neatore.weeklycomma.repository.AdminSettingRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminSettingService {
    private final AdminSettingRepository adminSettingRepository;

    public AdminSetting getAdminSetting(String key) {
        return adminSettingRepository.getAdminSettingByKey(key);
    }

    @Transactional
    public void updateAdminSetting(String key, String value) {
        adminSettingRepository.save(new AdminSetting(key, value));
    }
}
