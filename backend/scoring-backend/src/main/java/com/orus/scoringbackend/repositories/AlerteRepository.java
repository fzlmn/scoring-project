package com.orus.scoringbackend.repositories;

import com.orus.scoringbackend.entities.Alerte;
import com.orus.scoringbackend.enums.StatutAlerte;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AlerteRepository extends JpaRepository<Alerte, Long> {
    List<Alerte> findByStatutOrderByCreatedAtDesc(StatutAlerte statut);
    long countByStatut(StatutAlerte statut);
}
