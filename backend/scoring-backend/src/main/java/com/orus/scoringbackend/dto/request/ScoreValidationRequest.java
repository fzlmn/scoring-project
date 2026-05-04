package com.orus.scoringbackend.dto.request;

import com.orus.scoringbackend.enums.StatutScore;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ScoreValidationRequest {
    @NotNull
    private StatutScore statut; // VALIDE ou REJETE
}
