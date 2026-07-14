package com.orus.scoringbackend.repositories;

import com.orus.scoringbackend.entities.Score;
import com.orus.scoringbackend.enums.NiveauRisque;
import com.orus.scoringbackend.enums.StatutScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    /**
     * Scores dans un statut donné issus d'un RECALCUL (ou d'une re-notation après
     * modification) : le client possède plus d'un score au total (score initial +
     * au moins une re-notation). Utilisé pour le KPI superviseur « recalculs à
     * revalider ». Forme IN + GROUP BY/HAVING (portable, sans sous-requête corrélée).
     */
    @Query("SELECT COUNT(s) FROM Score s WHERE s.statut = :statut " +
           "AND s.client.id IN (SELECT s2.client.id FROM Score s2 GROUP BY s2.client.id HAVING COUNT(s2) > 1)")
    long countRecalculesByStatut(@Param("statut") StatutScore statut);

    // Recherche paginée/filtrée : voir ScoreService.getScores + ScoreSpecifications
    // (JpaSpecificationExecutor fournit findAll(Specification, Pageable)).
}
