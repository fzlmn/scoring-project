package com.orus.scoringbackend.services;

import com.orus.scoringbackend.dto.request.UserCreateRequest;
import com.orus.scoringbackend.dto.request.UserUpdateRequest;
import com.orus.scoringbackend.dto.response.UserResponse;
import com.orus.scoringbackend.entities.User;
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

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream().map(this::mapToResponse).toList();
    }

    @Transactional
    public UserResponse creerUtilisateur(UserCreateRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new BusinessException("Cet email est déjà utilisé");
        }
        User user = User.builder()
                .nom(request.getNom())
                .prenom(request.getPrenom())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .actif(true)
                .build();
        return mapToResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse modifierUtilisateur(Long id, UserUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable : " + id));
        if (!user.getEmail().equals(request.getEmail())
                && userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new BusinessException("Cet email est déjà utilisé");
        }
        user.setNom(request.getNom());
        user.setPrenom(request.getPrenom());
        user.setEmail(request.getEmail());
        user.setRole(request.getRole());
        user.setActif(request.isActif());
        return mapToResponse(userRepository.save(user));
    }

    @Transactional
    public void desactiverUtilisateur(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable : " + id));
        user.setActif(false);
        userRepository.save(user);
    }

    @Transactional
    public void activerUtilisateur(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable : " + id));
        user.setActif(true);
        userRepository.save(user);
    }

    @Transactional
    public String reinitialiserMotDePasse(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable : " + id));
        String newPassword = UUID.randomUUID().toString().substring(0, 10);
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
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
}
