package org.neatore.weeklycomma.dto.login;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class UserDto {
    public record SignupRequest(
            @NotNull AuthType authType,
            @NotBlank @jakarta.validation.constraints.Size(max = 80) String userName,
            @jakarta.validation.constraints.Size(max = 254) String email,
            @jakarta.validation.constraints.Size(max = 256) String password,
            @jakarta.validation.constraints.Size(max = 2048) String auth_code,
            @jakarta.validation.constraints.Size(max = 2048) String redirect_uri,
            @jakarta.validation.constraints.Size(max = 512) String state,
            @jakarta.validation.constraints.Size(max = 128) String code_verifier,
            @jakarta.validation.constraints.Size(max = 128) String nonce
    ) {
        public SignupRequest(AuthType authType, String userName, String email, String password, String auth_code, String redirect_uri, String state) {
            this(authType, userName, email, password, auth_code, redirect_uri, state, null, null);
        }
    }
}
