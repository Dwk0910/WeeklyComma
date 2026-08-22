package org.neatore.weeklycomma.repository;

import org.neatore.weeklycomma.domain.User;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    User getUserByEmail(String email);
    User getUserByOauthId(String oauthId);
}
