package com.orus.scoringbackend.services;

import com.orus.scoringbackend.dto.request.AlerteUpdateRequest;
import com.orus.scoringbackend.dto.response.AlerteResponse;
import com.orus.scoringbackend.entities.Alerte;
import com.orus.scoringbackend.entities.Client;
import com.orus.scoringbackend.entities.Score;
import com.orus.scoringbackend.enums.Criticite;
import com.orus.scoringbackend.enums.NiveauRisque;
import com.orus.scoringbackend.enums.StatutAlerte;
import com.orus.scoringbackend.enums.StatutScore;
import com.orus.scoringbackend.enums.TypeAlerte;
import com.orus.scoringbackend.exceptions.ResourceNotFoundException;
import com.orus.scoringbackend.repositories.AlerteRepository;
import com.orus.scoringbackend.repositories.ClientRepository;
import com.orus.scoringbackend.repositories.ScoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlerteService {

    private final AlerteRepository alerteRepository;
    private final ClientRepository clientRepository;
    private final ScoreRepository scoreRepository;

    @Value("${alertes.analyse-expiree-jours:90}")
    private long analyseExpireeJours;

    /** Point d'entrée historique (appelé à la validation d'un score). */
    public void verifierEtGenererAlertes(Score score) {
        if (score != null) genererAlertesPourClient(score.getClient(), score, false);
    }

    /**
     * Moteur de règles : évalue toutes les règles métier calculables pour un client
     * et persiste les alertes manquantes de façon idempotente (pas de doublon tant
     * qu'une alerte ouverte du même type existe pour ce client).
     * Pas de @Transactional propre : la méthode s'exécute dans la transaction de
     * l'appelant (création/modification/validation), ce qui permet de l'envelopper
     * dans un try/catch sans empoisonner la transaction parente.
     */
    public void genererAlertesPourClient(Client client, Score dernierScore, boolean recalcul) {
        if (client == null || client.getId() == null) return;

        // 1. Données incohérentes (taux d'endettement > 100%)
        Double taux = client.getTauxEndettement();
        if (taux != null && taux > 100) {
            creer(client, dernierScore, TypeAlerte.DONNEES_INCOHERENTES, Criticite.ELEVEE,
                    "Taux d'endettement incohérent : " + String.format("%.1f", taux) + "% (supérieur à 100%)");
        }

        // 1b. Règle métier : taux d'endettement élevé (≥ 50%)
        if (taux != null && taux >= IaService.SEUIL_ENDETTEMENT_ELEVE) {
            creer(client, dernierScore, TypeAlerte.ENDETTEMENT_ELEVE, Criticite.ELEVEE,
                    "Taux d'endettement élevé : " + String.format("%.1f", taux) + "% (≥ "
                            + String.format("%.0f", IaService.SEUIL_ENDETTEMENT_ELEVE) + "%).");
        }

        // 2. Documents / données obligatoires manquantes (proxy : revenus non renseignés)
        if (client.getRevenusMensuels() == null || client.getRevenusMensuels() <= 0) {
            creer(client, dernierScore, TypeAlerte.DOCUMENTS_MANQUANTS, Criticite.MOYENNE,
                    "Données financières incomplètes (revenus mensuels manquants ou nuls).");
        }

        if (dernierScore == null) return;
        String nom = client.getPrenom() + " " + client.getNom();
        Double valeur = dernierScore.getValeurScore();

        // 3. Client à haut risque
        if (dernierScore.getNiveauRisque() == NiveauRisque.ELEVE) {
            Criticite crit = (valeur != null && valeur > 80) ? Criticite.CRITIQUE : Criticite.ELEVEE;
            creer(client, dernierScore, TypeAlerte.SCORE_ELEVE, crit,
                    "Le client " + nom + " présente un risque élevé (score "
                            + String.format("%.1f", valeur) + "/100).");
        }

        // 4. Validation en attente / score à revoir
        if (dernierScore.getStatut() == StatutScore.EN_ATTENTE) {
            if (dernierScore.getNiveauRisque() == NiveauRisque.ELEVE) {
                creer(client, dernierScore, TypeAlerte.SCORE_A_REVOIR, Criticite.ELEVEE,
                        "Score à haut risque en attente de revue pour " + nom + ".");
            } else {
                creer(client, dernierScore, TypeAlerte.VALIDATION_EN_ATTENTE, Criticite.MOYENNE,
                        "Score en attente de validation pour " + nom + ".");
            }
        }

        // 5. Analyse expirée
        if (dernierScore.getCreatedAt() != null
                && dernierScore.getCreatedAt().isBefore(LocalDateTime.now().minusDays(analyseExpireeJours))) {
            creer(client, dernierScore, TypeAlerte.ANALYSE_EXPIREE, Criticite.MOYENNE,
                    "L'analyse de " + nom + " date de plus de " + analyseExpireeJours
                            + " jours et doit être actualisée.");
        }

        // 6. Score récemment recalculé (informatif)
        if (recalcul) {
            creer(client, dernierScore, TypeAlerte.SCORE_RECALCULE, Criticite.FAIBLE,
                    "Le score de " + nom + " a été recalculé ("
                            + String.format("%.1f", valeur) + "/100).");
        }
    }

    /** Crée l'alerte seulement si aucune alerte ouverte (NON_LUE) du même type n'existe déjà. */
    private void creer(Client client, Score score, TypeAlerte type, Criticite criticite, String description) {
        if (alerteRepository.existsByClientIdAndTypeAlerteAndStatut(client.getId(), type, StatutAlerte.NON_LUE)) {
            return;
        }
        alerteRepository.save(Alerte.builder()
                .client(client)
                .score(score)
                .typeAlerte(type)
                .criticite(criticite)
                .statut(StatutAlerte.NON_LUE)
                .description(description)
                .build());
    }

    /** Réévalue les alertes pour tous les clients (job planifié + endpoint admin). */
    @Transactional
    public int regenererPourTousLesClients() {
        int n = 0;
        for (Client client : clientRepository.findAll()) {
            Score dernier = scoreRepository.findTopByClientIdOrderByCreatedAtDesc(client.getId()).orElse(null);
            genererAlertesPourClient(client, dernier, false);
            n++;
        }
        log.info("Régénération des alertes terminée pour {} client(s)", n);
        return n;
    }

    /** Job quotidien (02h00) : capte notamment les analyses expirées. */
    @Scheduled(cron = "0 0 2 * * *")
    public void regenerationPlanifiee() {
        try {
            regenererPourTousLesClients();
        } catch (Exception e) {
            log.error("Échec de la régénération planifiée des alertes : {}", e.getMessage(), e);
        }
    }

    public List<AlerteResponse> getAlertesNonLues() {
        return alerteRepository.findByStatutOrderByCreatedAtDesc(StatutAlerte.NON_LUE)
                .stream().map(this::mapToResponse).toList();
    }

    public List<AlerteResponse> getAllAlertes() {
        return alerteRepository.findAll().stream()
                .map(this::mapToResponse).toList();
    }

    public Map<String, Long> getSummary() {
        long total = alerteRepository.count();
        long nonLues = alerteRepository.countByStatut(StatutAlerte.NON_LUE);
        long critiques = alerteRepository.findByStatutOrderByCreatedAtDesc(StatutAlerte.NON_LUE).stream()
                .filter(a -> a.getCriticite() == Criticite.ELEVEE || a.getCriticite() == Criticite.CRITIQUE)
                .count();
        return Map.of("total", total, "nonLues", nonLues, "critiques", critiques);
    }

    @Transactional
    public AlerteResponse updateStatut(Long id, AlerteUpdateRequest request) {
        Alerte alerte = alerteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alerte introuvable : " + id));
        alerte.setStatut(request.getStatut());
        return mapToResponse(alerteRepository.save(alerte));
    }

    private AlerteResponse mapToResponse(Alerte a) {
        return AlerteResponse.builder()
                .id(a.getId())
                .clientId(a.getClient().getId())
                .clientNomComplet(a.getClient().getPrenom() + " " + a.getClient().getNom())
                .scoreId(a.getScore() != null ? a.getScore().getId() : null)
                .typeAlerte(a.getTypeAlerte())
                .criticite(a.getCriticite())
                .statut(a.getStatut())
                .description(a.getDescription())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
