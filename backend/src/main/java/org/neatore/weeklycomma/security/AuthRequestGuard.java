package org.neatore.weeklycomma.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import lombok.RequiredArgsConstructor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
@RequiredArgsConstructor
public class AuthRequestGuard extends OncePerRequestFilter {
    private final BrowserOrigins origins;
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        String path = request.getServletPath();
        if (path.startsWith("/authsessions")) response.setHeader("Cache-Control", "no-store");
        boolean credentialWrite = (path.equals("/authsessions") || path.equals("/users")) && request.getMethod().equals("POST")
                || path.equals("/authsessions/password") && request.getMethod().equals("PUT");
        boolean logout = path.equals("/authsessions") && request.getMethod().equals("DELETE");
        if (credentialWrite || logout) {
            String origin = request.getHeader("Origin");
            if (!"WeeklyComma".equals(request.getHeader("X-Requested-With"))
                    || origin != null && !origins.accepts(origin)
                    || origin == null && "cross-site".equals(request.getHeader("Sec-Fetch-Site"))) {
                response.setStatus(403); return;
            }
            if (credentialWrite) try {
                if (!MediaType.APPLICATION_JSON.isCompatibleWith(MediaType.parseMediaType(request.getContentType()))) {
                    response.setStatus(415); return;
                }
            } catch (IllegalArgumentException ex) { response.setStatus(415); return; }
        }
        chain.doFilter(request, response);
    }
}
