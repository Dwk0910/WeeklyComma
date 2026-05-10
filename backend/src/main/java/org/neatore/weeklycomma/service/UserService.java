package org.neatore.weeklycomma.service;

import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.repository.UserRepository;

import jakarta.transaction.Transactional;
import jakarta.annotation.Nullable;

import org.apache.commons.codec.digest.DigestUtils;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final ConcurrentHashMap<String, User> loginedUsers = new ConcurrentHashMap<>();

    public User getUserByEmail(String email) {
        return userRepository.getUserByEmail(email);
    }

    public @Nullable User getUserByToken(String token) {
        return loginedUsers.get(DigestUtils.sha256Hex(token));
    }

    public boolean hasToken(String token) {
        return loginedUsers.containsKey(DigestUtils.sha256Hex(token));
    }

    public void removeToken(String token) {
        loginedUsers.remove(DigestUtils.sha256Hex(token));
    }

    public String newLoginSession(User user) {
        String newToken = UUID.randomUUID().toString();
        loginedUsers.put(DigestUtils.sha256Hex(newToken), user);

        return newToken;
    }

    @Transactional
    public boolean addUser(String userName, String email, String password, User.UserType role) {
        if (userRepository.getUserByEmail(email) == null) {
            userRepository.save(new User(userName, email, password, role));
            return true;
        }

        return false;
    }
}
