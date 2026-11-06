package org.neatore.weeklycomma.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;
import java.net.URI;
import java.nio.charset.StandardCharsets;

@Service
public class SesSignupMailSender implements SignupMailSender {
    private final JavaMailSender sender;
    private final String from;
    private final String verifyUrl;
    private final String template;
    public SesSignupMailSender(JavaMailSender sender, @Value("${signup.mail.from:}") String from,
                               @Value("${signup.mail.verify-url}") String verifyUrl) {
        this.sender = sender;
        this.from = from;
        URI uri = URI.create(verifyUrl);
        boolean local = "http".equals(uri.getScheme()) && ("localhost".equals(uri.getHost()) || "127.0.0.1".equals(uri.getHost()));
        if ((!"https".equals(uri.getScheme()) && !local) || uri.getHost() == null || uri.getUserInfo() != null || uri.getFragment() != null || uri.getQuery() != null)
            throw new IllegalArgumentException("Signup verification URL must be a trusted HTTPS URL (or localhost HTTP)");
        this.verifyUrl = verifyUrl;
        try (var input = new ClassPathResource("mail/signup.html").getInputStream()) {
            template = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        } catch (java.io.IOException error) { throw new IllegalStateException("Signup email template is missing", error); }
    }
    public void sendLink(String email, String token) {
        if (from.isBlank()) throw new IllegalStateException("Signup mail sender is not configured");
        if (!token.matches("[A-Za-z0-9_-]{43}")) throw new IllegalArgumentException("Invalid signup token");
        // A fragment keeps the bearer token out of HTTP access logs and Referer headers.
        String link = verifyUrl + "#token=" + token;
        try {
            var message = sender.createMimeMessage();
            var helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            helper.setTo(email);
            helper.setSubject("[주간쉼표] 이메일을 확인하고 가입을 이어가세요");
            helper.setText("주간쉼표 이메일 확인\n\n아래 링크를 열어 회원가입을 이어가세요.\n" + link
                    + "\n\n15분 동안 유효합니다. 링크를 다른 사람에게 전달하지 마세요.\n직접 요청하지 않았다면 이 메일을 무시해 주세요.\n이 메일은 발신 전용입니다.",
                    template.replace("{{VERIFY_URL}}", HtmlUtils.htmlEscape(link)));
            helper.addInline("weeklycomma-logo", new ClassPathResource("mail/logo.png"), "image/png");
            sender.send(message);
        } catch (jakarta.mail.MessagingException error) { throw new IllegalStateException("Cannot prepare signup email", error); }
    }
}
