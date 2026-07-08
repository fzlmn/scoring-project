package com.orus.scoringbackend.repositories.specifications;

import com.orus.scoringbackend.entities.Score;
import com.orus.scoringbackend.enums.NiveauRisque;
import com.orus.scoringbackend.enums.StatutScore;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;

/**
 * Filtres composables pour la recherche paginée des scores.
 *
 * <p>Chaque méthode renvoie une {@link Specification} n'ajoutant sa clause que
 * lorsqu'elle est réellement appliquée : les paramètres à null ne génèrent aucun
 * prédicat, ce qui évite le motif {@code (:p IS NULL OR ...)} — incompatible avec
 * le typage des paramètres liés côté PostgreSQL.</p>
 */
public final class ScoreSpecifications {

    private ScoreSpecifications() {}

    /**
     * Charge le client dans la requête de contenu (évite le N+1) sans l'appliquer
     * à la requête de comptage (où un fetch n'a pas de sens et n'est pas permis).
     */
    public static Specification<Score> withClient() {
        return (root, query, cb) -> {
            Class<?> resultType = query == null ? null : query.getResultType();
            if (resultType != Long.class && resultType != long.class) {
                root.fetch("client", JoinType.LEFT);
            }
            return cb.conjunction();
        };
    }

    /** Périmètre : uniquement les scores des clients créés par cet utilisateur. */
    public static Specification<Score> ownedBy(Long userId) {
        return (root, query, cb) -> cb.equal(root.get("client").get("createdBy").get("id"), userId);
    }

    public static Specification<Score> hasStatut(StatutScore statut) {
        return (root, query, cb) -> cb.equal(root.get("statut"), statut);
    }

    public static Specification<Score> hasNiveauRisque(NiveauRisque niveau) {
        return (root, query, cb) -> cb.equal(root.get("niveauRisque"), niveau);
    }

    public static Specification<Score> forClient(Long clientId) {
        return (root, query, cb) -> cb.equal(root.get("client").get("id"), clientId);
    }

    public static Specification<Score> createdFrom(LocalDateTime from) {
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), from);
    }

    public static Specification<Score> createdUntil(LocalDateTime toExclusive) {
        return (root, query, cb) -> cb.lessThan(root.get("createdAt"), toExclusive);
    }
}
