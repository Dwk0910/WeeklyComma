package org.neatore.weeklycomma.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.util.Arrays;
import java.util.List;

@Component
public class BrowserOrigins {
    private final List<String> origins;
    public BrowserOrigins(@Value("${security.allowed-origins:http://localhost:5173,https://www.weeklycomma.kro.kr}") String configured) {
        origins = Arrays.stream(configured.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
        if (origins.isEmpty() || origins.contains("*")) throw new IllegalArgumentException("Explicit browser origins are required");
    }
    public List<String> all() { return origins; }
    public boolean accepts(String origin) { return origins.contains(origin); }
}
