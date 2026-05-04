package com.orus.scoringbackend.config;

import com.orus.scoringbackend.entities.User;
import com.orus.scoringbackend.enums.Role;
import com.orus.scoringbackend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.password}")
    private String adminPassword;

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.findByEmail("admin@orus.ma").isEmpty()) {
            User admin = User.builder()
                    .nom("Admin")
                    .prenom("Système")
                    .email("admin@orus.ma")
                    .password(passwordEncoder.encode(adminPassword))
                    .role(Role.ADMINISTRATEUR)
                    .actif(true)
                    .build();
            userRepository.save(admin);
        }
    }
}