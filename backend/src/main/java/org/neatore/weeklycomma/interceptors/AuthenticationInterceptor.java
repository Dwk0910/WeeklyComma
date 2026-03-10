package org.neatore.weeklycomma.interceptors;

import lombok.RequiredArgsConstructor;
import org.jetbrains.annotations.NotNull;

import org.neatore.weeklycomma.annotations.RequiresAuthorization;
import org.neatore.weeklycomma.service.UserVerifyService;

import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.stereotype.Component;

import org.springframework.web.cors.CorsUtils;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
@RequiredArgsConstructor
public class AuthenticationInterceptor implements HandlerInterceptor {
    private final UserVerifyService uvs;

    @Override
    public boolean preHandle(@NotNull HttpServletRequest request, @NotNull HttpServletResponse response, @NotNull Object handler) {
        // OPTION requests are preflight requests, and should be allowed to pass through without authentication
        if (CorsUtils.isPreFlightRequest(request)) return true;

        HandlerMethod hm = (HandlerMethod) handler;

        if (AnnotationUtils.findAnnotation(hm.getMethod(), RequiresAuthorization.class) != null || AnnotationUtils.findAnnotation(hm.getBean().getClass(), RequiresAuthorization.class) != null) {
            String session_id = request.getHeader("X-Client-Session-ID");
            if (!uvs.verify(session_id)) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return false;
            }
        }
        return true;
    }
}
