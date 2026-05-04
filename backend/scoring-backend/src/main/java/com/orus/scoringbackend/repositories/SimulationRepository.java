package com.orus.scoringbackend.repositories;

import com.orus.scoringbackend.entities.Simulation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SimulationRepository extends JpaRepository<Simulation, Long> {
    List<Simulation> findByClientIdOrderByCreatedAtDesc(Long clientId);
    List<Simulation> findBySuperviseurIdOrderByCreatedAtDesc(Long superviseurId);
}
