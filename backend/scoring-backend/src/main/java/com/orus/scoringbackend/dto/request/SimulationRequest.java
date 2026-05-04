package com.orus.scoringbackend.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class SimulationRequest {

    @NotNull
    private Long clientId;

    @NotNull @Positive
    private Double revenusSimules;

    @NotNull @PositiveOrZero
    private Double chargesSimulees;
}
