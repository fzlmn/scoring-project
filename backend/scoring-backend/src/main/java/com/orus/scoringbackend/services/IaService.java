package com.orus.scoringbackend.services;

import com.orus.scoringbackend.entities.Client;
import com.orus.scoringbackend.entities.Explication;
import com.orus.scoringbackend.entities.Score;
import com.orus.scoringbackend.enums.HistoriqueFinancier;
import com.orus.scoringbackend.enums.NiveauRisque;
import com.orus.scoringbackend.enums.StatutScore;
import com.orus.scoringbackend.repositories.ScoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class IaService {

    /** Seuil métier : au-delà, le taux d'endettement escalade le risque et déclenche une alerte. */
    public static final double SEUIL_ENDETTEMENT_ELEVE = 50.0;

    private final ScoreRepository scoreRepository;
    private final RestTemplate restTemplate;

    @Value("${ia.service.url:http://localhost:8000}")
    private String iaServiceUrl;

    @Value("${ia.service.enabled:true}")
    private boolean iaEnabled;

    /**
     * Taux de conversion MAD → USD. Le modèle a été entraîné sur des revenus en USD
     * (dataset GMSC, médiane ≈ 5 400 USD). On convertit les montants avant l'envoi
     * pour rester sur l'échelle apprise par le modèle.
     */
    @Value("${ia.mad-to-usd-rate:10.0}")
    private double madToUsdRate;

    public Score calculerEtSauvegarderScore(Client client, Long calculatedById) {
        if (!iaEnabled) {
            log.info("Service IA désactivé — score non calculé pour le client {}", client.getId());
            return null;
        }

        try {
            Map<String, Object> payload = buildPayload(client);
            log.info("Payload IA — client {} : {}", client.getId(), payload);

            @SuppressWarnings("unchecked")
            Map<String, Object> result = restTemplate.postForObject(
                    iaServiceUrl + "/predict", payload, Map.class);

            if (result == null) throw new RuntimeException("Réponse vide du service IA");

            double valeurScore = ((Number) result.get("score")).doubleValue();
            String narration   = (String) result.get("narration");
            // Version du modèle fournie par le service ML (métadonnées d'entraînement) ;
            // repli sur "v1.0" si un service antérieur ne renvoie pas le champ.
            Object versionMl = result.get("version_modele");
            String versionModele = versionMl != null ? versionMl.toString() : "v1.0";
            // On fait confiance au niveau calibré renvoyé par le modèle.
            NiveauRisque niveau = resoudreNiveau(result.get("niveau_risque"), valeurScore);

            // Règle métier : le taux d'endettement ≥ 50% escalade le risque et l'explique.
            RiskDecision decision = appliquerRegleEndettement(niveau, narration, client.getTauxEndettement());

            Score score = Score.builder()
                    .client(client)
                    .valeurScore(valeurScore)
                    .niveauRisque(decision.niveau())
                    .statut(StatutScore.EN_ATTENTE)
                    .narration(decision.narration())
                    .versionModele(versionModele)
                    .calculatedBy(calculatedById)
                    .build();

            // Persistance des facteurs SHAP (cascade ALL depuis Score)
            score.setExplications(mapExplications(result.get("facteurs"), score));

            log.info("Score calculé — client {} : {}/100 ({}), {} facteur(s) SHAP",
                    client.getId(), valeurScore, niveau, score.getExplications().size());
            return scoreRepository.save(score);

        } catch (Exception e) {
            log.error("Erreur lors du scoring IA pour le client {} : {}",
                    client.getId(), e.getMessage(), e);
            return null;
        }
    }

    /** Construit le payload des 14 features réelles attendues par le modèle. */
    public Map<String, Object> buildPayload(Client client) {
        return buildPayload(client, null);
    }

    /**
     * Construit le payload des 14 features. Pour une simulation, {@code ov} peut surcharger
     * n'importe quelle donnée financière / de scoring (montants en MAD) ; les champs non
     * surchargés proviennent du client, et l'âge (donnée d'identité) reste toujours celui
     * du client. Les noms de clés correspondent exactement aux feature_cols du modèle entraîné.
     */
    public Map<String, Object> buildPayload(Client client, SimulationOverrides ov) {
        if (ov == null) ov = SimulationOverrides.EMPTY;

        int age = java.time.Period.between(
                client.getDateNaissance(), java.time.LocalDate.now()).getYears();

        Double revenusVal = eff(ov.revenusMensuels(), client.getRevenusMensuels());
        Double chargesVal = eff(ov.chargesMensuelles(), client.getChargesMensuelles());
        double revenusMad = revenusVal != null ? revenusVal : 0.0;
        double chargesMad = chargesVal != null ? chargesVal : 0.0;

        // Revenus convertis sur l'échelle d'entraînement (USD)
        double revenusUsd = madToUsdRate > 0 ? revenusMad / madToUsdRate : revenusMad;

        // DebtRatio = ratio charges/revenus (invariant à la devise), comme à l'entraînement
        double debtRatio = revenusMad > 0 ? chargesMad / revenusMad : 0.0;

        // charges_mensuelles : même définition qu'au notebook 02 = DebtRatio × MonthlyIncome
        double chargesFeature = debtRatio * revenusUsd;

        // Encodage historique : 0.0 = BON, 1.0 = MOYEN, 2.0 = MAUVAIS
        HistoriqueFinancier historique = eff(ov.historiqueFinancier(), client.getHistoriqueFinancier());
        double historiqueNum = switch (historique) {
            case BON     -> 0.0;
            case MOYEN   -> 1.0;
            case MAUVAIS -> 2.0;
        };

        int r30 = nz(eff(ov.nbRetards3059Jours(), client.getNbRetards3059Jours()));
        int r60 = nz(eff(ov.nbRetards6089Jours(), client.getNbRetards6089Jours()));
        int r90 = nz(eff(ov.nbRetards90JoursPlus(), client.getNbRetards90JoursPlus()));
        // score_retards : mêmes poids qu'au notebook 02 (30-59j=1, 60-89j=2, 90j+=3)
        double scoreRetards = r30 * 1.0 + r60 * 2.0 + r90 * 3.0;

        int creditsOuverts   = nz(eff(ov.nbCreditsOuverts(), client.getNbCreditsOuverts()));
        int pretsImmobiliers = nz(eff(ov.nbPretsImmobiliers(), client.getNbPretsImmobiliers()));
        int nbCreditsTotal   = creditsOuverts + pretsImmobiliers;

        // utilisation stockée en %, le modèle attend [0, 1]
        Double utilVal = eff(ov.utilisationCreditRenouvelable(), client.getUtilisationCreditRenouvelable());
        double utilisationRatio = (utilVal != null ? utilVal : 0.0) / 100.0;

        int dependents = nz(eff(ov.nbPersonnesACharge(), client.getNbPersonnesACharge()));

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("RevolvingUtilizationOfUnsecuredLines", utilisationRatio);
        payload.put("age", age);
        payload.put("NumberOfTime30-59DaysPastDueNotWorse", (double) r30);
        payload.put("DebtRatio", debtRatio);
        payload.put("MonthlyIncome", revenusUsd);
        payload.put("NumberOfOpenCreditLinesAndLoans", (double) creditsOuverts);
        payload.put("NumberOfTimes90DaysLate", (double) r90);
        payload.put("NumberRealEstateLoansOrLines", (double) pretsImmobiliers);
        payload.put("NumberOfTime60-89DaysPastDueNotWorse", (double) r60);
        payload.put("NumberOfDependents", (double) dependents);
        payload.put("charges_mensuelles", chargesFeature);
        payload.put("score_retards", scoreRetards);
        payload.put("historique_financier", historiqueNum);
        payload.put("nb_credits_total", (double) nbCreditsTotal);
        return payload;
    }

    /** Résultat d'une règle métier post-scoring : niveau (éventuellement escaladé) + narration enrichie. */
    public record RiskDecision(NiveauRisque niveau, String narration) {}

    /**
     * Règle métier « taux d'endettement élevé » (≥ {@value #SEUIL_ENDETTEMENT_ELEVE}%) :
     * plancher le niveau de risque à MOYEN (FAIBLE → MOYEN ; MOYEN/ELEVE inchangés) et
     * indiquer explicitement dans la narration que ce critère a contribué au risque évalué.
     * Appliquée de façon identique au scoring réel et aux simulations.
     */
    public RiskDecision appliquerRegleEndettement(NiveauRisque niveau, String narration, Double tauxPct) {
        if (tauxPct == null || tauxPct < SEUIL_ENDETTEMENT_ELEVE) {
            return new RiskDecision(niveau, narration);
        }
        NiveauRisque escalade = (niveau == NiveauRisque.FAIBLE) ? NiveauRisque.MOYEN : niveau;
        String note = String.format(
                "⚠ Taux d'endettement élevé (%.1f%%, ≥ %.0f%%) : ce critère a contribué au niveau de risque évalué.",
                tauxPct, SEUIL_ENDETTEMENT_ELEVE);
        String narrationEnrichie = (narration == null || narration.isBlank())
                ? note : narration.trim() + "\n\n" + note;
        return new RiskDecision(escalade, narrationEnrichie);
    }

    /** Traduit le niveau renvoyé par la cascade du modèle ; repli sur les seuils si absent/invalide. */
    public NiveauRisque resoudreNiveau(Object niveauMl, double score) {
        if (niveauMl != null) {
            try {
                return NiveauRisque.valueOf(niveauMl.toString().trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
                log.warn("Niveau ML inattendu '{}' — repli sur les seuils numériques", niveauMl);
            }
        }
        return determinerNiveau(score);
    }

    private List<Explication> mapExplications(Object facteursRaw, Score score) {
        List<Explication> explications = new ArrayList<>();
        if (facteursRaw instanceof List<?> facteurs) {
            for (Object o : facteurs) {
                if (o instanceof Map<?, ?> f && f.get("feature_name") != null) {
                    explications.add(Explication.builder()
                            .score(score)
                            .featureName(String.valueOf(f.get("feature_name")))
                            .shapValue(((Number) f.get("shap_value")).doubleValue())
                            .direction(Boolean.TRUE.equals(f.get("direction")))
                            .ordreImportance(((Number) f.get("ordre_importance")).intValue())
                            .build());
                }
            }
        }
        return explications;
    }

    private int nz(Integer v) { return v != null ? v : 0; }

    /** Valeur surchargée si présente, sinon valeur du client. */
    private static <T> T eff(T override, T base) { return override != null ? override : base; }

    /**
     * Surcharges de simulation « what-if » : chaque champ non nul remplace la donnée
     * du client dans le calcul du score. Les données d'identité (nom, prénom, CIN,
     * date de naissance, contacts) ne sont jamais surchargeables.
     */
    public record SimulationOverrides(
            Double revenusMensuels,
            Double chargesMensuelles,
            HistoriqueFinancier historiqueFinancier,
            Integer nbRetards3059Jours,
            Integer nbRetards6089Jours,
            Integer nbRetards90JoursPlus,
            Integer nbCreditsOuverts,
            Integer nbPretsImmobiliers,
            Integer nbPersonnesACharge,
            Double utilisationCreditRenouvelable) {

        public static final SimulationOverrides EMPTY = new SimulationOverrides(
                null, null, null, null, null, null, null, null, null, null);
    }

    /** Repli historique : niveau dérivé des seuils numériques 30 / 60. */
    private NiveauRisque determinerNiveau(double score) {
        if (score <= 30) return NiveauRisque.FAIBLE;
        if (score <= 60) return NiveauRisque.MOYEN;
        return NiveauRisque.ELEVE;
    }
}
