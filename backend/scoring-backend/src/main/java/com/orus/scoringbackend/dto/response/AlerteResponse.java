package com.orus.scoringbackend.dto.response;

import com.orus.scoringbackend.enums.Criticite;
import com.orus.scoringbackend.enums.StatutAlerte;
import com.orus.scoringbackend.enums.TypeAlerte;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data @Builder
public class AlerteResponse {
    private Long id;
    private Long clientId;
    private String clientNomComplet;
    private Long scoreId;
    private TypeAlerte typeAlerte;
    private Criticite criticite;
    private StatutAlerte statut;
    private String description;
    private LocalDateTime createdAt;
}
