package com.zara.hack.location.service;

import com.zara.hack.common.exception.CustomException;
import com.zara.hack.location.client.GoogleMapsClient;
import com.zara.hack.location.client.ModelServiceClient;
import com.zara.hack.location.client.OpenAiExplanationClient;
import com.zara.hack.location.config.LocationProperties;
import com.zara.hack.location.dto.BusinessLocationRequest;
import com.zara.hack.location.dto.CombinedLocationResponse;
import com.zara.hack.location.dto.GoogleMapsPoint;
import com.zara.hack.location.dto.LayerWeight;
import com.zara.hack.location.dto.LocationExplanation;
import com.zara.hack.location.dto.LsoaScore;
import com.zara.hack.location.dto.ModelAnalysisResponse;
import com.zara.hack.location.dto.SparkOutput;
import com.zara.hack.location.dto.SparkScoringInput;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class LocationRecommendationService {

    private static final Logger log = LoggerFactory.getLogger(LocationRecommendationService.class);
    private static final String PROVIDER_OPENAI = "OpenAI";
    private static final String PROVIDER_TEMPLATE = "Spring Boot template fallback";

    private final ModelServiceClient modelServiceClient;
    private final GoogleMapsClient googleMapsClient;
    private final SparkScoringRunner sparkScoringRunner;
    private final OpenAiExplanationClient openAiExplanationClient;
    private final TemplateExplanationFallback templateFallback;
    private final LocationProperties properties;

    public LocationRecommendationService(ModelServiceClient modelServiceClient,
                                         GoogleMapsClient googleMapsClient,
                                         SparkScoringRunner sparkScoringRunner,
                                         OpenAiExplanationClient openAiExplanationClient,
                                         TemplateExplanationFallback templateFallback,
                                         LocationProperties properties) {
        this.modelServiceClient = modelServiceClient;
        this.googleMapsClient = googleMapsClient;
        this.sparkScoringRunner = sparkScoringRunner;
        this.openAiExplanationClient = openAiExplanationClient;
        this.templateFallback = templateFallback;
        this.properties = properties;
    }

    public CombinedLocationResponse recommend(BusinessLocationRequest request) {
        String city = request.city() == null ? "" : request.city().trim();
        if (city.isEmpty()) {
            throw new CustomException(HttpStatus.BAD_REQUEST, "A city is required");
        }
        String runId = "run-" + UUID.randomUUID().toString().substring(0, 8);

        // 1. Model service: needs, selected categories, layer weights.
        ModelAnalysisResponse analysis = modelServiceClient.analyze(
                request.businessDescription(), SupportedCategories.ALL);
        List<String> selectedIds = analysis.selectedCategories().stream()
                .map(c -> c.categoryId()).toList();

        // 2. Google Maps point layers (competitors / relevant locations).
        List<GoogleMapsPoint> points = googleMapsClient.fetchPoints(
                analysis.businessNeeds().businessType(),
                analysis.businessNeeds().needs(),
                selectedIds,
                city);

        // 3-5. Spark scoring (write input -> spark-submit -> read output).
        SparkScoringInput sparkInput = new SparkScoringInput(
                runId, city, selectedIds, analysis.layerWeights(), points);
        SparkOutput sparkOutput = sparkScoringRunner.run(sparkInput);
        List<LsoaScore> scores = sparkOutput.lsoaScores();
        if (scores == null || scores.isEmpty()) {
            // The pipeline is city-agnostic, but only London demographics are loaded
            // for this proof of concept; other cities have no precomputed layers yet.
            throw new CustomException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "No demographic data is loaded for \"" + city + "\" yet. "
                            + "This proof of concept currently covers London only.");
        }

        // 6. Top-N ranked locations + explanations.
        int n = request.requestedResultCount() != null && request.requestedResultCount() > 0
                ? request.requestedResultCount() : properties.resultCount();
        List<LsoaScore> ranked = scores.subList(0, Math.min(n, scores.size()));
        List<LocationExplanation> explanations = explain(ranked, analysis);

        return new CombinedLocationResponse(
                city,
                analysis.businessNeeds(),
                analysis.selectedCategories(),
                analysis.layerWeights(),
                scores,
                ranked,
                explanations);
    }

    private List<LocationExplanation> explain(List<LsoaScore> ranked, ModelAnalysisResponse analysis) {
        List<LocationExplanation> explanations = new ArrayList<>();
        String businessType = analysis.businessNeeds().businessType();
        for (LsoaScore score : ranked) {
            String text = openAiExplanationClient.explain(score, businessType);
            String provider = PROVIDER_OPENAI;
            if (text == null) {
                text = templateFallback.explain(score, analysis.selectedCategories());
                provider = PROVIDER_TEMPLATE;
            }
            explanations.add(new LocationExplanation(score.lsoaCode(), text, provider));
        }
        return explanations;
    }
}
