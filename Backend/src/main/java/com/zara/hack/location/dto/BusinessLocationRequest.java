package com.zara.hack.location.dto;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotBlank;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record BusinessLocationRequest(
        @NotBlank String city,
        @NotBlank String businessDescription,
        Integer requestedResultCount,
        // Optional GeoJSON Polygon geometry restricting scoring to a sub-area of
        // the city. When null, the whole city is scored.
        JsonNode region
) {
}
