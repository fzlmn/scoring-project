package com.orus.scoringbackend.dto.response;

import com.orus.scoringbackend.enums.HistoriqueFinancier;
import com.orus.scoringbackend.enums.SituationPro;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @Builder
public class ClientResponse {

    // ── Identité ──────────────────────────────────────────────────────────
    private Long id;
    private String nom;
    private String prenom;
    private String cin;
    private LocalDate dateNaissance;
    private int age;

    // ── Données financières de base ───────────────────────────────────────
    private SituationPro situationPro;
    private Double revenusMensuels;
    private Double chargesMensuelles;
    private Double tauxEndettement;
    private HistoriqueFinancier historiqueFinancier;

    // ── Données bureau de crédit / auto-déclaration ───────────────────────
    private Integer nbRetards3059Jours;
    private Integer nbRetards6089Jours;
    private Integer nbRetards90JoursPlus;
    private Integer nbCreditsOuverts;
    private Integer nbPretsImmobiliers;
    private Integer nbPersonnesACharge;
    private Double utilisationCreditRenouvelable;
    // Montants source (nullable pour les clients antérieurs à V6) — permettent au
    // formulaire de retrouver les valeurs d'origine du crédit renouvelable.
    private Double plafondCredit;
    private Double soldeCredit;

    // ── Métadonnées ───────────────────────────────────────────────────────
    private LocalDateTime createdAt;

    // ── Dernier score calculé (null si aucun score encore) ───────────────
    private ScoreResponse dernierScore;
}
