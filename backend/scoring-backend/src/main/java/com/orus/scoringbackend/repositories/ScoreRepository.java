package com.orus.scoringbackend.repositories;

import com.orus.scoringbackend.entities.Score;
import com.orus.scoringbackend.enums.NiveauRisque;
import com.orus.scoringbackend.enums.StatutScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ScoreRepository extends JpaRepository<Score, Long> {
    List<Score> findByClientIdOrderByCreatedAtDesc(Long clientId);
    Optional<Score> findTopByClientIdOrderByCreatedAtDesc(Long clientId);
    List<Score> findByStatutOrderByCreatedAtDesc(StatutScore statut);
    long countByNiveauRisque(NiveauRisque niveauRisque);
    long countByStatut(StatutScore statut);

    @Query("SELECT AVG(s.valeurScore) FROM Score s WHERE s.statut = 'VALIDE'")
    Double findAverageScoreValide();
}
