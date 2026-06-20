package com.zara.hack.location.client;

import tools.jackson.databind.JsonNode;
import com.zara.hack.location.config.LocationProperties;
import com.zara.hack.location.controller.dto.LsoaScore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * xAI Grok integration that explains a top-ranked LSOA. Returns null on any
 * failure (no key, network, rate limit) so the caller falls back to the
 * deterministic template explanation.
 */
@Component
public class GrokExplanationClient {

    private static final Logger log = LoggerFactory.getLogger(GrokExplanationClient.class);

    private final LocationProperties properties;
    private final RestClient restClient;

    public GrokExplanationClient(LocationProperties properties) {
        this.properties = properties;
        this.restClient = RestClient.builder().build();
    }

    public boolean isEnabled() {
        return properties.grokEnabled();
    }

    public String explain(LsoaScore score, String businessType) {
        if (!properties.grokEnabled()) {
            return null;
        }
        try {
            String prompt = buildPrompt(score, businessType);
            JsonNode body = restClient.post()
                    .uri(properties.grokApiUrl())
                    .header("Authorization", "Bearer " + properties.grokApiKey())
                    .header("Content-Type", "application/json")
                    .body(Map.of(
                            "model", properties.grokModel(),
                            "messages", List.of(
                                    Map.of("role", "system", "content",
                                            "You are a concise location analyst. Explain in 2-3 sentences why an "
                                                    + "area suits a business, referencing its strongest data layers. "
                                                    + "Treat results as area recommendations, not exact storefronts."),
                                    Map.of("role", "user", "content", prompt)
                            ),
                            "temperature", 0.4
                    ))
                    .retrieve()
                    .body(JsonNode.class);
            String text = body == null ? null
                    : body.path("choices").path(0).path("message").path("content").asText(null);
            if (text == null || text.isBlank()) {
                return null;
            }
            return text.trim();
        } catch (Exception ex) {
            log.warn("Grok explanation failed for {}: {}", score.lsoaCode(), ex.getMessage());
            return null;
        }
    }

    private String buildPrompt(LsoaScore score, String businessType) {
        StringBuilder sb = new StringBuilder();
        sb.append("Business type: ").append(businessType).append('\n');
        sb.append("Area: ").append(score.lsoaName())
                .append(" (LSOA ").append(score.lsoaCode()).append(")\n");
        sb.append("Final score: ").append(String.format("%.3f", score.finalScore())).append('\n');
        sb.append("Weighted layer contributions:\n");
        score.weightedLayerValues().forEach((k, v) ->
                sb.append("  - ").append(k).append(": ").append(String.format("%.3f", v)).append('\n'));
        return sb.toString();
    }
}
