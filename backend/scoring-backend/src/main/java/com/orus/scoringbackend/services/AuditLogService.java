package com.orus.scoringbackend.services;

import com.orus.scoringbackend.dto.response.AuditLogResponse;
import com.orus.scoringbackend.entities.AuditLog;
import com.orus.scoringbackend.entities.User;
import com.orus.scoringbackend.repositories.AuditLogRepository;
import com.orus.scoringbackend.repositories.ClientRepository;
import com.orus.scoringbackend.repositories.ScoreRepository;
import com.orus.scoringbackend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final ClientRepository clientRepository;
    private final ScoreRepository scoreRepository;
    private final UserRepository userRepository;

    public void log(User user, String action, String entite, Long entiteId) {
        AuditLog log = AuditLog.builder()
                .user(user)
                .action(action)
                .entite(entite)
                .entiteId(entiteId)
                .build();
        auditLogRepository.save(log);
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> getAll() {
        // Le plus récent d'abord : sans cet ordre, les validations/rejets récents
        // (ids élevés) se retrouvaient en dernière page et semblaient « manquants ».
        return auditLogRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> getByUser(Long userId) {
        return auditLogRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::mapToResponse).toList();
    }

    @Transactional(readOnly = true)
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
                .cible(resoudreCible(a.getEntite(), a.getEntiteId()))
                .createdAt(a.getCreatedAt())
                .build();
    }

    /**
     * Libellé lisible de la cible d'une action : le nom du client concerné pour les
     * entités CLIENT / SCORE, le nom de l'utilisateur pour l'entité USER.
     * Permet d'identifier immédiatement le client sans deviner depuis la référence numérique.
     */
    private String resoudreCible(String entite, Long entiteId) {
        if (entite == null || entiteId == null) return null;
        return switch (entite) {
            case "CLIENT" -> clientRepository.findById(entiteId)
                    .map(c -> c.getPrenom() + " " + c.getNom()).orElse(null);
            case "SCORE" -> scoreRepository.findById(entiteId)
                    .map(s -> s.getClient() != null ? s.getClient().getPrenom() + " " + s.getClient().getNom() : null)
                    .orElse(null);
            case "USER" -> userRepository.findById(entiteId)
                    .map(u -> u.getPrenom() + " " + u.getNom()).orElse(null);
            default -> null;
        };
    }
}
