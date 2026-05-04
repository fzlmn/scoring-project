package com.orus.scoringbackend.dto.request;

import com.orus.scoringbackend.enums.HistoriqueFinancier;
import com.orus.scoringbackend.enums.SituationPro;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;

@Data
public class ClientRequest {

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

    @NotNull
    @PositiveOrZero(message = "Les revenus doivent être positifs") //just edited this, it was @Positive only at first so it won't accept 0.00
    private Double revenusMensuels;

    @NotNull
    @PositiveOrZero(message = "Les charges doivent être positives ou nulles")
    private Double chargesMensuelles;

    @NotNull(message = "L'historique financier est obligatoire")
    private HistoriqueFinancier historiqueFinancier;

}
