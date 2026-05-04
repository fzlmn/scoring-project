package com.orus.scoringbackend.dto.request;

import com.orus.scoringbackend.enums.Role;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class UserCreateRequest {

    @NotBlank
    private String nom;

    @NotBlank
    private String prenom;

    @NotBlank @Email
    private String email;

    @NotBlank @Size(min = 8, message = "Le mot de passe doit contenir au moins 8 caractères")
    private String password;

    @NotNull
    private Role role;
}
