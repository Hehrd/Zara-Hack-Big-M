package com.zara.hack.analyze.controller.dto;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.time.Instant;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record AnalysisDetailDTO(
        Long id,
        String city,
        String businessDescription,
        Integer requestedResultCount,
        JsonNode region,
        JsonNode result,
        Instant createdAt
) {
}
