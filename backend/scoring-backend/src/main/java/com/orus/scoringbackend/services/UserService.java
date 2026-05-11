package com.orus.scoringbackend.services;

import com.orus.scoringbackend.dto.request.UserCreateRequest;
import com.orus.scoringbackend.dto.request.UserUpdateRequest;
import com.orus.scoringbackend.dto.response.UserResponse;
import com.orus.scoringbackend.entities.User;
import com.orus.scoringbackend.enums.Role;
import com.orus.scoringbackend.exceptions.BusinessException;
import com.orus.scoringbackend.exceptions.ResourceNotFoundException;
import com.orus.scoringbackend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream().map(this::mapToResponse).toList();
    }

    // Bug 4 fix
    public UserResponse getUser(Long id) {
        return mapToResponse(userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable : " + id)));
    }

    @Transactional
    public UserResponse creerUtilisateur(UserCreateRequest request) {
        if (request.getRole() == Role.ADMINISTRATEUR) {
            throw new BusinessException("Le rôle Administrateur ne peut pas être attribué manuellement");
        }
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new BusinessException("Cet email est déjà utilisé");
        }

        String rawPassword = request.getPassword();
        boolean generatedPassword = false;
        if (rawPassword == null || rawPassword.isBlank()) {
            rawPassword = generateRandomPassword();
            generatedPassword = true;
        }

        User user = User.builder()
                .nom(request.getNom())
                .prenom(request.getPrenom())
                .email(request.getEmail())
                .password(passwordEncoder.encode(rawPassword))
                .role(request.getRole())
                .actif(true)
                .build();
        user = userRepository.save(user);
        auditLogService.log(null, "CREATION_UTILISATEUR", "USER", user.getId());

        UserResponse response = mapToResponse(user);
        if (generatedPassword) {
            response.setGeneratedPassword(rawPassword);
        }
        return response;
    }

    @Transactional
    public UserResponse modifierUtilisateur(Long id, UserUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable : " + id));

        if (!user.getEmail().equals(request.getEmail())
                && userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new BusinessException("Cet email est déjà utilisé");
        }

        if (user.getRole() != Role.ADMINISTRATEUR && request.getRole() == Role.ADMINISTRATEUR) {
            throw new BusinessException("Le rôle Administrateur ne peut pas être attribué manuellement");
        }
        if (user.getRole() == Role.ADMINISTRATEUR && request.getRole() != Role.ADMINISTRATEUR) {
            throw new BusinessException("Le rôle Administrateur ne peut pas être supprimé");
        }

        user.setNom(request.getNom());
        user.setPrenom(request.getPrenom());
        user.setEmail(request.getEmail());
        user.setRole(request.getRole());
        user.setActif(request.isActif());
        user = userRepository.save(user);
        auditLogService.log(null, "MODIFICATION_UTILISATEUR", "USER", id);
        return mapToResponse(user);
    }

    @Transactional
    public void desactiverUtilisateur(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable : " + id));
        user.setActif(false);
        userRepository.save(user);
        auditLogService.log(null, "DESACTIVATION_UTILISATEUR", "USER", id);
    }

    @Transactional
    public void activerUtilisateur(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable : " + id));
        user.setActif(true);
        userRepository.save(user);
        auditLogService.log(null, "ACTIVATION_UTILISATEUR", "USER", id);
    }

    @Transactional
    public String reinitialiserMotDePasse(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable : " + id));
        String newPassword = UUID.randomUUID().toString().substring(0, 10);
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        auditLogService.log(null, "REINITIALISATION_MOT_DE_PASSE", "USER", id);
        return newPassword;
    }

    private UserResponse mapToResponse(User u) {
        return UserResponse.builder()
                .id(u.getId())
                .nom(u.getNom())
                .prenom(u.getPrenom())
                .email(u.getEmail())
                .role(u.getRole())
                .actif(u.isActif())
                .createdAt(u.getCreatedAt())
                .build();
    }

    private String generateRandomPassword() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }
}