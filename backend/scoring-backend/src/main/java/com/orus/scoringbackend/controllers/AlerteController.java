package com.orus.scoringbackend.controllers;

import com.orus.scoringbackend.dto.request.AlerteUpdateRequest;
import com.orus.scoringbackend.dto.response.AlerteResponse;
import com.orus.scoringbackend.services.AlerteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alertes")
@RequiredArgsConstructor
public class AlerteController {

    private final AlerteService alerteService;

    @GetMapping
    @PreAuthorize("hasRole('SUPERVISEUR')")
    public ResponseEntity<List<AlerteResponse>> getAll() {
        return ResponseEntity.ok(alerteService.getAllAlertes());
    }

    @GetMapping("/non-lues")
    @PreAuthorize("hasRole('SUPERVISEUR')")
    public ResponseEntity<List<AlerteResponse>> getNonLues() {
        return ResponseEntity.ok(alerteService.getAlertesNonLues());
    }

    @PatchMapping("/{id}/statut")
    @PreAuthorize("hasRole('SUPERVISEUR')")
    public ResponseEntity<AlerteResponse> updateStatut(@PathVariable Long id,
                                                       @Valid @RequestBody AlerteUpdateRequest request) {
        return ResponseEntity.ok(alerteService.updateStatut(id, request));
    }
}
