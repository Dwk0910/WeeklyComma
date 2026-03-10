package org.neatore.weeklycomma.domain;

import jakarta.persistence.Id;
import jakarta.persistence.Entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Entity
@AllArgsConstructor @Getter
public class AdminSetting {
    public AdminSetting() {}

    @Id
    private String key;

    @Setter
    private String value;
}
