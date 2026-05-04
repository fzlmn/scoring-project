package com.orus.scoringbackend.controllers;

import com.orus.scoringbackend.dto.request.LoginRequest;
import com.orus.scoringbackend.dto.response.AuthResponse;
import com.orus.scoringbackend.entities.User;
import com.orus.scoringbackend.services.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(AuthResponse.builder()
                .email(user.getEmail())
                .nom(user.getNom())
                .prenom(user.getPrenom())
                .role(user.getRole())
                .build());
    }
}