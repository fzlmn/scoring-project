package com.orus.scoringbackend.controllers;

import com.orus.scoringbackend.dto.request.UserCreateRequest;
import com.orus.scoringbackend.dto.request.UserUpdateRequest;
import com.orus.scoringbackend.dto.response.UserResponse;
import com.orus.scoringbackend.services.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<List<UserResponse>> getAll() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    // Bug 4 fix
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<UserResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUser(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<UserResponse> creer(@Valid @RequestBody UserCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.creerUtilisateur(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<UserResponse> modifier(@PathVariable Long id,
                                                 @Valid @RequestBody UserUpdateRequest request) {
        return ResponseEntity.ok(userService.modifierUtilisateur(id, request));
    }

    @PatchMapping("/{id}/desactiver")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<Void> desactiver(@PathVariable Long id) {
        userService.desactiverUtilisateur(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/activer")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<Void> activer(@PathVariable Long id) {
        userService.activerUtilisateur(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/reinitialiser-mot-de-passe")
    @PreAuthorize("hasRole('ADMINISTRATEUR')")
    public ResponseEntity<Map<String, String>> reinitialiser(@PathVariable Long id) {
        String newPassword = userService.reinitialiserMotDePasse(id);
        return ResponseEntity.ok(Map.of("nouveauMotDePasse", newPassword));
    }
}