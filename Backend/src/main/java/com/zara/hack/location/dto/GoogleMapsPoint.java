package com.zara.hack.location.dto;

import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record GoogleMapsPoint(
        String categoryId,
        String name,
        double latitude,
        double longitude,
        String placeId
) {
}
