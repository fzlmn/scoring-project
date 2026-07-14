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
    private Double tauxEndettement; // calculé automatiquement via @PrePersist / @PreUpdate

    @Enumerated(EnumType.STRING)
    @Column(name = "historique_financier", nullable = false)
    private HistoriqueFinancier historiqueFinancier;

    // ── Données bureau de crédit / auto-déclaration ──────────────────────

    /** Nombre de fois où le client a eu un retard de 30 à 59 jours (non worsened). */
    @Column(name = "nb_retards_30_59_jours", nullable = false)
    @Builder.Default
    private Integer nbRetards3059Jours = 0;

    /** Nombre de fois où le client a eu un retard de 60 à 89 jours. */
    @Column(name = "nb_retards_60_89_jours", nullable = false)
    @Builder.Default
    private Integer nbRetards6089Jours = 0;

    /** Nombre de fois où le client a eu un retard de 90 jours ou plus. */
    @Column(name = "nb_retards_90_jours_plus", nullable = false)
    @Builder.Default
    private Integer nbRetards90JoursPlus = 0;

    /** Nombre total de lignes de crédit et prêts ouverts (toutes institutions). */
    @Column(name = "nb_credits_ouverts", nullable = false)
    @Builder.Default
    private Integer nbCreditsOuverts = 0;

    /** Nombre de prêts immobiliers en cours. */
    @Column(name = "nb_prets_immobiliers", nullable = false)
    @Builder.Default
    private Integer nbPretsImmobiliers = 0;

    /** Nombre de personnes à la charge financière du client. */
    @Column(name = "nb_personnes_a_charge", nullable = false)
    @Builder.Default
    private Integer nbPersonnesACharge = 0;

    /**
     * Taux d'utilisation du crédit renouvelable en pourcentage (0.0 à 100.0).
     * Calculé depuis le plafond et le solde déclarés par le client.
     * 0.0 si le client ne détient pas de carte de crédit renouvelable.
     */
    @Column(name = "utilisation_credit_renouvelable", nullable = false)
    @Builder.Default
    private Double utilisationCreditRenouvelable = 0.0;

    /**
     * Plafond du crédit renouvelable en DH (montant source, nullable).
     * Conservé pour retrouver les valeurs d'origine (modification, simulation).
     */
    @Column(name = "plafond_credit")
    private Double plafondCredit;

    /** Solde utilisé du crédit renouvelable en DH (montant source, nullable). */
    @Column(name = "solde_credit")
    private Double soldeCredit;

    // ── Relations ─────────────────────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "client", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Score> scores = new ArrayList<>();

    // ── Hooks JPA ─────────────────────────────────────────────────────────

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        calculerTauxEndettement();
        calculerUtilisationCredit();
        initialiserDefauts();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        calculerTauxEndettement();
        calculerUtilisationCredit();
    }

    public void calculerTauxEndettement() {
        if (revenusMensuels != null && revenusMensuels > 0) {
            this.tauxEndettement = (chargesMensuelles / revenusMensuels) * 100;
        } else {
            this.tauxEndettement = 0.0;
        }
    }

    /**
     * Recalcule le taux d'utilisation à partir du plafond et du solde, quand ils
     * sont renseignés (source de vérité). Formule identique au frontend :
     * min(solde / plafond × 100, 100), arrondie à 2 décimales. Si le plafond n'est
     * pas fourni (client antérieur à V6 ou sans crédit renouvelable), le pourcentage
     * déjà présent est conservé — le payload ML reste inchangé dans tous les cas.
     */
    public void calculerUtilisationCredit() {
        if (plafondCredit != null && plafondCredit > 0) {
            double solde = soldeCredit != null ? soldeCredit : 0.0;
            double ratio = Math.min((solde / plafondCredit) * 100.0, 100.0);
            this.utilisationCreditRenouvelable = Math.round(ratio * 100.0) / 100.0;
        }
    }

    /** Garantit que les champs optionnels ne sont jamais null en base. */
    private void initialiserDefauts() {
        if (nbRetards3059Jours == null)          nbRetards3059Jours = 0;
        if (nbRetards6089Jours == null)          nbRetards6089Jours = 0;
        if (nbRetards90JoursPlus == null)        nbRetards90JoursPlus = 0;
        if (nbCreditsOuverts == null)            nbCreditsOuverts = 0;
        if (nbPretsImmobiliers == null)          nbPretsImmobiliers = 0;
        if (nbPersonnesACharge == null)          nbPersonnesACharge = 0;
        if (utilisationCreditRenouvelable == null) utilisationCreditRenouvelable = 0.0;
    }
}
