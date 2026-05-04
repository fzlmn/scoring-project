package com.orus.scoringbackend.controllers;

import com.orus.scoringbackend.dto.response.AuditLogResponse;
import com.orus.scoringbackend.services.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<List<AuditLogResponse>> getAll() {
        return ResponseEntity.ok(auditLogService.getAll());
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<List<AuditLogResponse>> getByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(auditLogService.getByUser(userId));
    }

    @GetMapping("/{entite}/{entiteId}")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<List<AuditLogResponse>> getByEntite(@PathVariable String entite,
                                                              @PathVariable Long entiteId) {
        return ResponseEntity.ok(auditLogService.getByEntite(entite.toUpperCase(), entiteId));
    }
}