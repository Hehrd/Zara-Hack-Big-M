package com.zara.hack.location.client;

import tools.jackson.databind.JsonNode;
import com.zara.hack.location.config.LocationProperties;
import com.zara.hack.location.controller.dto.GoogleMapsPoint;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Retrieves competitor and relevant-location points in London via the Google
 * Places API (Text Search, New). Resilient by design: any failure (missing key,
 * disabled API, quota) yields an empty point list so the demographic layers
 * still produce a heatmap. Responses are cached per query to respect quota.
 */
@Component
public class GoogleMapsClient {

    private static final Logger log = LoggerFactory.getLogger(GoogleMapsClient.class);
    private static final String SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
    // Rough bounding box around Greater London for location bias.
    private static final Map<String, Object> LONDON_BIAS = Map.of(
            "rectangle", Map.of(
                    "low", Map.of("latitude", 51.28, "longitude", -0.51),
                    "high", Map.of("latitude", 51.70, "longitude", 0.33)
            )
    );

    private final LocationProperties properties;
    private final RestClient restClient;
    private final Map<String, List<GoogleMapsPoint>> cache = new ConcurrentHashMap<>();

    public GoogleMapsClient(LocationProperties properties) {
        this.properties = properties;
        this.restClient = RestClient.builder().baseUrl(SEARCH_URL).build();
    }

    public List<GoogleMapsPoint> fetchPoints(String businessType, List<String> needs,
                                             List<String> selectedCategoryIds, String city) {
        List<GoogleMapsPoint> points = new ArrayList<>();
        if (!properties.googleMapsEnabled()) {
            log.info("Google Maps key not configured; skipping point layers");
            return points;
        }
        if (selectedCategoryIds.contains("competitors")) {
            points.addAll(textSearch("competitors", businessType + " in " + city, city));
        }
        if (selectedCategoryIds.contains("relevant_locations")) {
            String term = needs.isEmpty() ? businessType : needs.get(0);
            points.addAll(textSearch("relevant_locations", term + " in " + city, city));
        }
        return points;
    }

    private List<GoogleMapsPoint> textSearch(String categoryId, String query, String city) {
        String cacheKey = categoryId + "|" + query.toLowerCase();
        List<GoogleMapsPoint> cached = cache.get(cacheKey);
        if (cached != null) {
            return cached;
        }
        List<GoogleMapsPoint> results = new ArrayList<>();
        // Location bias improves precision; only London is calibrated for the POC.
        Map<String, Object> requestBody = "London".equalsIgnoreCase(city)
                ? Map.of("textQuery", query, "maxResultCount", 20, "locationBias", LONDON_BIAS)
                : Map.of("textQuery", query, "maxResultCount", 20);
        try {
            JsonNode body = restClient.post()
                    .uri("")
                    .header("Content-Type", "application/json")
                    .header("X-Goog-Api-Key", properties.googleMapsApiKey())
                    .header("X-Goog-FieldMask", "places.id,places.displayName,places.location")
                    .body(requestBody)
                    .retrieve()
                    .body(JsonNode.class);
            JsonNode places = body == null ? null : body.get("places");
            if (places != null && places.isArray()) {
                for (JsonNode place : places) {
                    JsonNode loc = place.get("location");
                    if (loc == null) {
                        continue;
                    }
                    results.add(new GoogleMapsPoint(
                            categoryId,
                            place.path("displayName").path("text").asText(""),
                            loc.path("latitude").asDouble(),
                            loc.path("longitude").asDouble(),
                            place.path("id").asText("")
                    ));
                }
            }
            log.info("Google Places '{}' returned {} points", query, results.size());
        } catch (Exception ex) {
            log.warn("Google Places search failed for '{}': {}", query, ex.getMessage());
        }
        cache.put(cacheKey, results);
        return results;
    }
}
