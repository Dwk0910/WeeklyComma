package org.neatore.weeklycomma.dto.login;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class UserDto {
    public record SignupRequest(
            @NotNull AuthType authType,
            @NotBlank String userName,
            String email,
            String password,
            String auth_code,
            String redirect_uri,
            String state
    ) {}
}
