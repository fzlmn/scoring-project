package com.orus.scoringbackend.dto.response;

import com.orus.scoringbackend.enums.Role;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data @Builder
public class UserResponse {
    private Long id;
    private String nom;
    private String prenom;
    private String email;
    private Role role;
    private boolean actif;
    private LocalDateTime createdAt;
    private String generatedPassword;
}
