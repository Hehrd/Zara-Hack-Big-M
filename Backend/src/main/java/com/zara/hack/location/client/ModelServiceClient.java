package com.zara.hack.location.client;

import com.zara.hack.location.config.LocationProperties;
import com.zara.hack.location.dto.DatasetCategory;
import com.zara.hack.location.dto.ModelAnalysisResponse;
import com.zara.hack.common.exception.CustomException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.util.List;
import java.util.Map;

@Component
public class ModelServiceClient {

    private final RestClient restClient;

    public ModelServiceClient(LocationProperties properties) {
        // uvicorn speaks HTTP/1.1 only; the JDK client's default h2c upgrade attempt
        // makes it drop the request body, so pin the client to HTTP/1.1.
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .build();
        this.restClient = RestClient.builder()
                .baseUrl(properties.modelServiceUrl())
                .requestFactory(new JdkClientHttpRequestFactory(httpClient))
                .build();
    }

    public ModelAnalysisResponse analyze(String businessDescription, List<DatasetCategory> supportedCategories) {
        try {
            List<Map<String, String>> categories = supportedCategories.stream()
                    .map(c -> Map.of(
                            "category_id", c.categoryId(),
                            "display_name", c.displayName(),
                            "source", c.source(),
                            "polarity", c.polarity()))
                    .toList();
            return restClient.post()
                    .uri("/model/business-analysis")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "business_description", businessDescription,
                            "supported_dataset_categories", categories
                    ))
                    .retrieve()
                    .body(ModelAnalysisResponse.class);
        } catch (Exception ex) {
            throw new CustomException(HttpStatus.BAD_GATEWAY,
                    "Model service call failed: " + ex.getMessage(), ex);
        }
    }
}
