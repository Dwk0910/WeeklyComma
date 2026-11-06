package org.neatore.weeklycomma.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import java.util.concurrent.atomic.AtomicBoolean;
import static org.junit.jupiter.api.Assertions.*;

class AuthRequestGuardTest {
    private final AuthRequestGuard guard = new AuthRequestGuard(new BrowserOrigins("https://weeklycomma.kro.kr,http://localhost:5173"));
    MockHttpServletRequest request(String path) {
        var r = new MockHttpServletRequest("POST", path); r.setServletPath(path);
        r.setContentType("application/json"); r.addHeader("X-Requested-With", "WeeklyComma");
        r.addHeader("Origin", "https://weeklycomma.kro.kr"); return r;
    }
    int run(MockHttpServletRequest request) throws Exception {
        var response = new MockHttpServletResponse(); var reached = new AtomicBoolean();
        guard.doFilter(request, response, (req, res) -> reached.set(true));
        assertEquals(response.getStatus() == 200, reached.get()); return response.getStatus();
    }
    @Test void allowsOnlyExplicitOriginsAndCustomJsonRequests() throws Exception {
        assertEquals(200, run(request("/authsessions")));
        var cross = request("/authsessions"); cross.removeHeader("Origin"); cross.addHeader("Origin", "https://attacker.test");
        assertEquals(403, run(cross));
        var suffix = request("/authsessions"); suffix.removeHeader("Origin"); suffix.addHeader("Origin", "https://weeklycomma.kro.kr.attacker.test");
        assertEquals(403, run(suffix));
        var missing = request("/authsessions"); missing.removeHeader("X-Requested-With"); assertEquals(403, run(missing));
        var form = request("/authsessions"); form.setContentType("application/x-www-form-urlencoded"); assertEquals(415, run(form));
        var noType = request("/authsessions"); noType.setContentType(null); assertEquals(415, run(noType));
    }
    @Test void protectsSignupAndPasswordChangesAndAllowsPreflight() throws Exception {
        var signup = request("/users"); signup.removeHeader("X-Requested-With"); assertEquals(403, run(signup));
        var change = request("/authsessions/password"); change.setMethod("PUT"); change.removeHeader("X-Requested-With"); assertEquals(403, run(change));
        var logout = request("/authsessions"); logout.setMethod("DELETE"); logout.setContentType(null); assertEquals(200, run(logout));
        logout.removeHeader("X-Requested-With"); assertEquals(403, run(logout));
        var options = request("/authsessions"); options.setMethod("OPTIONS"); options.removeHeader("X-Requested-With"); assertEquals(200, run(options));
    }
    @Test void rejectsCrossSiteRequestsWithoutOriginAndDisablesSessionResponseCaching() throws Exception {
        var r = request("/authsessions"); r.removeHeader("Origin"); r.addHeader("Sec-Fetch-Site", "cross-site"); assertEquals(403, run(r));
        var me = request("/authsessions/me"); me.setMethod("GET");
        var response = new MockHttpServletResponse(); guard.doFilter(me, response, (req, res) -> {});
        assertEquals("no-store", response.getHeader("Cache-Control"));
    }
    @Test void protectsEmailVerificationEndpointsAndPreventsCaching() throws Exception {
        for (String path : java.util.List.of("/users/email/request", "/users/email/inspect", "/users/email/complete")) {
            assertEquals(200, run(request(path)));
            var missing = request(path); missing.removeHeader("X-Requested-With");
            assertEquals(403, run(missing));
            var cross = request(path); cross.removeHeader("Origin"); cross.addHeader("Origin", "https://attacker.test");
            assertEquals(403, run(cross));
            var response = new MockHttpServletResponse();
            guard.doFilter(request(path), response, (req, res) -> {});
            assertEquals("no-store", response.getHeader("Cache-Control"));
        }
    }

}
