package com.orus.scoringbackend.repositories;

import com.orus.scoringbackend.entities.Score;
import com.orus.scoringbackend.enums.NiveauRisque;
import com.orus.scoringbackend.enums.StatutScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ScoreRepository extends JpaRepository<Score, Long>, JpaSpecificationExecutor<Score> {
    List<Score> findByClientIdOrderByCreatedAtDesc(Long clientId);
    Optional<Score> findTopByClientIdOrderByCreatedAtDesc(Long clientId);
    List<Score> findByStatutOrderByCreatedAtDesc(StatutScore statut);
    long countByNiveauRisque(NiveauRisque niveauRisque);
    long countByStatut(StatutScore statut);

    // ── Agrégations dashboard ─────────────────────────────────────────────
    /** Décisions (VALIDE/REJETE) prises depuis une date donnée — ex. début de journée. */
    long countByStatutAndDecidedAtGreaterThanEqual(StatutScore statut, LocalDateTime start);
    /** Scores décidés (validés ou rejetés) sur une fenêtre — pour l'évolution des validations. */
    List<Score> findByDecidedAtGreaterThanEqual(LocalDateTime start);
    /** Scores calculés sur une fenêtre — pour le volume de scores par jour. */
    List<Score> findByCreatedAtGreaterThanEqual(LocalDateTime start);

    @Query("SELECT AVG(s.valeurScore) FROM Score s WHERE s.statut = 'VALIDE'")
    Double findAverageScoreValide();

    // Recherche paginée/filtrée : voir ScoreService.getScores + ScoreSpecifications
    // (JpaSpecificationExecutor fournit findAll(Specification, Pageable)).
}
