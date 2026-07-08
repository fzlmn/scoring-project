package com.orus.scoringbackend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class DashboardResponse {

    private String role;

    // ── KPIs globaux ──────────────────────────────────────────────────────
    private long totalClients;
    private long scoresEnAttente;
    private long scoresValides;
    private long scoresRejetes;
    private long alertesActives;

    // ── Répartition par niveau de risque ──────────────────────────────────
    private long clientsFaibleRisque;
    private long clientsMoyenRisque;
    private long clientsEleveRisque;

    // ── KPIs & graphiques : chargé de clientèle (portefeuille) ────────────
    private long mesClients;
    private long mesScoresEnAttente;
    private long mesScoresValides;
    private long mesScoresRejetes;
    private List<CategoryCount> repartitionSituationPro;
    private List<CategoryCount> repartitionRevenus;
    private List<CategoryCount> repartitionAge;
    private List<CategoryCount> clientsParMois;

    // ── KPIs & graphiques : superviseur (pilotage) ────────────────────────
    private long decisionsEnAttente;
    private long scoresValidesAujourdhui;
    private long scoresRejetesAujourdhui;
    private long clientsHautRisque;
    private List<CategoryCount> repartitionValidations;
    private List<CategoryCount> scoresParJour;
    private List<DecisionPoint> evolutionValidations;

    // ── KPIs gouvernance (administrateur) ─────────────────────────────────
    private long totalUtilisateurs;
    private long utilisateursActifs;
    private long totalSimulations;
    private long totalAlertes;

    // ── Données pour les graphiques communs ───────────────────────────────
    private List<RiskSlice> repartitionRisques;

    // ── Listes récentes ───────────────────────────────────────────────────
    private List<RecentScore> scoresRecents;
    private List<RecentAlerte> alertesRecentes;

    public record RiskSlice(String niveau, long count, String couleur) {}
    public record CategoryCount(String label, long count) {}
    public record DecisionPoint(String periode, long valides, long rejetes) {}
    public record RecentScore(String clientNom, Double valeur, String niveau, LocalDateTime dateCalcul) {}
    public record RecentAlerte(String criticite, String typeAlerte, String description, LocalDateTime createdAt) {}
}
