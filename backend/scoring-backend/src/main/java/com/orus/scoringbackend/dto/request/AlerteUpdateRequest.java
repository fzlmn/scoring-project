package com.orus.scoringbackend.dto.request;

import com.orus.scoringbackend.enums.StatutAlerte;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AlerteUpdateRequest {
    @NotNull
    private StatutAlerte statut;
}
