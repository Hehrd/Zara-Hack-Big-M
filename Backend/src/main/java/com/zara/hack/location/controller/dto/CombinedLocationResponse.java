package com.zara.hack.location.controller.dto;

import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record CombinedLocationResponse(
        Long analysisId,
        String city,
        BusinessNeeds businessNeeds,
        List<DatasetCategory> selectedCategories,
        List<LayerWeight> layerWeights,
        List<LsoaScore> heatmapLayer,
        List<LsoaScore> rankedLocations,
        List<LocationExplanation> explanations,
        List<GoogleMapsPoint> googleMapsPoints
) {
    public CombinedLocationResponse withAnalysisId(Long analysisId) {
        return new CombinedLocationResponse(analysisId, city, businessNeeds, selectedCategories,
                layerWeights, heatmapLayer, rankedLocations, explanations, googleMapsPoints);
    }
}
