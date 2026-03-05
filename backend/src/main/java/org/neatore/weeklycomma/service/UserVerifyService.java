package org.neatore.weeklycomma.service;

import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.UUID;
import java.util.HashSet;

@Service
public class UserVerifyService {
    private final Set<String> sessions = new HashSet<>();

    public String addSession() {
        UUID uuid = UUID.randomUUID();
        sessions.add(uuid.toString());
        return uuid.toString();
    }

    public void removeSession(String token) {
        sessions.remove(token);
    }

    public boolean verify(String token) {
        return sessions.contains(token);
    }
}
