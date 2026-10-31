package org.neatore.weeklycomma.service;

import org.json.JSONObject;

import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.dto.login.AuthType;
import org.neatore.weeklycomma.dto.login.UserDto;
import org.neatore.weeklycomma.exception.UserNotFoundException;
import org.neatore.weeklycomma.repository.UserRepository;
import org.neatore.weeklycomma.repository.BookStarRepository;

import jakarta.transaction.Transactional;

import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import lombok.RequiredArgsConstructor;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final OAuthService oauthService;
    private final BookStarRepository bookStarRepository;
    private final org.neatore.weeklycomma.repository.InquiryRepository inquiryRepository;
    private final DBFileService files;
    private final LoginPasswordService passwords;

    public User getUserByEmail(String email) {
        return userRepository.getUserByEmail(email);
    }

    public User getUserByOauthId(String email) {
        return userRepository.getUserByOauthId(email);
    }

    public User getUserById(UUID userId) {
        return userRepository.findById(userId).orElseThrow(() -> new UserNotFoundException(userId));
    }

    @Transactional
    public void addUser(UserDto.SignupRequest request) {
        String userName = request.userName(), email = request.email(), password = request.password(), oauthId = null;
        AuthType authType = request.authType();

        boolean conflict = false;

        switch (request.authType()) {
            case LOCAL -> {
                if (email == null || email.isBlank() || email.length() > 254 || !email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
                email = email.trim();
                password = passwords.encode(password);
                if (userRepository.getUserByEmail(email) != null) conflict = true;
            }

            case OAUTH_NAVER -> {
                JSONObject userProfile = oauthService.getUserProfileNaver(request.auth_code(), request.redirect_uri(), request.state());
                if (userProfile == null || userProfile.optString("id").isBlank() || userProfile.optString("email").isBlank())
                    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
                password = null;
                oauthId = userProfile.optString("id");
                email = userProfile.optString("email");

                if (userRepository.getUserByEmail(email) != null || userRepository.getUserByOauthId(oauthId) != null) conflict = true;
            }
        }

        if (!conflict) userRepository.save(new User(userName, email, oauthId, password, User.UserType.GENERAL, authType));
    }

    @Transactional
    public void updateUser(UUID userId, UserDto.SignupRequest request) {
        User user = this.getUserById(userId);
        user.setEmail(request.email());
        if (user.getAuthType() == AuthType.LOCAL) user.setPassword(passwords.encode(request.password()));
        userRepository.save(user);
    }

    @Transactional
    public void deleteUser(UUID userId) {
        files.deleteOwned(userId);
        inquiryRepository.deleteByOwnerId(userId);
        bookStarRepository.deleteForUser(userId);
        userRepository.deleteById(userId);
    }
}
