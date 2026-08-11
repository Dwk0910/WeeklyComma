package org.neatore.weeklycomma.repository;

import org.neatore.weeklycomma.domain.AdminSetting;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AdminSettingRepository extends JpaRepository<AdminSetting, String> {
    AdminSetting getAdminSettingByKey(String key);
    List<AdminSetting> getAdminSettingsByValue(String value);
}
