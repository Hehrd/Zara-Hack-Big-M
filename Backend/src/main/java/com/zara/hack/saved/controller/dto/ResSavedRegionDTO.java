package com.zara.hack.saved.controller.dto;

import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.time.Instant;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ResSavedRegionDTO(
        Long id,
        Long analysisId,
        String lsoaCode,
        String lsoaName,
        double finalScore,
        Double centroidLat,
        Double centroidLng,
        String city,
        String businessDescription,
        Integer requestedResultCount,
        String notes,
        List<String> tags,
        boolean publicShared,
        Instant createdAt,
        Instant updatedAt
) {
}
