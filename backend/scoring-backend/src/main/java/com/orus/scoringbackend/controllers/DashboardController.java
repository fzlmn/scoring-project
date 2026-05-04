package com.orus.scoringbackend.controllers;

import com.orus.scoringbackend.dto.response.DashboardResponse;
import com.orus.scoringbackend.services.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ANALYSTE','SUPERVISEUR')")
    public ResponseEntity<DashboardResponse> getDashboard() {
        return ResponseEntity.ok(dashboardService.getDashboard());
    }
}
