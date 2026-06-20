package com.zara.hack.analyze;

import lombok.*;

import java.time.Instant;
import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
public class ResAnalysisDTO {
    private Long id;
    private List<String> analysis;
    private Instant createdAt;
    private Instant updatedAt;
}
