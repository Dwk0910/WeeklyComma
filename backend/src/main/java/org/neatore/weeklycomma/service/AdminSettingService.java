package org.neatore.weeklycomma.service;

import org.neatore.weeklycomma.domain.AdminSetting;
import org.neatore.weeklycomma.repository.AdminSettingRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminSettingService {
    private final AdminSettingRepository adminSettingRepository;

    public AdminSetting getAdminSetting(String key) {
        return adminSettingRepository.getAdminSettingByKey(key);
    }

    public List<AdminSetting> getAdminSettingsByValue(String value) {
        return this.adminSettingRepository.getAdminSettingsByValue(value);
    }

    @Transactional
    public void updateAdminSetting(String key, String value) {
        adminSettingRepository.save(new AdminSetting(key, value));
    }

    @Transactional
    public void deleteAdminSetting(String key) {
        adminSettingRepository.deleteById(key);
    }

    @Transactional
    public void deleteAdminSetting(AdminSetting as) {
        adminSettingRepository.delete(as);
    }
}
