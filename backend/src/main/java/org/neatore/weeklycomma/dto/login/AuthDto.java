package org.neatore.weeklycomma.dto.login;

import jakarta.validation.constraints.NotNull;

public class AuthDto {
    public record PasswordChangeRequest(
            @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 256) String currentPassword,
            @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 256) String newPassword
    ) {}
    public record LoginRequest(
            @NotNull AuthType authType,
            String email,
            String password,
            String auth_code,
            String redirect_uri,
            String state
    ) {}
}
