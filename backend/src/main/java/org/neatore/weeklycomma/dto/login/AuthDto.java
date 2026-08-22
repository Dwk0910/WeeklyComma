package org.neatore.weeklycomma.dto.login;

import jakarta.validation.constraints.NotNull;

public class AuthDto {
    public record LoginRequest(
            @NotNull AuthType authType,
            String email,
            String password,
            String auth_code,
            String redirect_uri,
            String state
    ) {}
}
