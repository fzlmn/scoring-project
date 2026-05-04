package com.orus.scoringbackend.entities;

import com.orus.scoringbackend.enums.Criticite;
import com.orus.scoringbackend.enums.StatutAlerte;
import com.orus.scoringbackend.enums.TypeAlerte;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "alertes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Alerte {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "score_id")
    private Score score;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_alerte", nullable = false)
    private TypeAlerte typeAlerte;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Criticite criticite;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutAlerte statut = StatutAlerte.NON_LUE;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
