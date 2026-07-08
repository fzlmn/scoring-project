package com.orus.scoringbackend.services;

import com.orus.scoringbackend.dto.response.ClientResponse;
import com.orus.scoringbackend.dto.response.ScoreResponse;
import com.orus.scoringbackend.entities.Client;
import com.orus.scoringbackend.entities.Explication;
import com.orus.scoringbackend.entities.Score;
import com.orus.scoringbackend.enums.StatutScore;
import com.orus.scoringbackend.exceptions.ResourceNotFoundException;
import com.orus.scoringbackend.repositories.ClientRepository;
import com.orus.scoringbackend.repositories.ScoreRepository;
import com.orus.scoringbackend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExcelExportService {

    private final ClientRepository clientRepository;
    private final ScoreRepository scoreRepository;
    private final UserRepository userRepository;

    private static final DateTimeFormatter DT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    public byte[] exportClient(Long id) {
        Client c = clientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Client introuvable : " + id));
        Score s = scoreRepository.findTopByClientIdOrderByCreatedAtDesc(id).orElse(null);

        try (XSSFWorkbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            CellStyle header = headerStyle(wb);
            CellStyle section = sectionStyle(wb);

            Sheet sheet = wb.createSheet("Fiche client");
            int[] r = {0};

            sectionRow(sheet, r, section, "IDENTITÉ");
            row(sheet, r, "Nom", c.getNom());
            row(sheet, r, "Prénom", c.getPrenom());
            row(sheet, r, "CIN", c.getCin());
            row(sheet, r, "Date de naissance", c.getDateNaissance() != null ? c.getDateNaissance().toString() : "—");
            row(sheet, r, "Âge", c.getDateNaissance() != null
                    ? Period.between(c.getDateNaissance(), LocalDate.now()).getYears() + " ans" : "—");
            row(sheet, r, "Situation professionnelle", c.getSituationPro() != null ? c.getSituationPro().name() : "—");
            row(sheet, r, "Personnes à charge", String.valueOf(nz(c.getNbPersonnesACharge())));

            sectionRow(sheet, r, section, "DONNÉES FINANCIÈRES");
            row(sheet, r, "Revenus mensuels (MAD)", fmt(c.getRevenusMensuels()));
            row(sheet, r, "Charges mensuelles (MAD)", fmt(c.getChargesMensuelles()));
            row(sheet, r, "Taux d'endettement (%)", c.getTauxEndettement() != null ? fmt(c.getTauxEndettement()) : "—");
            row(sheet, r, "Historique financier", c.getHistoriqueFinancier() != null ? c.getHistoriqueFinancier().name() : "—");

            sectionRow(sheet, r, section, "DONNÉES DE CRÉDIT");
            row(sheet, r, "Retards 30–59 jours", String.valueOf(nz(c.getNbRetards3059Jours())));
            row(sheet, r, "Retards 60–89 jours", String.valueOf(nz(c.getNbRetards6089Jours())));
            row(sheet, r, "Retards ≥ 90 jours", String.valueOf(nz(c.getNbRetards90JoursPlus())));
            row(sheet, r, "Crédits ouverts", String.valueOf(nz(c.getNbCreditsOuverts())));
            row(sheet, r, "Prêts immobiliers", String.valueOf(nz(c.getNbPretsImmobiliers())));
            row(sheet, r, "Utilisation crédit renouvelable (%)",
                    c.getUtilisationCreditRenouvelable() != null ? fmt(c.getUtilisationCreditRenouvelable()) : "—");

            sectionRow(sheet, r, section, "SCORE IA");
            if (s != null) {
                row(sheet, r, "Score (/100)", fmt(s.getValeurScore()));
                row(sheet, r, "Niveau de risque", s.getNiveauRisque() != null ? s.getNiveauRisque().name() : "—");
                row(sheet, r, "Décision", decisionLabel(s));
                row(sheet, r, "Date de calcul", s.getCreatedAt() != null ? s.getCreatedAt().format(DT) : "—");
                row(sheet, r, "Version du modèle", s.getVersionModele() != null ? s.getVersionModele() : "—");
                row(sheet, r, "Analyste", analysteName(s.getCalculatedBy()));
                row(sheet, r, "Analyse explicative", s.getNarration() != null ? s.getNarration() : "—");
            } else {
                row(sheet, r, "Score", "Aucun score calculé");
            }

            sheet.setColumnWidth(0, 32 * 256);
            sheet.setColumnWidth(1, 60 * 256);
            // En-tête en gras sur la 1re cellule de chaque section déjà stylé ; titre global :
            applyHeaderToFirstCell(sheet, header);

            // ── Feuille SHAP (si disponible) ──
            List<Explication> expl = s != null ? s.getExplications() : null;
            if (expl != null && !expl.isEmpty()) {
                Sheet shap = wb.createSheet("Facteurs SHAP");
                Row h = shap.createRow(0);
                writeCell(h, 0, "Facteur", header);
                writeCell(h, 1, "Contribution (SHAP)", header);
                writeCell(h, 2, "Sens", header);
                writeCell(h, 3, "Ordre", header);
                int rowNum = 1;
                List<Explication> sorted = expl.stream()
                        .sorted((a, b) -> Integer.compare(a.getOrdreImportance(), b.getOrdreImportance()))
                        .toList();
                for (Explication e : sorted) {
                    Row er = shap.createRow(rowNum++);
                    writeCell(er, 0, e.getFeatureName(), null);
                    writeCell(er, 1, String.format("%.4f", e.getShapValue()), null);
                    writeCell(er, 2, e.isDirection() ? "augmente le risque" : "diminue le risque", null);
                    writeCell(er, 3, String.valueOf(e.getOrdreImportance()), null);
                }
                shap.setColumnWidth(0, 40 * 256);
                shap.setColumnWidth(1, 20 * 256);
                shap.setColumnWidth(2, 24 * 256);
                shap.setColumnWidth(3, 10 * 256);
            }

            wb.write(out);
            return out.toByteArray();

        } catch (IOException e) {
            throw new RuntimeException("Erreur lors de la génération du fichier Excel : " + e.getMessage(), e);
        }
    }

    /**
     * Export Excel de la liste des clients (une ligne par client).
     *
     * @param clients                 clients déjà filtrés tels qu'affichés à l'écran
     * @param masquerScoresNonValides true si le score numérique doit rester caché
     *                                tant qu'il n'est pas VALIDÉ (chargé de clientèle / analyste)
     */
    public byte[] exportClients(List<ClientResponse> clients, boolean masquerScoresNonValides) {
        try (XSSFWorkbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            CellStyle header = headerStyle(wb);
            Sheet sheet = wb.createSheet("Clients");

            String[] cols = {
                    "Nom", "Prénom", "CIN", "Situation professionnelle",
                    "Revenus mensuels (MAD)", "Taux d'endettement (%)",
                    "Score (/100)", "Niveau de risque", "Statut", "Date de calcul"
            };
            Row head = sheet.createRow(0);
            for (int i = 0; i < cols.length; i++) writeCell(head, i, cols[i], header);

            int rowNum = 1;
            for (ClientResponse c : clients) {
                ScoreResponse s = c.getDernierScore();
                boolean masque = s != null && masquerScoresNonValides && s.getStatut() != StatutScore.VALIDE;

                Row row = sheet.createRow(rowNum++);
                writeCell(row, 0, c.getNom(), null);
                writeCell(row, 1, c.getPrenom(), null);
                writeCell(row, 2, c.getCin(), null);
                writeCell(row, 3, c.getSituationPro() != null ? c.getSituationPro().name() : "—", null);
                writeCell(row, 4, fmt(c.getRevenusMensuels()), null);
                writeCell(row, 5, c.getTauxEndettement() != null ? fmt(c.getTauxEndettement()) : "—", null);

                if (s == null) {
                    writeCell(row, 6, "—", null);
                    writeCell(row, 7, "—", null);
                    writeCell(row, 8, "Aucun score", null);
                    writeCell(row, 9, "—", null);
                } else if (masque) {
                    writeCell(row, 6, "En attente", null);
                    writeCell(row, 7, "En attente", null);
                    writeCell(row, 8, "En attente", null);
                    writeCell(row, 9, s.getCreatedAt() != null ? s.getCreatedAt().format(DT) : "—", null);
                } else {
                    writeCell(row, 6, fmt(s.getValeurScore()), null);
                    writeCell(row, 7, s.getNiveauRisque() != null ? s.getNiveauRisque().name() : "—", null);
                    writeCell(row, 8, statutLabel(s.getStatut()), null);
                    writeCell(row, 9, s.getCreatedAt() != null ? s.getCreatedAt().format(DT) : "—", null);
                }
            }

            int[] widths = {18, 18, 14, 26, 22, 22, 14, 18, 14, 20};
            for (int i = 0; i < widths.length; i++) sheet.setColumnWidth(i, widths[i] * 256);

            wb.write(out);
            return out.toByteArray();

        } catch (IOException e) {
            throw new RuntimeException("Erreur lors de la génération du fichier Excel : " + e.getMessage(), e);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private void row(Sheet sheet, int[] r, String label, String value) {
        Row row = sheet.createRow(r[0]++);
        row.createCell(0).setCellValue(label);
        row.createCell(1).setCellValue(value);
    }

    private void sectionRow(Sheet sheet, int[] r, CellStyle style, String title) {
        if (r[0] > 0) r[0]++; // ligne vide avant la section
        Row row = sheet.createRow(r[0]++);
        Cell cell = row.createCell(0);
        cell.setCellValue(title);
        cell.setCellStyle(style);
    }

    private void writeCell(Row row, int col, String value, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(value != null ? value : "");
        if (style != null) cell.setCellStyle(style);
    }

    private void applyHeaderToFirstCell(Sheet sheet, CellStyle header) {
        Row first = sheet.getRow(0);
        if (first != null && first.getCell(0) != null) first.getCell(0).setCellStyle(header);
    }

    private CellStyle headerStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        style.setFont(font);
        return style;
    }

    private CellStyle sectionStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREY_50_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return style;
    }

    private String decisionLabel(Score s) {
        return statutLabel(s.getStatut());
    }

    private String statutLabel(StatutScore statut) {
        if (statut == null) return "—";
        return switch (statut) {
            case VALIDE     -> "Validé";
            case EN_ATTENTE -> "En attente";
            case REJETE     -> "Rejeté";
        };
    }

    private String analysteName(Long userId) {
        if (userId == null) return "—";
        return userRepository.findById(userId)
                .map(u -> u.getPrenom() + " " + u.getNom())
                .orElse("—");
    }

    private int nz(Integer v) { return v != null ? v : 0; }

    private String fmt(Double v) { return v != null ? String.format("%.2f", v) : "—"; }
}
