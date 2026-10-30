package org.neatore.weeklycomma.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RecommendationSettingsDto(
        @NotNull @Size(max = 3) List<@NotNull @Valid Selection> selections,
        String mainPick
) {
    public record Selection(
            @NotBlank @Pattern(regexp = "low|mid|high") String course,
            @NotBlank String isbn,
            @NotNull @Positive Long postId
    ) {}
}
