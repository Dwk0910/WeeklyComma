package org.neatore.weeklycomma.repository;

import org.neatore.weeklycomma.domain.LoginSession;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.UUID;

public interface LoginSessionRepository extends JpaRepository<LoginSession, String> {
    @Modifying
    @Query("update LoginSession s set s.lastSeen = :now where s.tokenHash = :hash and s.userId = :userId and s.expiresAt > :now and s.lastSeen > :cutoff")
    int touchActive(@Param("hash") String hash, @Param("userId") UUID userId, @Param("now") long now, @Param("cutoff") long cutoff);
    @Modifying @Query("delete from LoginSession s where s.userId = :userId")
    void revokeForUser(@Param("userId") UUID userId);
    @Modifying @Query("delete from LoginSession s where s.expiresAt <= :now or s.lastSeen <= :cutoff")
    void deleteExpired(@Param("now") long now, @Param("cutoff") long cutoff);
}
