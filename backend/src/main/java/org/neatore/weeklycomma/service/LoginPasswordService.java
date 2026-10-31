package org.neatore.weeklycomma.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;

@Service
public class LoginPasswordService {
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final String dummyHash = encoder.encode("unused-account-timing-placeholder");

    public boolean valid(String password) {
        return password != null && !password.isBlank()
                && password.length() <= 72 && password.getBytes(StandardCharsets.UTF_8).length <= 72;
    }

    public String encode(String password) {
        if (!valid(password)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        return encoder.encode(password);
    }

    public boolean matches(String password, String encoded) {
        if (!valid(password)) return false;
        boolean supported = encoded != null && encoded.matches("\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}");
        boolean matches = encoder.matches(password, supported ? encoded : dummyHash);
        return supported && matches;
    }
}
