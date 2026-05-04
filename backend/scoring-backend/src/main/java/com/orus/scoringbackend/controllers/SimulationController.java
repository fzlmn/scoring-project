package com.orus.scoringbackend.controllers;

import com.orus.scoringbackend.dto.request.SimulationRequest;
import com.orus.scoringbackend.dto.response.SimulationResponse;
import com.orus.scoringbackend.entities.User;
import com.orus.scoringbackend.services.SimulationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/simulations")
@RequiredArgsConstructor
public class SimulationController {

    private final SimulationService simulationService;

    @PostMapping
    @PreAuthorize("hasRole('SUPERVISEUR')")
    public ResponseEntity<SimulationResponse> simuler(@Valid @RequestBody SimulationRequest request,
                                                      @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(simulationService.simuler(request, user));
    }

    @GetMapping
    @PreAuthorize("hasRole('SUPERVISEUR')")
    public ResponseEntity<List<SimulationResponse>> getHistorique() {
        return ResponseEntity.ok(simulationService.getHistorique());
    }

    @GetMapping("/client/{clientId}")
    @PreAuthorize("hasRole('SUPERVISEUR')")
    public ResponseEntity<List<SimulationResponse>> getHistoriqueClient(@PathVariable Long clientId) {
        return ResponseEntity.ok(simulationService.getHistoriqueClient(clientId));
    }
}
