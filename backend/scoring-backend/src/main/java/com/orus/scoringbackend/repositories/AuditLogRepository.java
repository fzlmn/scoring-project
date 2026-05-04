package com.orus.scoringbackend.repositories;

import com.orus.scoringbackend.entities.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<AuditLog> findByEntiteAndEntiteIdOrderByCreatedAtDesc(String entite, Long entiteId);
}