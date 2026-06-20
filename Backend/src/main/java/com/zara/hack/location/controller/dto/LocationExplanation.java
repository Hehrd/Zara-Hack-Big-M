package com.zara.hack.location.controller.dto;

import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record LocationExplanation(
        String lsoaCode,
        String explanation,
        String provider
) {
}
