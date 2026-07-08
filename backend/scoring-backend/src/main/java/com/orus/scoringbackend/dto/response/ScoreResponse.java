package com.orus.scoringbackend.dto.response;

import com.orus.scoringbackend.enums.NiveauRisque;
import com.orus.scoringbackend.enums.StatutScore;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data @Builder
public class ScoreResponse {
    private Long id;
    private Long clientId;
    private String clientNomComplet;
    private Double valeurScore;
    private NiveauRisque niveauRisque;
    private StatutScore statut;
    private String narration;
    private String versionModele;
    private LocalDateTime createdAt;
    private LocalDateTime decidedAt;
    private List<ExplicationResponse> explications;
}
