package com.orus.scoringbackend.services;

import com.orus.scoringbackend.dto.response.DashboardResponse;
import com.orus.scoringbackend.enums.NiveauRisque;
import com.orus.scoringbackend.enums.StatutAlerte;
import com.orus.scoringbackend.enums.StatutScore;
import com.orus.scoringbackend.repositories.AlerteRepository;
import com.orus.scoringbackend.repositories.ClientRepository;
import com.orus.scoringbackend.repositories.ScoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ClientRepository clientRepository;
    private final ScoreRepository scoreRepository;
    private final AlerteRepository alerteRepository;

    public DashboardResponse getDashboard() {
        return DashboardResponse.builder()
                .totalClients(clientRepository.count())
                .scoresEnAttente(scoreRepository.countByStatut(StatutScore.EN_ATTENTE))
                .scoresValides(scoreRepository.countByStatut(StatutScore.VALIDE))
                .scoresRejetes(scoreRepository.countByStatut(StatutScore.REJETE))
                .scoreMoyen(scoreRepository.findAverageScoreValide())
                .clientsFaibleRisque(scoreRepository.countByNiveauRisque(NiveauRisque.FAIBLE))
                .clientsMoyenRisque(scoreRepository.countByNiveauRisque(NiveauRisque.MOYEN))
                .clientsEleveRisque(scoreRepository.countByNiveauRisque(NiveauRisque.ELEVE))
                .alertesNonLues(alerteRepository.countByStatut(StatutAlerte.NON_LUE))
                .build();
    }
}
