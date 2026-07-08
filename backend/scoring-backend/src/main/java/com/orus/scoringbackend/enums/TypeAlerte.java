package com.orus.scoringbackend.enums;

public enum TypeAlerte {
    SCORE_ELEVE,            // client à haut risque
    DONNEES_INCOHERENTES,   // taux d'endettement incohérent
    VALIDATION_EN_ATTENTE,  // score en attente de validation
    SCORE_A_REVOIR,         // score à revoir (haut risque non validé)
    ANALYSE_EXPIREE,        // analyse trop ancienne
    SCORE_RECALCULE,        // score récemment recalculé
    DOCUMENTS_MANQUANTS,    // données obligatoires manquantes
    ENDETTEMENT_ELEVE       // taux d'endettement ≥ 50% (règle métier)
}
