package com.zara.hack.location.service;

import com.zara.hack.location.controller.dto.DatasetCategory;
import com.zara.hack.location.controller.dto.LsoaScore;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Deterministic explanation generator used for every top-3 LSOA when the
 * OpenAI call is unavailable, fails, or is rate-limited. The spec keeps this
 * fallback enabled at all times.
 */
@Component
public class TemplateExplanationFallback {

    public String explain(LsoaScore score, List<DatasetCategory> categories) {
        Map<String, String> names = categories.stream()
                .collect(Collectors.toMap(DatasetCategory::categoryId, DatasetCategory::displayName, (a, b) -> a));

        List<Map.Entry<String, Double>> sorted = score.weightedLayerValues().entrySet().stream()
                .sorted(Comparator.comparingDouble((Map.Entry<String, Double> e) -> Math.abs(e.getValue())).reversed())
                .toList();

        String positives = sorted.stream()
                .filter(e -> e.getValue() > 0)
                .limit(2)
                .map(e -> names.getOrDefault(e.getKey(), e.getKey()))
                .collect(Collectors.joining(" and "));

        String negatives = sorted.stream()
                .filter(e -> e.getValue() < 0)
                .limit(1)
                .map(e -> names.getOrDefault(e.getKey(), e.getKey()))
                .collect(Collectors.joining(", "));

        StringBuilder sb = new StringBuilder();
        sb.append(score.lsoaName())
                .append(" scores ")
                .append(String.format("%.2f", score.finalScore()))
                .append(" overall");
        if (!positives.isBlank()) {
            sb.append(", driven mainly by strong ").append(positives.toLowerCase());
        }
        if (!negatives.isBlank()) {
            sb.append(", held back by ").append(negatives.toLowerCase());
        }
        sb.append(". This area is recommended as a promising zone for your business rather than an exact storefront.");
        return sb.toString();
    }
}
