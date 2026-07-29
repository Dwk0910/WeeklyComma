package org.neatore.weeklycomma.service;

import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.dto.login.AuthType;
import org.neatore.weeklycomma.dto.login.UserDto;
import org.neatore.weeklycomma.exception.UserNotFoundException;
import org.neatore.weeklycomma.repository.UserRepository;

import jakarta.transaction.Transactional;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final OAuthService oauthService;

    public User getUserByEmail(String email) {
        return userRepository.getUserByEmail(email);
    }

    public User getUserById(UUID userId) {
        return userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));
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

    @Transactional
    public void updateUser(UUID userId, UserDto.SignupRequest request) {
        User user = this.getUserById(userId);
        user.setEmail(request.email());
        user.setPassword(request.password());
        userRepository.save(user);
    }

    @Transactional
    public void deleteUser(UUID userId) {
        userRepository.deleteById(userId);
    }
}
