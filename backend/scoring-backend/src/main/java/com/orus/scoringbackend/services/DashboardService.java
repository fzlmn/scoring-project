package com.orus.scoringbackend.services;

import com.orus.scoringbackend.dto.response.DashboardResponse;
import com.orus.scoringbackend.dto.response.DashboardResponse.CategoryCount;
import com.orus.scoringbackend.dto.response.DashboardResponse.DecisionPoint;
import com.orus.scoringbackend.dto.response.DashboardResponse.RecentAlerte;
import com.orus.scoringbackend.dto.response.DashboardResponse.RecentScore;
import com.orus.scoringbackend.dto.response.DashboardResponse.RiskSlice;
import com.orus.scoringbackend.entities.Alerte;
import com.orus.scoringbackend.entities.Client;
import com.orus.scoringbackend.entities.Score;
import com.orus.scoringbackend.enums.NiveauRisque;
import com.orus.scoringbackend.enums.Role;
import com.orus.scoringbackend.enums.SituationPro;
import com.orus.scoringbackend.enums.StatutAlerte;
import com.orus.scoringbackend.enums.StatutScore;
import com.orus.scoringbackend.repositories.AlerteRepository;
import com.orus.scoringbackend.repositories.ClientRepository;
import com.orus.scoringbackend.repositories.ScoreRepository;
import com.orus.scoringbackend.repositories.SimulationRepository;
import com.orus.scoringbackend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final int FENETRE_JOURS = 14;  // évolution validations / volume par jour
    private static final int FENETRE_MOIS  = 6;   // clients créés par mois

    private static final String[] MOIS_FR = {
            "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
            "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"
    };

    private final ClientRepository clientRepository;
    private final ScoreRepository scoreRepository;
    private final AlerteRepository alerteRepository;
    private final UserRepository userRepository;
    private final SimulationRepository simulationRepository;

    public DashboardResponse getDashboard(Role role, Long userId) {
        // Périmètre des clients : le chargé de clientèle ne voit que les siens.
        boolean scoped = role == Role.CHARGE_CLIENTELE;
        List<Client> clients = scoped
                ? clientRepository.findByCreatedById(userId)
                : clientRepository.findAll();

        // Dernier score par client (état courant du client)
        List<Score> derniers = new ArrayList<>();
        for (Client c : clients) {
            scoreRepository.findTopByClientIdOrderByCreatedAtDesc(c.getId()).ifPresent(derniers::add);
        }

        long faible = countNiveau(derniers, NiveauRisque.FAIBLE);
        long moyen  = countNiveau(derniers, NiveauRisque.MOYEN);
        long eleve  = countNiveau(derniers, NiveauRisque.ELEVE);

        long enAttente = countStatut(derniers, StatutScore.EN_ATTENTE);
        long valides   = countStatut(derniers, StatutScore.VALIDE);
        long rejetes   = countStatut(derniers, StatutScore.REJETE);

        long alertesActives = alerteRepository.countByStatut(StatutAlerte.NON_LUE);

        List<RiskSlice> repartition = List.of(
                new RiskSlice("FAIBLE", faible, "#2D9C6A"),
                new RiskSlice("MOYEN", moyen, "#E8621A"),
                new RiskSlice("ELEVE", eleve, "#D94040")
        );

        // Scores en attente récents (file de validation)
        List<RecentScore> scoresRecents = derniers.stream()
                .filter(s -> s.getStatut() == StatutScore.EN_ATTENTE)
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(5)
                .map(s -> new RecentScore(
                        s.getClient().getPrenom() + " " + s.getClient().getNom(),
                        s.getValeurScore(),
                        s.getNiveauRisque() != null ? s.getNiveauRisque().name() : null,
                        s.getCreatedAt()))
                .toList();

        // Alertes récentes (non lues)
        List<RecentAlerte> alertesRecentes = alerteRepository
                .findByStatutOrderByCreatedAtDesc(StatutAlerte.NON_LUE).stream()
                .limit(5)
                .map(a -> new RecentAlerte(
                        a.getCriticite() != null ? a.getCriticite().name() : null,
                        a.getTypeAlerte() != null ? a.getTypeAlerte().name() : null,
                        a.getDescription(),
                        a.getCreatedAt()))
                .toList();

        DashboardResponse.DashboardResponseBuilder b = DashboardResponse.builder()
                .role(role != null ? role.name() : null)
                .totalClients(clients.size())
                .scoresEnAttente(enAttente)
                .scoresValides(valides)
                .scoresRejetes(rejetes)
                .alertesActives(alertesActives)
                .clientsFaibleRisque(faible)
                .clientsMoyenRisque(moyen)
                .clientsEleveRisque(eleve)
                .repartitionRisques(repartition)
                .scoresRecents(scoresRecents)
                .alertesRecentes(alertesRecentes);

        if (scoped) {
            // ── Dashboard chargé de clientèle : son portefeuille ──────────
            b.mesClients(clients.size())
             .mesScoresEnAttente(enAttente)
             .mesScoresValides(valides)
             .mesScoresRejetes(rejetes)
             .repartitionSituationPro(repartitionSituationPro(clients))
             .repartitionRevenus(repartitionRevenus(clients))
             .repartitionAge(repartitionAge(clients))
             .clientsParMois(clientsParMois(clients, FENETRE_MOIS));
        } else {
            // ── Dashboard superviseur / analyste / admin : pilotage global ─
            LocalDate today = LocalDate.now();
            long decisionsEnAttente = scoreRepository.countByStatut(StatutScore.EN_ATTENTE);
            long recalculesEnAttente = scoreRepository.countRecalculesByStatut(StatutScore.EN_ATTENTE);
            long validesTotal       = scoreRepository.countByStatut(StatutScore.VALIDE);
            long rejetesTotal       = scoreRepository.countByStatut(StatutScore.REJETE);
            long validesAuj = scoreRepository.countByStatutAndDecidedAtGreaterThanEqual(
                    StatutScore.VALIDE, today.atStartOfDay());
            long rejetesAuj = scoreRepository.countByStatutAndDecidedAtGreaterThanEqual(
                    StatutScore.REJETE, today.atStartOfDay());

            b.decisionsEnAttente(decisionsEnAttente)
             .scoresRecalculesEnAttente(recalculesEnAttente)
             .scoresValidesAujourdhui(validesAuj)
             .scoresRejetesAujourdhui(rejetesAuj)
             .clientsHautRisque(eleve)
             .repartitionValidations(List.of(
                     new CategoryCount("Validés", validesTotal),
                     new CategoryCount("Rejetés", rejetesTotal),
                     new CategoryCount("En attente", decisionsEnAttente)))
             .evolutionValidations(evolutionValidations(FENETRE_JOURS))
             .scoresParJour(scoresParJour(FENETRE_JOURS));
        }

        // KPIs gouvernance (administrateur)
        if (role == Role.ADMINISTRATEUR) {
            b.totalUtilisateurs(userRepository.count())
             .utilisateursActifs(userRepository.findByActifTrue().size())
             .totalSimulations(simulationRepository.count())
             .totalAlertes(alerteRepository.count());
        }

        return b.build();
    }

    // ── Agrégations portefeuille (chargé de clientèle) ────────────────────

    private List<CategoryCount> repartitionSituationPro(List<Client> clients) {
        Map<SituationPro, Long> counts = new HashMap<>();
        for (Client c : clients) {
            if (c.getSituationPro() != null) counts.merge(c.getSituationPro(), 1L, Long::sum);
        }
        return List.of(
                new CategoryCount("CDI", counts.getOrDefault(SituationPro.CDI, 0L)),
                new CategoryCount("CDD", counts.getOrDefault(SituationPro.CDD, 0L)),
                new CategoryCount("Indépendant", counts.getOrDefault(SituationPro.INDEPENDANT, 0L)),
                new CategoryCount("Sans emploi", counts.getOrDefault(SituationPro.SANS_EMPLOI, 0L))
        );
    }

    private List<CategoryCount> repartitionRevenus(List<Client> clients) {
        long t1 = 0, t2 = 0, t3 = 0, t4 = 0;
        for (Client c : clients) {
            double r = c.getRevenusMensuels() != null ? c.getRevenusMensuels() : 0;
            if (r < 10000)      t1++;
            else if (r < 25000) t2++;
            else if (r < 50000) t3++;
            else                t4++;
        }
        return List.of(
                new CategoryCount("< 10 000 DH", t1),
                new CategoryCount("10 000 – 25 000 DH", t2),
                new CategoryCount("25 000 – 50 000 DH", t3),
                new CategoryCount("> 50 000 DH", t4)
        );
    }

    private List<CategoryCount> repartitionAge(List<Client> clients) {
        long a1 = 0, a2 = 0, a3 = 0, a4 = 0, a5 = 0;
        LocalDate now = LocalDate.now();
        for (Client c : clients) {
            if (c.getDateNaissance() == null) continue;
            int age = Period.between(c.getDateNaissance(), now).getYears();
            if (age <= 25)      a1++;
            else if (age <= 35) a2++;
            else if (age <= 45) a3++;
            else if (age <= 60) a4++;
            else                a5++;
        }
        return List.of(
                new CategoryCount("18–25", a1),
                new CategoryCount("26–35", a2),
                new CategoryCount("36–45", a3),
                new CategoryCount("46–60", a4),
                new CategoryCount("60+", a5)
        );
    }

    private List<CategoryCount> clientsParMois(List<Client> clients, int nbMois) {
        Map<YearMonth, Long> counts = new HashMap<>();
        for (Client c : clients) {
            if (c.getCreatedAt() == null) continue;
            counts.merge(YearMonth.from(c.getCreatedAt()), 1L, Long::sum);
        }
        YearMonth current = YearMonth.now();
        List<CategoryCount> out = new ArrayList<>();
        for (int i = nbMois - 1; i >= 0; i--) {
            YearMonth ym = current.minusMonths(i);
            out.add(new CategoryCount(monthLabel(ym), counts.getOrDefault(ym, 0L)));
        }
        return out;
    }

    // ── Agrégations pilotage (superviseur) ────────────────────────────────

    private List<DecisionPoint> evolutionValidations(int nbJours) {
        LocalDate start = LocalDate.now().minusDays(nbJours - 1L);
        List<Score> scores = scoreRepository.findByDecidedAtGreaterThanEqual(start.atStartOfDay());
        Map<LocalDate, long[]> map = new HashMap<>(); // [valides, rejetes]
        for (Score s : scores) {
            if (s.getDecidedAt() == null) continue;
            long[] vr = map.computeIfAbsent(s.getDecidedAt().toLocalDate(), k -> new long[2]);
            if (s.getStatut() == StatutScore.VALIDE)      vr[0]++;
            else if (s.getStatut() == StatutScore.REJETE) vr[1]++;
        }
        List<DecisionPoint> out = new ArrayList<>();
        for (int i = 0; i < nbJours; i++) {
            LocalDate d = start.plusDays(i);
            long[] vr = map.getOrDefault(d, new long[2]);
            out.add(new DecisionPoint(dayLabel(d), vr[0], vr[1]));
        }
        return out;
    }

    private List<CategoryCount> scoresParJour(int nbJours) {
        LocalDate start = LocalDate.now().minusDays(nbJours - 1L);
        List<Score> scores = scoreRepository.findByCreatedAtGreaterThanEqual(start.atStartOfDay());
        Map<LocalDate, Long> counts = new HashMap<>();
        for (Score s : scores) {
            if (s.getCreatedAt() == null) continue;
            counts.merge(s.getCreatedAt().toLocalDate(), 1L, Long::sum);
        }
        List<CategoryCount> out = new ArrayList<>();
        for (int i = 0; i < nbJours; i++) {
            LocalDate d = start.plusDays(i);
            out.add(new CategoryCount(dayLabel(d), counts.getOrDefault(d, 0L)));
        }
        return out;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  Évolution par widget — chaque graphique choisit sa propre période.
    //  Fenêtre serveur : jour → 14 j · semaine → 8 sem · mois → 6 mois · année → 5 ans.
    // ══════════════════════════════════════════════════════════════════════

    private enum Grain { JOUR, SEMAINE, MOIS, ANNEE }
    private record Bucket(String label, LocalDateTime start, LocalDateTime endExclusive) {}

    private Grain grain(String periode) {
        if (periode == null) return Grain.JOUR;
        return switch (periode.toLowerCase()) {
            case "semaine" -> Grain.SEMAINE;
            case "mois"    -> Grain.MOIS;
            case "annee", "année" -> Grain.ANNEE;
            default        -> Grain.JOUR;
        };
    }

    private List<Bucket> buckets(String periode) {
        List<Bucket> out = new ArrayList<>();
        LocalDate today = LocalDate.now();
        switch (grain(periode)) {
            case JOUR -> {
                for (int i = 13; i >= 0; i--) {
                    LocalDate d = today.minusDays(i);
                    out.add(new Bucket(dayLabel(d), d.atStartOfDay(), d.plusDays(1).atStartOfDay()));
                }
            }
            case SEMAINE -> {
                LocalDate monday = today.minusDays(today.getDayOfWeek().getValue() - 1L);
                for (int i = 7; i >= 0; i--) {
                    LocalDate ws = monday.minusWeeks(i);
                    out.add(new Bucket(dayLabel(ws), ws.atStartOfDay(), ws.plusWeeks(1).atStartOfDay()));
                }
            }
            case MOIS -> {
                YearMonth ym = YearMonth.now();
                for (int i = 5; i >= 0; i--) {
                    YearMonth m = ym.minusMonths(i);
                    out.add(new Bucket(monthLabel(m), m.atDay(1).atStartOfDay(), m.plusMonths(1).atDay(1).atStartOfDay()));
                }
            }
            case ANNEE -> {
                int year = today.getYear();
                for (int i = 4; i >= 0; i--) {
                    int y = year - i;
                    out.add(new Bucket(String.valueOf(y),
                            LocalDate.of(y, 1, 1).atStartOfDay(), LocalDate.of(y + 1, 1, 1).atStartOfDay()));
                }
            }
        }
        return out;
    }

    private int indexOf(List<Bucket> buckets, LocalDateTime ts) {
        if (ts == null) return -1;
        for (int i = 0; i < buckets.size(); i++) {
            Bucket b = buckets.get(i);
            if (!ts.isBefore(b.start()) && ts.isBefore(b.endExclusive())) return i;
        }
        return -1;
    }

    private <T> List<CategoryCount> tally(List<Bucket> buckets, List<T> items, Function<T, LocalDateTime> tsOf) {
        long[] counts = new long[buckets.size()];
        for (T it : items) {
            int idx = indexOf(buckets, tsOf.apply(it));
            if (idx >= 0) counts[idx]++;
        }
        List<CategoryCount> out = new ArrayList<>();
        for (int i = 0; i < buckets.size(); i++) out.add(new CategoryCount(buckets.get(i).label(), counts[i]));
        return out;
    }

    /** Évolution des validations / rejets sur la période (superviseur & analyste). */
    public List<DecisionPoint> evolutionValidations(String periode) {
        List<Bucket> buckets = buckets(periode);
        long[][] vr = new long[buckets.size()][2];
        for (Score s : scoreRepository.findByDecidedAtGreaterThanEqual(buckets.get(0).start())) {
            int idx = indexOf(buckets, s.getDecidedAt());
            if (idx < 0) continue;
            if (s.getStatut() == StatutScore.VALIDE)      vr[idx][0]++;
            else if (s.getStatut() == StatutScore.REJETE) vr[idx][1]++;
        }
        List<DecisionPoint> out = new ArrayList<>();
        for (int i = 0; i < buckets.size(); i++) {
            out.add(new DecisionPoint(buckets.get(i).label(), vr[i][0], vr[i][1]));
        }
        return out;
    }

    /** Volume de scores calculés sur la période (superviseur & analyste). */
    public List<CategoryCount> evolutionScores(String periode) {
        List<Bucket> buckets = buckets(periode);
        return tally(buckets, scoreRepository.findByCreatedAtGreaterThanEqual(buckets.get(0).start()), Score::getCreatedAt);
    }

    /** Évolution des alertes générées sur la période (superviseur). */
    public List<CategoryCount> evolutionAlertes(String periode) {
        List<Bucket> buckets = buckets(periode);
        return tally(buckets, alerteRepository.findByCreatedAtGreaterThanEqual(buckets.get(0).start()), Alerte::getCreatedAt);
    }

    /** Évolution des clients créés dans le périmètre du chargé de clientèle. */
    public List<CategoryCount> evolutionClientsCrees(Long userId, String periode) {
        List<Bucket> buckets = buckets(periode);
        return tally(buckets, clientRepository.findByCreatedById(userId), Client::getCreatedAt);
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private long countNiveau(List<Score> scores, NiveauRisque niveau) {
        return scores.stream().filter(s -> s.getNiveauRisque() == niveau).count();
    }

    private long countStatut(List<Score> scores, StatutScore statut) {
        return scores.stream().filter(s -> s.getStatut() == statut).count();
    }

    private String monthLabel(YearMonth ym) {
        return MOIS_FR[ym.getMonthValue() - 1] + " " + String.format("%02d", ym.getYear() % 100);
    }

    private String dayLabel(LocalDate d) {
        return String.format("%02d/%02d", d.getDayOfMonth(), d.getMonthValue());
    }
}
