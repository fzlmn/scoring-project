package com.orus.scoringbackend.repositories;

import com.orus.scoringbackend.entities.Alerte;
import com.orus.scoringbackend.enums.StatutAlerte;
import com.orus.scoringbackend.enums.TypeAlerte;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AlerteRepository extends JpaRepository<Alerte, Long> {
    List<Alerte> findByStatutOrderByCreatedAtDesc(StatutAlerte statut);
    List<Alerte> findAllByOrderByCreatedAtDesc();
    long countByStatut(StatutAlerte statut);

    // Idempotence : éviter de recréer une alerte ouverte déjà existante (même client + type)
    boolean existsByClientIdAndTypeAlerteAndStatut(Long clientId, TypeAlerte typeAlerte, StatutAlerte statut);

    // Résolution automatique : alertes rattachées à un score / un client
    List<Alerte> findByScoreId(Long scoreId);
    List<Alerte> findByClientId(Long clientId);

    // Évolution des alertes (widget dashboard superviseur)
    List<Alerte> findByCreatedAtGreaterThanEqual(LocalDateTime start);
}
