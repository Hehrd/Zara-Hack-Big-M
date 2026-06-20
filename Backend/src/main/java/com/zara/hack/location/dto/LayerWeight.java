package com.zara.hack.location.dto;

import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record LayerWeight(
        String categoryId,
        double weight,
        String reason
) {
}
