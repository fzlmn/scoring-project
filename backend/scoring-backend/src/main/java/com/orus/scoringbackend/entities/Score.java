package com.orus.scoringbackend.entities;

import com.orus.scoringbackend.enums.NiveauRisque;
import com.orus.scoringbackend.enums.StatutScore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "scores")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Score {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Column(name = "valeur_score", nullable = false)
    private Double valeurScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "niveau_risque", nullable = false)
    private NiveauRisque niveauRisque;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutScore statut = StatutScore.EN_ATTENTE;

    @Column(columnDefinition = "TEXT")
    private String narration;

    @Column(name = "version_modele")
    private String versionModele;

    @Column(name = "calculated_by")
    private Long calculatedBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "score", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Explication> explications = new ArrayList<>();

    @OneToMany(mappedBy = "score", cascade = CascadeType.ALL)
    private List<Alerte> alertes = new ArrayList<>();

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
