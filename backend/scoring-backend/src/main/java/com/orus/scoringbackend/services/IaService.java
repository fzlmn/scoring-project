package com.orus.scoringbackend.services;

import com.orus.scoringbackend.entities.Client;
import com.orus.scoringbackend.entities.Score;
import com.orus.scoringbackend.enums.NiveauRisque;
import com.orus.scoringbackend.enums.StatutScore;
import com.orus.scoringbackend.repositories.ScoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class IaService {

    private final ScoreRepository scoreRepository;
    private final RestTemplate restTemplate;

    @Value("${ia.service.url:http://localhost:8000}")
    private String iaServiceUrl;

    private final boolean iaEnabled = true;

    public Score calculerEtSauvegarderScore(Client client) {
        if (!iaEnabled) {
            log.info("Service IA désactivé — score non calculé pour le client {}", client.getId());
            return null;
        }

        try {
            int age = java.time.Period.between(client.getDateNaissance(),
                    java.time.LocalDate.now()).getYears();
            double tauxEndettement = client.getTauxEndettement() != null ? client.getTauxEndettement() : 0.0;

            // ── PREPROCESSING LOCAL POUR ALIGNEMENT FASTAPI ──
            double historiqueNum = 1.0; // Valeur par défaut : MOYEN
            if (client.getHistoriqueFinancier() != null) {
                switch (client.getHistoriqueFinancier()) {
                    case BON -> historiqueNum = 0.0;
                    case MOYEN -> historiqueNum = 1.0;
                    case MAUVAIS -> historiqueNum = 2.0;
                }
            }

            String situationProValue = "salarie";
            if (client.getSituationPro() != null) {
                situationProValue = client.getSituationPro().name().toLowerCase();
            }
            // ─────────────────────────────────────────────────

            Map<String, Object> payload = Map.of(
                    "age", age,
                    "situation_pro", situationProValue,
                    "historique_financier", historiqueNum,
                    "revenus_mensuels", client.getRevenusMensuels(),
                    "charges_mensuelles", client.getChargesMensuelles(),
                    "taux_endettement", tauxEndettement,
                    "montant_demande", 0.0
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> result = restTemplate.postForObject(
                    iaServiceUrl + "/predict", payload, Map.class);

            if (result == null) throw new RuntimeException("Réponse vide du service IA");

            double valeurScore = ((Number) result.get("score")).doubleValue();
            String narration = (String) result.get("narration");
            NiveauRisque niveau = determinerNiveau(valeurScore);

            Score score = Score.builder()
                    .client(client)
                    .valeurScore(valeurScore)
                    .niveauRisque(niveau)
                    .statut(StatutScore.EN_ATTENTE)
                    .narration(narration)
                    .versionModele("v1.0")
                    .build();

            return scoreRepository.save(score);

        } catch (Exception e) {
            log.error("Erreur lors du scoring IA pour le client {} : {}", client.getId(), e.getMessage());
            return null;
        }
    }

    private NiveauRisque determinerNiveau(double score) {
        if (score <= 30) return NiveauRisque.FAIBLE;
        if (score <= 60) return NiveauRisque.MOYEN;
        return NiveauRisque.ELEVE;
    }
}