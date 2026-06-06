package org.neatore.weeklycomma.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminSettingDto(
        @NotBlank String key,
        @NotBlank String value
) {
}
