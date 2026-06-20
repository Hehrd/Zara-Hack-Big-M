package com.zara.hack.location.controller.dto;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record SparkScoringInput(
        String runId,
        String city,
        List<String> selectedCategories,
        List<LayerWeight> layerWeights,
        List<GoogleMapsPoint> googleMapsPoints,
        JsonNode region
) {
}
