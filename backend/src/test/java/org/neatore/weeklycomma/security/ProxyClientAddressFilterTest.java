package org.neatore.weeklycomma.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.*;

class ProxyClientAddressFilterTest {
    private final String secret = "x".repeat(48);

    String address(String supplied, String ip) throws Exception {
        var request = new MockHttpServletRequest();
        request.setRemoteAddr("192.0.2.10");
        if (supplied != null) request.addHeader("X-WeeklyComma-Proxy-Secret", supplied);
        if (ip != null) request.addHeader("X-WeeklyComma-Client-IP", ip);
        request.addHeader("X-Forwarded-For", "203.0.113.99");
        var response = new MockHttpServletResponse();
        var result = new AtomicReference<String>();
        new ProxyClientAddressFilter(secret).doFilter(request, response,
                (req, res) -> result.set(req.getRemoteAddr()));
        if (result.get() == null) assertEquals(400, response.getStatus());
        return result.get();
    }

    @Test void ignoresUntrustedHeaders() throws Exception {
        assertEquals("192.0.2.10", address(null, "198.51.100.1"));
        assertEquals("192.0.2.10", address("wrong", "198.51.100.1"));
    }

    @Test void distinguishesClientsBehindTheSameProxy() throws Exception {
        assertEquals("198.51.100.1", address(secret, "198.51.100.1"));
        assertEquals("198.51.100.2", address(secret, "198.51.100.2"));
        assertEquals("2001:db8:0:0:0:0:0:1", address(secret, "2001:db8::1"));
    }

    @Test void rejectsMalformedAddressesAndShortSecrets() throws Exception {
        for (String ip : new String[]{"example.test", "198.51.100.1, 192.0.2.1", "127.1", "999.2.3.4"}) {
            assertNull(address(secret, ip));
        }
        assertThrows(IllegalArgumentException.class, () -> new ProxyClientAddressFilter("short"));
    }
}
