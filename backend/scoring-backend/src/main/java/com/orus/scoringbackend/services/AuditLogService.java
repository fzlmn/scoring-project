package com.orus.scoringbackend.services;

import com.orus.scoringbackend.dto.response.AuditLogResponse;
import com.orus.scoringbackend.entities.AuditLog;
import com.orus.scoringbackend.entities.User;
import com.orus.scoringbackend.repositories.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public void log(User user, String action, String entite, Long entiteId) {
        AuditLog log = AuditLog.builder()
                .user(user)
                .action(action)
                .entite(entite)
                .entiteId(entiteId)
                .build();
        auditLogRepository.save(log);
    }

    public List<AuditLogResponse> getAll() {
        return auditLogRepository.findAll().stream()
                .map(this::mapToResponse).toList();
    }

    public List<AuditLogResponse> getByUser(Long userId) {
        return auditLogRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::mapToResponse).toList();
    }

    public List<AuditLogResponse> getByEntite(String entite, Long entiteId) {
        return auditLogRepository.findByEntiteAndEntiteIdOrderByCreatedAtDesc(entite, entiteId)
                .stream().map(this::mapToResponse).toList();
    }

    private AuditLogResponse mapToResponse(AuditLog a) {
        return AuditLogResponse.builder()
                .id(a.getId())
                .userId(a.getUser() != null ? a.getUser().getId() : null)
                .userNomComplet(a.getUser() != null
                        ? a.getUser().getPrenom() + " " + a.getUser().getNom() : "Système")
                .action(a.getAction())
                .entite(a.getEntite())
                .entiteId(a.getEntiteId())
                .createdAt(a.getCreatedAt())
                .build();
    }
}