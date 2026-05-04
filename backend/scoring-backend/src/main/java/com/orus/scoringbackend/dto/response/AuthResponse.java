package com.orus.scoringbackend.dto.response;

import com.orus.scoringbackend.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String email;
    private String nom;
    private String prenom;
    private Role role;
}