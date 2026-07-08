package com.orus.scoringbackend.dto.response;

import com.orus.scoringbackend.enums.NiveauRisque;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data @Builder
public class SimulationResponse {
    private Long id;
    private Long clientId;
    private String clientNomComplet;
    private Double revenusSimules;
    private Double chargesSimulees;
    private Double tauxEndettementSimule;
    private Double scoreSimule;
    private Double scoreReel;
    private NiveauRisque niveauRisqueSimule;
    private String narrationSimulee;
    /** Instantané des paramètres effectivement simulés (what-if complet). */
    private Map<String, Object> parametresSimules;
    private LocalDateTime createdAt;
}
