package com.orus.scoringbackend.dto.request;

import com.orus.scoringbackend.enums.HistoriqueFinancier;
import com.orus.scoringbackend.enums.SituationPro;
import jakarta.validation.constraints.*;
import lombok.Data;

/**
 * Simulation « what-if » : le client cible est immuable (identité), mais toutes les
 * données financières et de scoring peuvent être surchargées. Les champs nuls
 * conservent la valeur réelle du client.
 */
@Data
public class SimulationRequest {

    @NotNull
    private Long clientId;

    // ── Données financières de base (toujours envoyées par le formulaire) ──
    @NotNull @Positive
    private Double revenusSimules;

    @NotNull @PositiveOrZero
    private Double chargesSimulees;

    // ── Autres données financières / de scoring surchargeables (optionnelles) ──
    private SituationPro situationPro;

    private HistoriqueFinancier historiqueFinancier;

    @PositiveOrZero
    private Integer nbRetards3059Jours;

    @PositiveOrZero
    private Integer nbRetards6089Jours;

    @PositiveOrZero
    private Integer nbRetards90JoursPlus;

    @PositiveOrZero
    private Integer nbCreditsOuverts;

    @PositiveOrZero
    private Integer nbPretsImmobiliers;

    @PositiveOrZero
    private Integer nbPersonnesACharge;

    @PositiveOrZero @DecimalMax("100.0")
    private Double utilisationCreditRenouvelable;

    // Montants source du crédit renouvelable simulé (optionnels) : conservés dans
    // les paramètres de la simulation pour afficher le trio complet dans l'historique.
    @PositiveOrZero
    private Double plafondCredit;

    @PositiveOrZero
    private Double soldeCredit;
}
