package org.neatore.weeklycomma.dto;

import org.apache.logging.log4j.core.config.plugins.validation.constraints.NotBlank;

public record AdminSettingDto(
        @NotBlank String key,
        @NotBlank String value
) {
}
