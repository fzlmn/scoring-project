package com.orus.scoringbackend.entities;

import com.orus.scoringbackend.enums.HistoriqueFinancier;
import com.orus.scoringbackend.enums.SituationPro;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "clients")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Client {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false)
    private String prenom;

    @Column(unique = true, nullable = false)
    private String cin;

    @Column(name = "date_naissance", nullable = false)
    private LocalDate dateNaissance;

    @Enumerated(EnumType.STRING)
    @Column(name = "situation_pro", nullable = false)
    private SituationPro situationPro;

    @Column(name = "revenus_mensuels", nullable = false)
    private Double revenusMensuels;

    @Column(name = "charges_mensuelles", nullable = false)
    private Double chargesMensuelles;

    @Column(name = "taux_endettement")
    private Double tauxEndettement; // calculé automatiquement

    @Enumerated(EnumType.STRING)
    @Column(name = "historique_financier", nullable = false)
    private HistoriqueFinancier historiqueFinancier;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "client", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Score> scores = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        calculerTauxEndettement();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        calculerTauxEndettement();
    }

    public void calculerTauxEndettement() {
        if (revenusMensuels != null && revenusMensuels > 0) {
            this.tauxEndettement = (chargesMensuelles / revenusMensuels) * 100;
        }
    }
}