package com.orus.scoringbackend.entities;

import com.orus.scoringbackend.enums.NiveauRisque;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "simulations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Simulation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "superviseur_id", nullable = false)
    private User superviseur;

    @Column(name = "revenus_simules", nullable = false)
    private Double revenusSimules;

    @Column(name = "charges_simulees", nullable = false)
    private Double chargesSimulees;

    @Column(name = "taux_endettement_simule")
    private Double tauxEndettementSimule;

    @Column(name = "score_simule", nullable = false)
    private Double scoreSimule;

    @Column(name = "score_reel")
    private Double scoreReel;

    @Enumerated(EnumType.STRING)
    @Column(name = "niveau_risque_simule", nullable = false)
    private NiveauRisque niveauRisqueSimule;

    @Column(name = "narration_simulee", columnDefinition = "TEXT")
    private String narrationSimulee;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (revenusSimules != null && revenusSimules > 0) {
            tauxEndettementSimule = (chargesSimulees / revenusSimules) * 100;
        }
    }
}
