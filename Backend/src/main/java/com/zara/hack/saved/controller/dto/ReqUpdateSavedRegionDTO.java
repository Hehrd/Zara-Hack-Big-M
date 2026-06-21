package com.zara.hack.saved.controller.dto;

import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ReqUpdateSavedRegionDTO(
        String notes,
        List<String> tags
) {
}
