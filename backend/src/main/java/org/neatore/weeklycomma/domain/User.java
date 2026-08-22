package org.neatore.weeklycomma.domain;

import jakarta.persistence.Column;
import jakarta.persistence.GenerationType;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;

import lombok.Getter;
import lombok.Setter;

import org.neatore.weeklycomma.dto.login.AuthType;

import java.util.UUID;

@Entity
@Getter
public class User {
    protected User() {}

    public User(String userName, String email, String oauthId, String password, User.UserType role, AuthType authType) {
        this.userName = userName;
        this.email = email;
        this.oauthId = oauthId;
        this.password = password;
        this.userType = role;
        this.authType = authType;
    }

    // User Type은 각 케이스에 따라 생성
    /*
    GENERAL - 특별 권한 없음
    CURATOR - 관리 탭 진입 권한(공지 작성, 이벤트글 작성, 책 추천글 작성 등)
     */

    public enum UserType {
        CURATOR, GENERAL
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Setter
    @Column(unique = true)
    private String oauthId;

    @Enumerated(value = EnumType.STRING)
    private UserType userType;

    @Enumerated(value = EnumType.STRING)
    private AuthType authType;

    @Setter
    @Column(nullable = false, unique = true)
    private String email;

    @Setter
    private String userName;

    @Setter
    private String password;
}
