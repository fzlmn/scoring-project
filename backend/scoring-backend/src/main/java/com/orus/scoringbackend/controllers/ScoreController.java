package com.orus.scoringbackend.controllers;

import com.orus.scoringbackend.dto.request.ScoreValidationRequest;
import com.orus.scoringbackend.dto.response.PageResponse;
import com.orus.scoringbackend.dto.response.ScoreResponse;
import com.orus.scoringbackend.dto.response.ScoreSummaryResponse;
import com.orus.scoringbackend.entities.User;
import com.orus.scoringbackend.enums.NiveauRisque;
import com.orus.scoringbackend.enums.StatutScore;
import com.orus.scoringbackend.services.ScoreService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/scores")
@RequiredArgsConstructor
public class ScoreController {

    private final ScoreService scoreService;

    /**
     * Historique paginé des scores (le plus récent d'abord), filtres optionnels.
     * Analyste : lecture seule sur tous les scores. Superviseur : accès complet.
     * Le chargé de clientèle consulte les scores via ses clients (pas ce module) ;
     * l'administrateur n'a pas d'accès opérationnel aux scores.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ANALYSTE','SUPERVISEUR')")
    public ResponseEntity<PageResponse<ScoreSummaryResponse>> getScores(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) StatutScore statut,
            @RequestParam(required = false) NiveauRisque niveauRisque,
            @RequestParam(required = false) Long clientId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(
                scoreService.getScores(user, statut, niveauRisque, clientId, dateFrom, dateTo, pageable));
    }

    @GetMapping("/en-attente")
    @PreAuthorize("hasRole('SUPERVISEUR')")
    public ResponseEntity<List<ScoreResponse>> getEnAttente() {
        return ResponseEntity.ok(scoreService.getScoresEnAttente());
    }

    @GetMapping("/client/{clientId}")
    @PreAuthorize("hasAnyRole('CHARGE_CLIENTELE','ANALYSTE','SUPERVISEUR')")
    public ResponseEntity<List<ScoreResponse>> getScoresClient(@PathVariable Long clientId) {
        return ResponseEntity.ok(scoreService.getScoresClient(clientId));
    }

    // Bug 5 fix
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CHARGE_CLIENTELE','ANALYSTE','SUPERVISEUR')")
    public ResponseEntity<ScoreResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(scoreService.getScore(id));
    }

    @PatchMapping("/{id}/valider")
    @PreAuthorize("hasRole('SUPERVISEUR')")
    public ResponseEntity<ScoreResponse> valider(@PathVariable Long id,
                                                 @Valid @RequestBody ScoreValidationRequest request,
                                                 @AuthenticationPrincipal User superviseur) {
        return ResponseEntity.ok(scoreService.validerScore(id, request, superviseur));
    }
}