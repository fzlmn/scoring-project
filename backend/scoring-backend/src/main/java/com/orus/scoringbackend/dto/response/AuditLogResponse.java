package com.orus.scoringbackend.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data @Builder
public class AuditLogResponse {
    private Long id;
    private Long userId;
    private String userNomComplet;
    private String action;
    private String entite;
    private Long entiteId;
    /** Libellé lisible de la cible (nom du client/utilisateur concerné), si résoluble. */
    private String cible;
    private LocalDateTime createdAt;
}