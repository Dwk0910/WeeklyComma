package org.neatore.weeklycomma.interceptors;

import lombok.RequiredArgsConstructor;

import org.jspecify.annotations.NonNull;

import org.neatore.weeklycomma.annotations.RequiresAuthentication;
import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.service.JwtService;

import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.stereotype.Component;

import org.springframework.web.cors.CorsUtils;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.util.WebUtils;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.util.List;

@Component
@RequiredArgsConstructor
public class AuthenticationInterceptor implements HandlerInterceptor {
    private final JwtService jwtService;

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull Object handler) {
        // OPTION requests are preflight requests, and should be allowed to pass through without authentication
        if (CorsUtils.isPreFlightRequest(request)) return true;

        if (handler instanceof HandlerMethod hm) {
            RequiresAuthentication requiresAuthentication = AnnotatedElementUtils.findMergedAnnotation(hm.getMethod(), RequiresAuthentication.class);
            if (requiresAuthentication != null) {
                Runnable unAuthorized = () -> response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

                String headerCsrf = request.getHeader("X-Csrf-Token");
                Cookie tokenCookie = WebUtils.getCookie(request, "WCA_ACCESS");

                /*
                - 다음 중 하나라도 false일 시 401 Unauthorized 반환
                1. headerCsrf가 null인가?
                2. tokenCookie가 null인가?
                3. tokenCookie가 올바르지 않은가?
                4. tokenCookie안의 CSRF Token과 header의 CSRF Token이 서로 일치하는가?
                 */
                if (
                        headerCsrf == null || tokenCookie == null || !jwtService.validateToken(tokenCookie.getValue()) || !jwtService.getCsrfToken(tokenCookie.getValue()).equals(headerCsrf)
                ) {
                    unAuthorized.run();
                    return false;
                }

                User.UserType[] allowedTypes = requiresAuthentication.value();
                if (allowedTypes.length == 0) return true;

                if (!(List.of(allowedTypes).contains(jwtService.getUserType(tokenCookie.getValue())))) {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    return false;
                }
            }
        }

        return true;
    }

//    @Override
//    public boolean preHandle(@NotNull HttpServletRequest request, @NotNull HttpServletResponse response, @NotNull Object handler) {
//        // OPTION requests are preflight requests, and should be allowed to pass through without authentication
//        if (CorsUtils.isPreFlightRequest(request)) return true;
//
//        // Our API is only available to users who are using web browsers and using CORS Option (JavaScript).
//        // If the request is not from the web browser, it should be blocked.
//
//        // CSRF Token Verification: CSRF token here can be exposed.
//        // However, If attackers know the CSRF token, they can only make CORS request or Simple Request that cannot contain header field.
//        if (
//                ((request.getHeader("Sec-Fetch-Site") == null || request.getHeader("Sec-Fetch-Mode") == null) || !request.getHeader("Sec-Fetch-Mode").equals("cors"))
//                        || (request.getHeader("X-Csrf-Token") == null || !request.getHeader("X-Csrf-Token").equals(csrfToken))
//        ) {
//            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
//            return false;
//        }
//
//        if (handler instanceof HandlerMethod hm) {
//            Runnable unAuthorizedResponse = () -> response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
//
//            // Try to find RequiresAuthentication annotation. If it doesn't exist, this interceptor must pass the request to controller.
//            RequiresAuthentication annotation = AnnotatedElementUtils.findMergedAnnotation(hm.getMethod(), RequiresAuthentication.class);
//
//            // Verify that the process has found the RequiresAuthentication annotation.
//            if (annotation == null) return true;
//
//            Cookie tokenCookie = WebUtils.getCookie(request, "WCA_LOGIN");
//            String token = tokenCookie == null ? null : tokenCookie.getValue();
//
//            User user = us.getUserByToken(Optional.ofNullable(token).orElse(""));
//            if (user == null) {
//                unAuthorizedResponse.run();
//                return false;
//            }
//
//            User.UserType[] allowedTypes = annotation.value();
//            if (allowedTypes.length == 0) return true;
//
//            // Checks that the user is authenticated and has the required user type. If not, return an unauthorized response.
//            if (!(List.of(allowedTypes).contains(user.getUserType()))) {
//                unAuthorizedResponse.run();
//                return false;
//            }
//        }
//
//        return true;
//    }
}
