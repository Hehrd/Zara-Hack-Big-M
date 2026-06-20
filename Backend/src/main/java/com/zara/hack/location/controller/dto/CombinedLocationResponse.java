package com.zara.hack.location.controller.dto;

import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record CombinedLocationResponse(
        String city,
        BusinessNeeds businessNeeds,
        List<DatasetCategory> selectedCategories,
        List<LayerWeight> layerWeights,
        List<LsoaScore> heatmapLayer,
        List<LsoaScore> rankedLocations,
        List<LocationExplanation> explanations
) {
}
