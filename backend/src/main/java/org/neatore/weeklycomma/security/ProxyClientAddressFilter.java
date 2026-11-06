package org.neatore.weeklycomma.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 5)
public class ProxyClientAddressFilter extends OncePerRequestFilter {
    private final byte[] secret;

    public ProxyClientAddressFilter(@Value("${security.proxy-secret:}") String secret) {
        if (!secret.isEmpty() && secret.length() < 32) {
            throw new IllegalArgumentException("Proxy secret must contain at least 32 characters");
        }
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String supplied = request.getHeader("X-WeeklyComma-Proxy-Secret");
        String address = request.getHeader("X-WeeklyComma-Client-IP");
        if (secret.length == 0 || supplied == null ||
                !MessageDigest.isEqual(secret, supplied.getBytes(StandardCharsets.UTF_8))) {
            chain.doFilter(request, response);
            return;
        }
        // Never resolve hostnames supplied in headers, even by an authenticated proxy.
        if (address == null || address.length() > 64 || !address.matches("[0-9a-fA-F:.]+") ||
                (!address.contains(":") && address.chars().filter(c -> c == '.').count() != 3)) {
            response.setStatus(400);
            return;
        }
        final String client;
        try {
            client = InetAddress.getByName(address).getHostAddress();
        } catch (java.net.UnknownHostException invalid) {
            response.setStatus(400);
            return;
        }
        chain.doFilter(new HttpServletRequestWrapper(request) {
            @Override public String getRemoteAddr() { return client; }
        }, response);
    }
}
