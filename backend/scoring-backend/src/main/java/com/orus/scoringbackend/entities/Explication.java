package com.orus.scoringbackend.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "explications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Explication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "score_id", nullable = false)
    private Score score;

    @Column(name = "feature_name", nullable = false)
    private String featureName;

    @Column(name = "shap_value", nullable = false)
    private Double shapValue;

    @Column(nullable = false)
    private boolean direction; // true = augmente le risque

    @Column(name = "ordre_importance", nullable = false)
    private int ordreImportance;
}
