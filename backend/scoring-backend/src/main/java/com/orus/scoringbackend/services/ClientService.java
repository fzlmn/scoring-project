package com.orus.scoringbackend.services;

import com.orus.scoringbackend.dto.request.ClientRequest;
import com.orus.scoringbackend.dto.response.ClientResponse;
import com.orus.scoringbackend.dto.response.ScoreResponse;
import com.orus.scoringbackend.entities.Client;
import com.orus.scoringbackend.entities.Score;
import com.orus.scoringbackend.entities.User;
import com.orus.scoringbackend.enums.StatutScore;
import com.orus.scoringbackend.exceptions.BusinessException;
import com.orus.scoringbackend.exceptions.ResourceNotFoundException;
import com.orus.scoringbackend.repositories.ClientRepository;
import com.orus.scoringbackend.repositories.ScoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ClientService {

    private final ClientRepository clientRepository;
    private final ScoreRepository scoreRepository;
    private final IaService iaService;
    private final AlerteService alerteService;
    private final AuditLogService auditLogService;

    @Transactional
    public ClientResponse creerClient(ClientRequest request, User createdBy) {
        if (clientRepository.findByCin(request.getCin()).isPresent()) {
            throw new BusinessException("Un client avec ce CIN existe déjà : " + request.getCin());
        }
        Client client = mapToEntity(request);
        client.setCreatedBy(createdBy);
        client = clientRepository.save(client);

        // Scoring automatique
        Score score = iaService.calculerEtSauvegarderScore(client);

        // Audit
        auditLogService.log(createdBy, "CREATION_CLIENT", "CLIENT", client.getId());

        // Bug 2 fix : passer score au lieu de null
        return mapToResponse(client, score);
    }

    @Transactional
    public ClientResponse modifierClient(Long id, ClientRequest request, User modifiedBy) {
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Client introuvable : " + id));

        if (!client.getCin().equals(request.getCin()) &&
                clientRepository.findByCin(request.getCin()).isPresent()) {
            throw new BusinessException("Ce CIN est déjà utilisé par un autre client");
        }

        client.setNom(request.getNom());
        client.setPrenom(request.getPrenom());
        client.setCin(request.getCin());
        client.setDateNaissance(request.getDateNaissance());
        client.setSituationPro(request.getSituationPro());
        client.setRevenusMensuels(request.getRevenusMensuels());
        client.setChargesMensuelles(request.getChargesMensuelles());
        client.setHistoriqueFinancier(request.getHistoriqueFinancier());
        client = clientRepository.save(client);

        // Recalcul automatique du score
        Score score = iaService.calculerEtSauvegarderScore(client);

        // Audit
        auditLogService.log(modifiedBy, "MODIFICATION_CLIENT", "CLIENT", client.getId());

        // Bug 2 fix : passer score au lieu de null
        return mapToResponse(client, score);
    }

    // Bug 6 : recalcul manuel par le superviseur
    @Transactional
    public ClientResponse recalculerScore(Long id, User superviseur) {
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Client introuvable : " + id));

        Score score = iaService.calculerEtSauvegarderScore(client);
        if (score == null) {
            throw new BusinessException("Le service IA est désactivé — recalcul impossible");
        }

        auditLogService.log(superviseur, "RECALCUL_SCORE", "CLIENT", client.getId());

        return mapToResponse(client, score);
    }

    public ClientResponse getClient(Long id) {
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Client introuvable : " + id));
        Score dernierScore = scoreRepository.findTopByClientIdOrderByCreatedAtDesc(id).orElse(null);
        return mapToResponse(client, dernierScore);
    }

    public List<ClientResponse> getAllClients() {
        return clientRepository.findAll().stream()
                .map(c -> {
                    Score s = scoreRepository.findTopByClientIdOrderByCreatedAtDesc(c.getId()).orElse(null);
                    return mapToResponse(c, s);
                }).toList();
    }

    private Client mapToEntity(ClientRequest r) {
        Client c = new Client();
        c.setNom(r.getNom());
        c.setPrenom(r.getPrenom());
        c.setCin(r.getCin());
        c.setDateNaissance(r.getDateNaissance());
        c.setSituationPro(r.getSituationPro());
        c.setRevenusMensuels(r.getRevenusMensuels());
        c.setChargesMensuelles(r.getChargesMensuelles());
        c.setHistoriqueFinancier(r.getHistoriqueFinancier());
        return c;
    }

    public ClientResponse mapToResponse(Client c, Score s) {
        int age = Period.between(c.getDateNaissance(), LocalDate.now()).getYears();
        return ClientResponse.builder()
                .id(c.getId())
                .nom(c.getNom())
                .prenom(c.getPrenom())
                .cin(c.getCin())
                .dateNaissance(c.getDateNaissance())
                .age(age)
                .situationPro(c.getSituationPro())
                .revenusMensuels(c.getRevenusMensuels())
                .chargesMensuelles(c.getChargesMensuelles())
                .tauxEndettement(c.getTauxEndettement())
                .historiqueFinancier(c.getHistoriqueFinancier())
                .createdAt(c.getCreatedAt())
                .dernierScore(s != null ? ScoreService.mapToResponse(s) : null)
                .build();
    }
}