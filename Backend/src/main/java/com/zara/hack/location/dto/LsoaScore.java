package com.zara.hack.location.dto;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.Map;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record LsoaScore(
        String lsoaCode,
        String lsoaName,
        JsonNode geometry,
        Centroid centroid,
        Map<String, Double> normalizedLayerValues,
        Map<String, Double> weightedLayerValues,
        double finalScore
) {
}
