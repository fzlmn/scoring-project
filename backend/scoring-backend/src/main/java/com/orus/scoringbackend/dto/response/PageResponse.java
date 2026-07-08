package com.orus.scoringbackend.dto.response;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Enveloppe de pagination stable et réutilisable pour les réponses paginées.
 * Évite de sérialiser directement {@code PageImpl} (déconseillé sous Spring Boot 3).
 *
 * @param page numéro de page (base 0, cohérent avec Spring Pageable)
 */
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last
) {
    public static <T> PageResponse<T> from(Page<T> p) {
        return new PageResponse<>(
                p.getContent(),
                p.getNumber(),
                p.getSize(),
                p.getTotalElements(),
                p.getTotalPages(),
                p.isFirst(),
                p.isLast()
        );
    }
}
