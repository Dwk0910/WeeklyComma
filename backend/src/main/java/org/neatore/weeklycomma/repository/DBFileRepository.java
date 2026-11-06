package org.neatore.weeklycomma.repository;

import org.neatore.weeklycomma.domain.DBFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;
import java.util.List;
import java.time.Instant;
import org.springframework.data.domain.Pageable;

public interface DBFileRepository extends JpaRepository<DBFile, UUID> {
    List<DBFile> findByInquiryIdOrderByUploadedAtAsc(Long inquiryId);
    List<DBFile> findByOwnerId(UUID ownerId);
    List<DBFile> findByOwnerIdIsNotNullAndInquiryIdIsNullAndUploadedAtBefore(Instant cutoff, Pageable pageable);
}
