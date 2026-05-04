package com.orus.scoringbackend.dto.response;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class DashboardResponse {
    private long totalClients;
    private long scoresEnAttente;
    private long scoresValides;
    private long scoresRejetes;
    private Double scoreMoyen;
    private long clientsFaibleRisque;
    private long clientsMoyenRisque;
    private long clientsEleveRisque;
    private long alertesNonLues;
}
