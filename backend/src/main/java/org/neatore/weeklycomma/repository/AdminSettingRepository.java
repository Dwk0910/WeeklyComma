package org.neatore.weeklycomma.repository;

import org.neatore.weeklycomma.domain.AdminSetting;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdminSettingRepository extends JpaRepository<AdminSetting, String> {

}
