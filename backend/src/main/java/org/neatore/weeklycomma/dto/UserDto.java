package org.neatore.weeklycomma.dto;

import jakarta.validation.constraints.NotBlank;

public class UserDto {
    public record LoginRequest(@NotBlank String email, @NotBlank String password) {}
    public record NaverOAuthRequest(@NotBlank String auth_code, @NotBlank String redirect_uri, @NotBlank String state) {}
}
