package org.neatore.weeklycomma.service;

import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.dto.login.AuthType;
import org.neatore.weeklycomma.dto.login.UserDto;
import org.neatore.weeklycomma.repository.UserRepository;

import jakarta.transaction.Transactional;
import jakarta.annotation.Nullable;

import org.apache.commons.codec.digest.DigestUtils;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final OAuthService oauthService;
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
    public ResponseEntity<Void> addUser(UserDto.SignupRequest request) {
        ResponseEntity<Void> alreadyExist = ResponseEntity.status(HttpStatus.CONFLICT).build();
        ResponseEntity<Void> success = ResponseEntity.ok().build();

        String userName = request.userName(), email = request.email(), password = request.password();
        AuthType authType = request.authType();

        switch (request.authType()) {
            case LOCAL -> {
                if (userRepository.getUserByEmail(request.email()) != null) return alreadyExist;
            }

            case OAUTH_NAVER -> {
                email = oauthService.getEmailNaver(request.auth_code(), request.redirect_uri(), request.state());
                if (userRepository.getUserByEmail(email) != null) return alreadyExist;
            }
        }

        userRepository.save(new User(userName, email, password, User.UserType.GENERAL, authType));
        return success;
    }
}
