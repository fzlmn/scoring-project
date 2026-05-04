package com.orus.scoringbackend.dto.response;

import com.orus.scoringbackend.enums.NiveauRisque;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

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
    private LocalDateTime createdAt;
}
