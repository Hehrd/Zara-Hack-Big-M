package com.zara.hack.auth.dto;

import java.time.Instant;

public record SignupResponse(
        Long id,
        String email,
        Instant createdAt
) {
}
