package com.orus.scoringbackend.services;

import com.orus.scoringbackend.dto.request.SimulationRequest;
import com.orus.scoringbackend.dto.response.SimulationResponse;
import com.orus.scoringbackend.entities.Client;
import com.orus.scoringbackend.entities.Score;
import com.orus.scoringbackend.entities.Simulation;
import com.orus.scoringbackend.entities.User;
import com.orus.scoringbackend.enums.NiveauRisque;
import com.orus.scoringbackend.exceptions.BusinessException;
import com.orus.scoringbackend.exceptions.ResourceNotFoundException;
import com.orus.scoringbackend.repositories.ClientRepository;
import com.orus.scoringbackend.repositories.ScoreRepository;
import com.orus.scoringbackend.repositories.SimulationRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
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
    private final AuditLogService auditLogService;
    private final IaService iaService;
    // Instance dédiée (Map ⇄ JSON) : évite de dépendre d'un bean ObjectMapper managé.
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${ia.service.url:http://localhost:8000}")
    private String iaServiceUrl;

    // Bug 7 fix : vérifier si IA est activée
    @Value("${ia.service.enabled:false}")
    private boolean iaEnabled;

    @SuppressWarnings("unchecked")
    public SimulationResponse simuler(SimulationRequest request, User superviseur) {
        // Bug 7 fix : bloquer la simulation si le service IA est désactivé
        if (!iaEnabled) {
            throw new BusinessException(
                    "Le service IA est désactivé — les simulations ne sont pas disponibles. " +
                            "Activez ia.service.enabled=true et démarrez le service Python.");
        }

        Client client = clientRepository.findById(request.getClientId())
                .orElseThrow(() -> new ResourceNotFoundException("Client introuvable"));

        Optional<Score> dernierScore = scoreRepository.findTopByClientIdOrderByCreatedAtDesc(client.getId());

        // Surcharges « what-if » : toute donnée financière / de scoring peut être modifiée ;
        // les champs nuls conservent la valeur réelle du client (l'identité reste immuable).
        IaService.SimulationOverrides overrides = new IaService.SimulationOverrides(
                request.getRevenusSimules(),
                request.getChargesSimulees(),
                request.getHistoriqueFinancier(),
                request.getNbRetards3059Jours(),
                request.getNbRetards6089Jours(),
                request.getNbRetards90JoursPlus(),
                request.getNbCreditsOuverts(),
                request.getNbPretsImmobiliers(),
                request.getNbPersonnesACharge(),
                request.getUtilisationCreditRenouvelable());

        Map<String, Object> payload = iaService.buildPayload(client, overrides);

        double scoreSimule;
        String narration;
        NiveauRisque niveau;

        try {
            Map<String, Object> result = restTemplate.postForObject(
                    iaServiceUrl + "/predict", payload, Map.class);
            if (result == null) throw new RuntimeException("Réponse vide du service IA");
            scoreSimule = ((Number) result.get("score")).doubleValue();
            narration   = (String) result.get("narration");
            niveau      = iaService.resoudreNiveau(result.get("niveau_risque"), scoreSimule);
        } catch (Exception e) {
            log.error("Erreur simulation IA : {}", e.getMessage());
            throw new BusinessException("Erreur lors de l'appel au service IA : " + e.getMessage());
        }

        // Règle métier « endettement élevé » — appliquée à l'identique du scoring réel.
        double tauxSimule = request.getRevenusSimules() != null && request.getRevenusSimules() > 0
                ? (request.getChargesSimulees() / request.getRevenusSimules()) * 100 : 0.0;
        IaService.RiskDecision decision = iaService.appliquerRegleEndettement(niveau, narration, tauxSimule);
        niveau = decision.niveau();
        narration = decision.narration();

        Simulation sim = Simulation.builder()
                .client(client)
                .superviseur(superviseur)
                .revenusSimules(request.getRevenusSimules())
                .chargesSimulees(request.getChargesSimulees())
                .scoreSimule(scoreSimule)
                .scoreReel(dernierScore.map(Score::getValeurScore).orElse(null))
                .niveauRisqueSimule(niveau)
                .narrationSimulee(narration)
                .parametresSimules(serialiserParametres(request, client, tauxSimule))
                .build();

        sim = simulationRepository.save(sim);

        auditLogService.log(superviseur, "SIMULATION", "CLIENT", client.getId());

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
                .parametresSimules(parseParametres(s.getParametresSimules()))
                .createdAt(s.getCreatedAt())
                .build();
    }

    /** Instantané JSON des valeurs effectivement simulées (surcharge ou valeur client). */
    private String serialiserParametres(SimulationRequest r, Client c, double tauxSimule) {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("situationPro", orClient(r.getSituationPro(), c.getSituationPro()));
        params.put("revenusMensuels", r.getRevenusSimules());
        params.put("chargesMensuelles", r.getChargesSimulees());
        params.put("tauxEndettement", tauxSimule);
        params.put("historiqueFinancier", orClient(r.getHistoriqueFinancier(), c.getHistoriqueFinancier()));
        params.put("nbRetards3059Jours", orClient(r.getNbRetards3059Jours(), c.getNbRetards3059Jours()));
        params.put("nbRetards6089Jours", orClient(r.getNbRetards6089Jours(), c.getNbRetards6089Jours()));
        params.put("nbRetards90JoursPlus", orClient(r.getNbRetards90JoursPlus(), c.getNbRetards90JoursPlus()));
        params.put("nbCreditsOuverts", orClient(r.getNbCreditsOuverts(), c.getNbCreditsOuverts()));
        params.put("nbPretsImmobiliers", orClient(r.getNbPretsImmobiliers(), c.getNbPretsImmobiliers()));
        params.put("nbPersonnesACharge", orClient(r.getNbPersonnesACharge(), c.getNbPersonnesACharge()));
        params.put("utilisationCreditRenouvelable",
                orClient(r.getUtilisationCreditRenouvelable(), c.getUtilisationCreditRenouvelable()));
        try {
            return objectMapper.writeValueAsString(params);
        } catch (Exception e) {
            log.warn("Sérialisation des paramètres de simulation impossible : {}", e.getMessage());
            return null;
        }
    }

    private Map<String, Object> parseParametres(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return null;
        }
    }

    private static <T> T orClient(T override, T base) { return override != null ? override : base; }
}