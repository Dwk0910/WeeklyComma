package org.neatore.weeklycomma.repository;

import org.neatore.weeklycomma.domain.DBFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DBFileRepository extends JpaRepository<DBFile, UUID> {
}
