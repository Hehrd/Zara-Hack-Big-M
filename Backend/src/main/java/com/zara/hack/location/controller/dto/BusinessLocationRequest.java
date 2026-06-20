package com.zara.hack.location.controller.dto;

import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotBlank;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record BusinessLocationRequest(
        @NotBlank String city,
        @NotBlank String businessDescription,
        Integer requestedResultCount
) {
}
