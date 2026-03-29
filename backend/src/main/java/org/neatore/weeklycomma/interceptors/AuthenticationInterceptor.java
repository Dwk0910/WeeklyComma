package org.neatore.weeklycomma.interceptors;

import org.jetbrains.annotations.NotNull;

import org.neatore.weeklycomma.annotations.RequiresAuthentication;
import org.neatore.weeklycomma.service.UserService;
import org.neatore.weeklycomma.domain.User;

import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.stereotype.Component;

import org.springframework.web.cors.CorsUtils;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import lombok.RequiredArgsConstructor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.util.Arrays;

@Component
@EnableJpaAuditing
@RequiredArgsConstructor
public class AuthenticationInterceptor implements HandlerInterceptor {
    private final UserService us;

    @Override
    public boolean preHandle(@NotNull HttpServletRequest request, @NotNull HttpServletResponse response, @NotNull Object handler) {
        // OPTION requests are preflight requests, and should be allowed to pass through without authentication
        if (CorsUtils.isPreFlightRequest(request)) return true;

        if (handler instanceof HandlerMethod hm) {
            // Try to find RequiresAuthentication annotation. If it doesn't exist, this interceptor must pass the request to controller.
            RequiresAuthentication annotation = AnnotatedElementUtils.findMergedAnnotation(hm.getMethod(), RequiresAuthentication.class);

            // Verify that the process has found the RequiresAuthentication annotation.
            if (annotation == null) return true;

            User.UserType[] allowedTypes = annotation.value();
            if (allowedTypes.length == 0) return true;

            String token = request.getHeader("Authorization");
            User user = us.getUserByToken(token);
            return user != null && Arrays.stream(allowedTypes).toList().contains(user.getUserType());
        }

        return true;
    }
}
