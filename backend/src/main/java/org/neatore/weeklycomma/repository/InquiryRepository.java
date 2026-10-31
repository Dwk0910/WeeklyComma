package org.neatore.weeklycomma.repository;

import org.neatore.weeklycomma.domain.Inquiry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface InquiryRepository extends JpaRepository<Inquiry, Long> {
    Page<Inquiry> findByOwnerId(UUID ownerId, Pageable pageable);
    Optional<Inquiry> findByIdAndOwnerId(long id, UUID ownerId);
    void deleteByOwnerId(UUID ownerId);
}
