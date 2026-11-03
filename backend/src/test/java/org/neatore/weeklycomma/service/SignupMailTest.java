package org.neatore.weeklycomma.service;

import jakarta.mail.Multipart;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import static org.junit.jupiter.api.Assertions.*;

class SignupMailTest {
    static class Capture extends JavaMailSenderImpl {
        MimeMessage sent;
        @Override public void send(MimeMessage message) { sent = message; }
    }
    String html;
    String plain;
    byte[] logo;
    void read(jakarta.mail.Part part) throws Exception {
        if (part.isMimeType("image/png")) {
            assertEquals("<weeklycomma-logo>", part.getHeader("Content-ID")[0]);
            assertEquals("inline", part.getDisposition());
            logo = part.getInputStream().readAllBytes();
        }
        else if (part.isMimeType("text/html")) html = part.getContent().toString();
        else if (part.isMimeType("text/plain")) plain = part.getContent().toString();
        else if (part.getContent() instanceof Multipart multi)
            for (int i = 0; i < multi.getCount(); i++) read(multi.getBodyPart(i));
    }
    @Test void sendsLetterHtmlAndPlainTextWithTheSameTrustedFragmentLink() throws Exception {
        var capture = new Capture();
        var mail = new SesSignupMailSender(capture, "주간쉼표 <noreply@example.test>", "https://example.test/signup/email/verify");
        mail.sendLink("reader@example.test", "x".repeat(43));
        capture.sent.saveChanges();
        read(capture.sent);
        String link = "https://example.test/signup/email/verify#token=" + "x".repeat(43);
        assertTrue(html.contains("href=\"" + link + "\""));
        assertTrue(plain.contains(link));
        assertTrue(html.contains("이메일 확인하고 계속하기"));
        assertFalse(html.contains("{{VERIFY_URL}}"));
        assertEquals("reader@example.test", capture.sent.getAllRecipients()[0].toString());
        assertFalse(html.contains("<script"));
        assertTrue(html.contains("src=\"cid:weeklycomma-logo\""));
        try (var input = new org.springframework.core.io.ClassPathResource("mail/logo.png").getInputStream()) {
            assertArrayEquals(input.readAllBytes(), logo);
        }
    }
    @Test void rejectsUntrustedOrInsecureVerificationUrlConfiguration() {
        for (String url : java.util.List.of("http://example.test/signup", "javascript:alert(1)", "https://example.test/#token=bad", "https://user@example.test/signup"))
            assertThrows(IllegalArgumentException.class, () -> new SesSignupMailSender(new Capture(), "noreply@example.test", url));
    }
}
