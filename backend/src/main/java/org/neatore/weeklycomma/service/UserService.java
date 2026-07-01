package org.neatore.weeklycomma.service;

import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.dto.login.AuthType;
import org.neatore.weeklycomma.dto.login.UserDto;
import org.neatore.weeklycomma.repository.UserRepository;

import jakarta.transaction.Transactional;
import jakarta.annotation.Nullable;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final OAuthService oauthService;
    private final Map<String, User> loginedUsers = new ConcurrentHashMap<>();

    public User getUserByEmail(String email) {
        return userRepository.getUserByEmail(email);
    }

    public @Nullable User getUserByToken(String token) {
        return loginedUsers.get(token);
    }

    public boolean hasToken(String token) {
        return loginedUsers.containsKey(token);
    }

    public void removeToken(String token) {
        loginedUsers.remove(token);
    }

    public String newLoginSession(User user) {
        String newToken = UUID.randomUUID().toString();
        loginedUsers.put(newToken, user);

        return newToken;
    }

    @Transactional
    public void addUser(UserDto.SignupRequest request) {
        String userName = request.userName(), email = request.email(), password = request.password();
        AuthType authType = request.authType();

        boolean confilct = false;

        switch (request.authType()) {
            case LOCAL -> {
                if (userRepository.getUserByEmail(request.email()) != null) confilct = true;
            }

            case OAUTH_NAVER -> {
                email = oauthService.getEmailNaver(request.auth_code(), request.redirect_uri(), request.state());
                if (userRepository.getUserByEmail(email) != null) confilct = true;
            }
        }

        if (!confilct) userRepository.save(new User(userName, email, password, User.UserType.GENERAL, authType));
    }
}
