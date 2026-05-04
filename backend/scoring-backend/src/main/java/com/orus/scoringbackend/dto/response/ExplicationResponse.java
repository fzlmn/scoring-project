package com.orus.scoringbackend.dto.response;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class ExplicationResponse {
    private String featureName;
    private Double shapValue;
    private boolean direction;
    private int ordreImportance;
}
