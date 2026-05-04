package com.orus.scoringbackend.services;

import com.orus.scoringbackend.dto.request.SimulationRequest;
import com.orus.scoringbackend.dto.response.SimulationResponse;
import com.orus.scoringbackend.entities.Client;
import com.orus.scoringbackend.entities.Score;
import com.orus.scoringbackend.entities.Simulation;
import com.orus.scoringbackend.entities.User;
import com.orus.scoringbackend.exceptions.ResourceNotFoundException;
import com.orus.scoringbackend.repositories.ClientRepository;
import com.orus.scoringbackend.repositories.ScoreRepository;
import com.orus.scoringbackend.repositories.SimulationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SimulationService {

    private final SimulationRepository simulationRepository;
    private final ClientRepository clientRepository;
    private final ScoreRepository scoreRepository;
    private final RestTemplate restTemplate;

    @Value("${ia.service.url:http://localhost:8000}")
    private String iaServiceUrl;

    @SuppressWarnings("unchecked")
    public SimulationResponse simuler(SimulationRequest request, User superviseur) {
        Client client = clientRepository.findById(request.getClientId())
                .orElseThrow(() -> new ResourceNotFoundException("Client introuvable"));

        Optional<Score> dernierScore = scoreRepository.findTopByClientIdOrderByCreatedAtDesc(client.getId());

        // Appel au service IA avec les données simulées
        double tauxSim = (request.getRevenusSimules() > 0)
                ? (request.getChargesSimulees() / request.getRevenusSimules()) * 100 : 0;

        Map<String, Object> payload = Map.of(
                "revenus_mensuels", request.getRevenusSimules(),
                "charges_mensuelles", request.getChargesSimulees(),
                "taux_endettement", tauxSim,
                "historique_financier", client.getHistoriqueFinancier().name(),
                "situation_pro", client.getSituationPro().name(),
                "age", java.time.Period.between(client.getDateNaissance(),
                        java.time.LocalDate.now()).getYears()
        );

        double scoreSimule;
        String narration;
        com.orus.scoringbackend.enums.NiveauRisque niveau;

        try {
            Map<String, Object> result = restTemplate.postForObject(
                    iaServiceUrl + "/predict", payload, Map.class);
            scoreSimule = result != null ? ((Number) result.get("score")).doubleValue() : 50.0;
            narration = result != null ? (String) result.get("narration") : "Service IA indisponible";
        } catch (Exception e) {
            log.error("Erreur simulation IA : {}", e.getMessage());
            scoreSimule = 50.0;
            narration = "Score simulé en mode dégradé — service IA indisponible.";
        }

        niveau = scoreSimule <= 30
                ? com.orus.scoringbackend.enums.NiveauRisque.FAIBLE
                : scoreSimule <= 60
                ? com.orus.scoringbackend.enums.NiveauRisque.MOYEN
                : com.orus.scoringbackend.enums.NiveauRisque.ELEVE;

        Simulation sim = Simulation.builder()
                .client(client)
                .superviseur(superviseur)
                .revenusSimules(request.getRevenusSimules())
                .chargesSimulees(request.getChargesSimulees())
                .scoreSimule(scoreSimule)
                .scoreReel(dernierScore.map(Score::getValeurScore).orElse(null))
                .niveauRisqueSimule(niveau)
                .narrationSimulee(narration)
                .build();

        sim = simulationRepository.save(sim);
        return mapToResponse(sim, client);
    }

    public List<SimulationResponse> getHistorique() {
        return simulationRepository.findAll().stream()
                .map(s -> mapToResponse(s, s.getClient())).toList();
    }

    public List<SimulationResponse> getHistoriqueClient(Long clientId) {
        return simulationRepository.findByClientIdOrderByCreatedAtDesc(clientId).stream()
                .map(s -> mapToResponse(s, s.getClient())).toList();
    }

    private SimulationResponse mapToResponse(Simulation s, Client c) {
        return SimulationResponse.builder()
                .id(s.getId())
                .clientId(c.getId())
                .clientNomComplet(c.getPrenom() + " " + c.getNom())
                .revenusSimules(s.getRevenusSimules())
                .chargesSimulees(s.getChargesSimulees())
                .tauxEndettementSimule(s.getTauxEndettementSimule())
                .scoreSimule(s.getScoreSimule())
                .scoreReel(s.getScoreReel())
                .niveauRisqueSimule(s.getNiveauRisqueSimule())
                .narrationSimulee(s.getNarrationSimulee())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
