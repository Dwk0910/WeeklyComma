package org.neatore.weeklycomma.security;

import org.junit.jupiter.api.Test;
import org.neatore.weeklycomma.GlobalExceptionHandler;
import org.neatore.weeklycomma.controller.AuthenticationController;
import org.neatore.weeklycomma.controller.UserController;
import org.neatore.weeklycomma.service.LoginPasswordService;
import org.neatore.weeklycomma.service.LoginThrottleService;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.time.Clock;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class AuthHttpTest {
    @Test void retryAfterSurvivesTheGlobalExceptionHandler() throws Exception {
        var throttle = new LoginThrottleService(null, Clock.systemUTC()) {
            @Override public long reserveLogin(String email, String ip) { return 90; }
        };
        var mvc = MockMvcBuilders.standaloneSetup(new AuthenticationController(null, null, null, new LoginPasswordService(), throttle))
                .setControllerAdvice(new GlobalExceptionHandler())
                .addFilters(new AuthRequestGuard(new BrowserOrigins("http://localhost:5173"))).build();
        var response = mvc.perform(post("/authsessions").servletPath("/authsessions")
                .header("X-Requested-With", "WeeklyComma").header("Origin", "http://localhost:5173")
                .contentType("application/json")
                .content("{\"authType\":\"LOCAL\",\"email\":\"reader@example.test\",\"password\":\"correct password\"}"))
                .andReturn().getResponse();
        assertEquals(429, response.getStatus());
        assertEquals("90", response.getHeader("Retry-After"));
    }
    @Test void unverifiedLocalSignupIsClosedByDefault() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new UserController(null, null)).setControllerAdvice(new GlobalExceptionHandler()).build();
        var response = mvc.perform(post("/users").contentType("application/json")
                .content("{\"authType\":\"LOCAL\",\"userName\":\"reader\",\"email\":\"reader@example.test\",\"password\":\"correct password\"}"))
                .andReturn().getResponse();
        assertEquals(404, response.getStatus());
    }
}
