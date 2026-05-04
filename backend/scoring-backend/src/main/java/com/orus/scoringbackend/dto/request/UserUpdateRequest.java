package com.orus.scoringbackend.dto.request;

import com.orus.scoringbackend.enums.Role;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class UserUpdateRequest {
    @NotBlank private String nom;
    @NotBlank private String prenom;
    @NotBlank @Email private String email;
    @NotNull private Role role;
    private boolean actif;
}
