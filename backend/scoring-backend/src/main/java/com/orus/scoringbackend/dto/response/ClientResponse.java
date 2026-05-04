package com.orus.scoringbackend.dto.response;

import com.orus.scoringbackend.enums.HistoriqueFinancier;
import com.orus.scoringbackend.enums.SituationPro;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @Builder
public class ClientResponse {
    private Long id;
    private String nom;
    private String prenom;
    private String cin;
    private LocalDate dateNaissance;
    private int age;
    private SituationPro situationPro;
    private Double revenusMensuels;
    private Double chargesMensuelles;
    private Double tauxEndettement;
    private HistoriqueFinancier historiqueFinancier;
    private LocalDateTime createdAt;
    private ScoreResponse dernierScore;
}
