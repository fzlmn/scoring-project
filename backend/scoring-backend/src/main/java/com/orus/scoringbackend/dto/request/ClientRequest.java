package com.orus.scoringbackend.dto.request;

import com.orus.scoringbackend.enums.HistoriqueFinancier;
import com.orus.scoringbackend.enums.SituationPro;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;

@Data
public class ClientRequest {

    // ── Données d'identité ────────────────────────────────────────────────

    @NotBlank(message = "Le nom est obligatoire")
    private String nom;

    @NotBlank(message = "Le prénom est obligatoire")
    private String prenom;

    @NotBlank(message = "Le CIN est obligatoire")
    private String cin;

    @NotNull(message = "La date de naissance est obligatoire")
    @Past(message = "La date de naissance doit être dans le passé")
    private LocalDate dateNaissance;

    @NotNull(message = "La situation professionnelle est obligatoire")
    private SituationPro situationPro;

    // ── Données financières de base ───────────────────────────────────────

    @NotNull(message = "Les revenus mensuels sont obligatoires")
    @PositiveOrZero(message = "Les revenus doivent être positifs ou nuls")
    private Double revenusMensuels;

    @NotNull(message = "Les charges mensuelles sont obligatoires")
    @PositiveOrZero(message = "Les charges doivent être positives ou nulles")
    private Double chargesMensuelles;

    @NotNull(message = "L'historique financier est obligatoire")
    private HistoriqueFinancier historiqueFinancier;

    // ── Données bureau de crédit / auto-déclaration ───────────────────────
    // Ces champs alimentent directement le modèle ML sans approximation.
    // Source : rapport ESM/Quantik ou déclaration sur l'honneur du client.

    @NotNull(message = "Le nombre de retards 30-59 jours est obligatoire")
    @Min(value = 0, message = "Le nombre de retards ne peut pas être négatif")
    @Max(value = 98, message = "Valeur maximale : 98")
    private Integer nbRetards3059Jours;

    @NotNull(message = "Le nombre de retards 60-89 jours est obligatoire")
    @Min(value = 0, message = "Le nombre de retards ne peut pas être négatif")
    @Max(value = 98, message = "Valeur maximale : 98")
    private Integer nbRetards6089Jours;

    @NotNull(message = "Le nombre de retards 90 jours et plus est obligatoire")
    @Min(value = 0, message = "Le nombre de retards ne peut pas être négatif")
    @Max(value = 98, message = "Valeur maximale : 98")
    private Integer nbRetards90JoursPlus;

    @NotNull(message = "Le nombre de crédits ouverts est obligatoire")
    @Min(value = 0, message = "Le nombre de crédits ne peut pas être négatif")
    @Max(value = 58, message = "Valeur maximale : 58")
    private Integer nbCreditsOuverts;

    @NotNull(message = "Le nombre de prêts immobiliers est obligatoire")
    @Min(value = 0, message = "Le nombre de prêts immobiliers ne peut pas être négatif")
    @Max(value = 54, message = "Valeur maximale : 54")
    private Integer nbPretsImmobiliers;

    @NotNull(message = "Le nombre de personnes à charge est obligatoire")
    @Min(value = 0, message = "Le nombre de personnes à charge ne peut pas être négatif")
    @Max(value = 20, message = "Valeur maximale : 20")
    private Integer nbPersonnesACharge;

    /**
     * Taux d'utilisation du crédit renouvelable en pourcentage.
     * Calculé par le frontend depuis : (solde actuel / plafond autorisé) × 100.
     * Saisir 0 si le client ne détient pas de crédit renouvelable.
     */
    @NotNull(message = "Le taux d'utilisation du crédit renouvelable est obligatoire")
    @DecimalMin(value = "0.0", message = "Le taux ne peut pas être négatif")
    @DecimalMax(value = "100.0", message = "Le taux ne peut pas dépasser 100%")
    private Double utilisationCreditRenouvelable;
}
