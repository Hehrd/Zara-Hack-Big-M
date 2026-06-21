package com.zara.hack.analyze.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ReqRescoreDTO(@NotEmpty List<WeightOverride> weights) {

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record WeightOverride(@NotBlank String categoryId, double weight) {
    }
}
