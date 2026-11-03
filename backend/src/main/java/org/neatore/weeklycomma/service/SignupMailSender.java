package org.neatore.weeklycomma.service;

public interface SignupMailSender {
    void sendLink(String email, String token);
}
