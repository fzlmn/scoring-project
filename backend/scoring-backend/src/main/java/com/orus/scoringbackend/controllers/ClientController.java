package com.orus.scoringbackend.controllers;

import com.orus.scoringbackend.dto.request.ClientRequest;
import com.orus.scoringbackend.dto.response.ClientResponse;
import com.orus.scoringbackend.entities.User;
import com.orus.scoringbackend.services.ClientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clients")
@RequiredArgsConstructor
public class ClientController {

    private final ClientService clientService;

    @PostMapping
    @PreAuthorize("hasRole('CHARGE_CLIENTELE')")
    public ResponseEntity<ClientResponse> creer(@Valid @RequestBody ClientRequest request,
                                                @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clientService.creerClient(request, user));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('CHARGE_CLIENTELE')")
    public ResponseEntity<ClientResponse> modifier(@PathVariable Long id,
                                                   @Valid @RequestBody ClientRequest request,
                                                   @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(clientService.modifierClient(id, request, user));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CHARGE_CLIENTELE','ANALYSTE','SUPERVISEUR')")
    public ResponseEntity<ClientResponse> getClient(@PathVariable Long id) {
        return ResponseEntity.ok(clientService.getClient(id));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CHARGE_CLIENTELE','ANALYSTE','SUPERVISEUR')")
    public ResponseEntity<List<ClientResponse>> getAllClients() {
        return ResponseEntity.ok(clientService.getAllClients());
    }

    // Bug 6 fix : recalcul manuel par le superviseur
    @PostMapping("/{id}/recalculer-score")
    @PreAuthorize("hasRole('SUPERVISEUR')")
    public ResponseEntity<ClientResponse> recalculerScore(@PathVariable Long id,
                                                          @AuthenticationPrincipal User superviseur) {
        return ResponseEntity.ok(clientService.recalculerScore(id, superviseur));
    }
}