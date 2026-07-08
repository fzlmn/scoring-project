package com.orus.scoringbackend.controllers;

import com.orus.scoringbackend.dto.request.ClientRequest;
import com.orus.scoringbackend.dto.response.ClientResponse;
import com.orus.scoringbackend.entities.User;
import com.orus.scoringbackend.enums.Role;
import com.orus.scoringbackend.services.ClientService;
import com.orus.scoringbackend.services.ExcelExportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
    private final ExcelExportService excelExportService;

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

    // Export Excel (.xlsx) de la fiche client
    @GetMapping("/{id}/export")
    @PreAuthorize("hasAnyRole('CHARGE_CLIENTELE','ANALYSTE','SUPERVISEUR')")
    public ResponseEntity<byte[]> exportExcel(@PathVariable Long id) {
        byte[] xlsx = excelExportService.exportClient(id);
        String filename = "client_" + id + ".xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(xlsx);
    }

    // Export Excel (.xlsx) de la liste des clients (avec filtres nom/CIN optionnels)
    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('CHARGE_CLIENTELE','ANALYSTE','SUPERVISEUR')")
    public ResponseEntity<byte[]> exportClients(@RequestParam(required = false) String searchNom,
                                                @RequestParam(required = false) String searchCin,
                                                @AuthenticationPrincipal User user) {
        List<ClientResponse> clients = clientService.getAllClients();

        String nom = searchNom != null ? searchNom.trim().toLowerCase() : "";
        String cin = searchCin != null ? searchCin.trim() : "";
        if (!nom.isEmpty() || !cin.isEmpty()) {
            clients = clients.stream()
                    .filter(c -> nom.isEmpty()
                            || (c.getPrenom() + " " + c.getNom()).toLowerCase().contains(nom))
                    .filter(c -> cin.isEmpty()
                            || (c.getCin() != null && c.getCin().contains(cin)))
                    .toList();
        }

        // Le score numérique n'est visible par le superviseur que pour tous les statuts ;
        // les autres rôles ne voient que les scores VALIDÉS (cohérent avec la liste à l'écran).
        boolean masquer = user.getRole() != Role.SUPERVISEUR;
        byte[] xlsx = excelExportService.exportClients(clients, masquer);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"clients.xlsx\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(xlsx);
    }
}