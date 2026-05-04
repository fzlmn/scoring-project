package com.orus.scoringbackend.controllers;

import com.orus.scoringbackend.dto.request.ScoreValidationRequest;
import com.orus.scoringbackend.dto.response.ScoreResponse;
import com.orus.scoringbackend.services.ScoreService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/scores")
@RequiredArgsConstructor
public class ScoreController {

    private final ScoreService scoreService;

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

    @PatchMapping("/{id}/valider")
    @PreAuthorize("hasRole('SUPERVISEUR')")
    public ResponseEntity<ScoreResponse> valider(@PathVariable Long id,
                                                 @Valid @RequestBody ScoreValidationRequest request) {
        return ResponseEntity.ok(scoreService.validerScore(id, request));
    }
}
