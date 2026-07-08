package com.orus.scoringbackend.services;

import com.orus.scoringbackend.dto.request.ScoreValidationRequest;
import com.orus.scoringbackend.dto.response.ExplicationResponse;
import com.orus.scoringbackend.dto.response.PageResponse;
import com.orus.scoringbackend.dto.response.ScoreResponse;
import com.orus.scoringbackend.dto.response.ScoreSummaryResponse;
import com.orus.scoringbackend.entities.Score;
import com.orus.scoringbackend.entities.User;
import com.orus.scoringbackend.enums.NiveauRisque;
import com.orus.scoringbackend.enums.StatutScore;
import com.orus.scoringbackend.exceptions.BusinessException;
import com.orus.scoringbackend.exceptions.ResourceNotFoundException;
import com.orus.scoringbackend.repositories.ScoreRepository;
import com.orus.scoringbackend.repositories.specifications.ScoreSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ScoreService {

    private final ScoreRepository scoreRepository;
    private final AlerteService alerteService;
    private final AuditLogService auditLogService;

    public List<ScoreResponse> getScoresEnAttente() {
        return scoreRepository.findByStatutOrderByCreatedAtDesc(StatutScore.EN_ATTENTE)
                .stream().map(ScoreService::mapToResponse).toList();
    }

    public List<ScoreResponse> getScoresClient(Long clientId) {
        return scoreRepository.findByClientIdOrderByCreatedAtDesc(clientId)
                .stream().map(ScoreService::mapToResponse).toList();
    }

    /**
     * Historique paginé des scores (le plus récent d'abord par défaut) avec filtres
     * optionnels — tout paramètre à null est ignoré. Ce module est réservé à
     * l'analyste (lecture seule) et au superviseur, qui voient tous les scores ;
     * le chargé de clientèle consulte les scores via ses clients.
     */
    public PageResponse<ScoreSummaryResponse> getScores(
            User user, StatutScore statut, NiveauRisque niveauRisque, Long clientId,
            LocalDate dateFrom, LocalDate dateTo, Pageable pageable) {

        Specification<Score> spec = ScoreSpecifications.withClient();
        if (statut != null)       spec = spec.and(ScoreSpecifications.hasStatut(statut));
        if (niveauRisque != null) spec = spec.and(ScoreSpecifications.hasNiveauRisque(niveauRisque));
        if (clientId != null)     spec = spec.and(ScoreSpecifications.forClient(clientId));
        if (dateFrom != null)     spec = spec.and(ScoreSpecifications.createdFrom(dateFrom.atStartOfDay()));
        if (dateTo != null)       spec = spec.and(ScoreSpecifications.createdUntil(dateTo.plusDays(1).atStartOfDay()));

        return PageResponse.from(
                scoreRepository.findAll(spec, pageable).map(ScoreService::mapToSummary));
    }

    // Bug 5 : endpoint individuel
    public ScoreResponse getScore(Long id) {
        Score score = scoreRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Score introuvable : " + id));
        return mapToResponse(score);
    }

    @Transactional
    public ScoreResponse validerScore(Long scoreId, ScoreValidationRequest request, User superviseur) {
        Score score = scoreRepository.findById(scoreId)
                .orElseThrow(() -> new ResourceNotFoundException("Score introuvable : " + scoreId));

        if (score.getStatut() != StatutScore.EN_ATTENTE) {
            throw new BusinessException("Ce score a déjà été traité (statut : " + score.getStatut() + ")");
        }
        if (request.getStatut() == StatutScore.EN_ATTENTE) {
            throw new BusinessException("Le statut cible ne peut pas être EN_ATTENTE");
        }

        score.setStatut(request.getStatut());
        score.setDecidedAt(LocalDateTime.now());
        score = scoreRepository.save(score);

        if (request.getStatut() == StatutScore.VALIDE) {
            alerteService.verifierEtGenererAlertes(score);
        }

        // Audit
        String action = request.getStatut() == StatutScore.VALIDE ? "VALIDATION_SCORE" : "REJET_SCORE";
        auditLogService.log(superviseur, action, "SCORE", scoreId);

        return mapToResponse(score);
    }

    public static ScoreResponse mapToResponse(Score s) {
        List<ExplicationResponse> explications = s.getExplications() == null ? List.of() :
                s.getExplications().stream()
                .map(e -> ExplicationResponse.builder()
                          .featureName(e.getFeatureName())
                          .shapValue(e.getShapValue())
                          .direction(e.isDirection())
                          .ordreImportance(e.getOrdreImportance())
                          .build())
                .toList();

        return ScoreResponse.builder()
                .id(s.getId())
                .clientId(s.getClient().getId())
                .clientNomComplet(s.getClient().getPrenom() + " " + s.getClient().getNom())
                .valeurScore(s.getValeurScore())
                .niveauRisque(s.getNiveauRisque())
                .statut(s.getStatut())
                .narration(s.getNarration())
                .versionModele(s.getVersionModele())
                .createdAt(s.getCreatedAt())
                .decidedAt(s.getDecidedAt())
                .explications(explications)
                .build();
    }

    public static ScoreSummaryResponse mapToSummary(Score s) {
        return ScoreSummaryResponse.builder()
                .id(s.getId())
                .clientId(s.getClient().getId())
                .clientNomComplet(s.getClient().getPrenom() + " " + s.getClient().getNom())
                .valeurScore(s.getValeurScore())
                .niveauRisque(s.getNiveauRisque())
                .statut(s.getStatut())
                .versionModele(s.getVersionModele())
                .createdAt(s.getCreatedAt())
                .decidedAt(s.getDecidedAt())
                .build();
    }
}