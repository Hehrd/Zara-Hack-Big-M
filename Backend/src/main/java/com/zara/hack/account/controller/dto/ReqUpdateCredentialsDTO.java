package com.zara.hack.account.controller.dto;

import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ReqUpdateCredentialsDTO(
        String email,
        String currentPassword,
        String newPassword
) {
}
