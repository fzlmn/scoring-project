package com.orus.scoringbackend.controllers;

import com.orus.scoringbackend.dto.response.DashboardResponse;
import com.orus.scoringbackend.dto.response.DashboardResponse.CategoryCount;
import com.orus.scoringbackend.dto.response.DashboardResponse.DecisionPoint;
import com.orus.scoringbackend.entities.User;
import com.orus.scoringbackend.services.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DashboardResponse> getDashboard(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(dashboardService.getDashboard(user.getRole(), user.getId()));
    }

    // ── Widgets d'évolution : chacun choisit sa propre période, se rafraîchit seul ──

    @GetMapping("/evolution/validations")
    @PreAuthorize("hasAnyRole('ANALYSTE','SUPERVISEUR')")
    public ResponseEntity<List<DecisionPoint>> evolutionValidations(
            @RequestParam(defaultValue = "jour") String periode) {
        return ResponseEntity.ok(dashboardService.evolutionValidations(periode));
    }

    @GetMapping("/evolution/scores")
    @PreAuthorize("hasAnyRole('ANALYSTE','SUPERVISEUR')")
    public ResponseEntity<List<CategoryCount>> evolutionScores(
            @RequestParam(defaultValue = "jour") String periode) {
        return ResponseEntity.ok(dashboardService.evolutionScores(periode));
    }

    @GetMapping("/evolution/alertes")
    @PreAuthorize("hasRole('SUPERVISEUR')")
    public ResponseEntity<List<CategoryCount>> evolutionAlertes(
            @RequestParam(defaultValue = "jour") String periode) {
        return ResponseEntity.ok(dashboardService.evolutionAlertes(periode));
    }

    @GetMapping("/evolution/clients")
    @PreAuthorize("hasRole('CHARGE_CLIENTELE')")
    public ResponseEntity<List<CategoryCount>> evolutionClients(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "mois") String periode) {
        return ResponseEntity.ok(dashboardService.evolutionClientsCrees(user.getId(), periode));
    }
}
