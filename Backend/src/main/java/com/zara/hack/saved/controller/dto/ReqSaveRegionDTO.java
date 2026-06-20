package com.zara.hack.saved.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ReqSaveRegionDTO(
        @NotNull Long analysisId,
        @NotBlank String lsoaCode,
        String notes,
        List<String> tags
) {
}
