package com.orus.scoringbackend.services;

import com.orus.scoringbackend.dto.request.AlerteUpdateRequest;
import com.orus.scoringbackend.dto.response.AlerteResponse;
import com.orus.scoringbackend.entities.Alerte;
import com.orus.scoringbackend.entities.Score;
import com.orus.scoringbackend.enums.Criticite;
import com.orus.scoringbackend.enums.StatutAlerte;
import com.orus.scoringbackend.enums.TypeAlerte;
import com.orus.scoringbackend.exceptions.ResourceNotFoundException;
import com.orus.scoringbackend.repositories.AlerteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AlerteService {

    private final AlerteRepository alerteRepository;

    public void verifierEtGenererAlertes(Score score) {
        // Alerte score élevé
        if (score.getValeurScore() > 60) {
            Alerte alerte = Alerte.builder()
                    .client(score.getClient())
                    .score(score)
                    .typeAlerte(TypeAlerte.SCORE_ELEVE)
                    .criticite(score.getValeurScore() > 80 ? Criticite.ELEVEE : Criticite.MOYENNE)
                    .statut(StatutAlerte.NON_LUE)
                    .description("Le client " + score.getClient().getPrenom() + " " +
                            score.getClient().getNom() + " a un score de risque élevé : " +
                            String.format("%.1f", score.getValeurScore()) + "/100")
                    .build();
            alerteRepository.save(alerte);
        }

        // Alerte taux d'endettement incohérent
        Double taux = score.getClient().getTauxEndettement();
        if (taux != null && taux > 100) {
            Alerte alerte = Alerte.builder()
                    .client(score.getClient())
                    .score(score)
                    .typeAlerte(TypeAlerte.DONNEES_INCOHERENTES)
                    .criticite(Criticite.ELEVEE)
                    .statut(StatutAlerte.NON_LUE)
                    .description("Taux d'endettement incohérent : " +
                            String.format("%.1f", taux) + "% (supérieur à 100%)")
                    .build();
            alerteRepository.save(alerte);
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