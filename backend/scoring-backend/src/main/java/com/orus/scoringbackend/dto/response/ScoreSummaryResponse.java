package com.orus.scoringbackend.dto.response;

import com.orus.scoringbackend.enums.NiveauRisque;
import com.orus.scoringbackend.enums.StatutScore;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Représentation allégée d'un score pour les listes (page Scores).
 * N'inclut pas la narration ni les explications SHAP — celles-ci restent
 * disponibles via GET /api/scores/{id}.
 */
@Data
@Builder
public class ScoreSummaryResponse {
    private Long id;
    private Long clientId;
    private String clientNomComplet;
    private Double valeurScore;
    private NiveauRisque niveauRisque;
    private StatutScore statut;
    private String versionModele;
    private LocalDateTime createdAt;
    private LocalDateTime decidedAt;
}
