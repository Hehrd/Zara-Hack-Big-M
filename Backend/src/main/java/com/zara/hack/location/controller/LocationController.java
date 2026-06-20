package com.zara.hack.location.controller;

import com.zara.hack.location.controller.dto.BusinessLocationRequest;
import com.zara.hack.location.controller.dto.CombinedLocationResponse;
import com.zara.hack.location.service.LocationRecommendationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class LocationController {

    private final LocationRecommendationService service;

    public LocationController(LocationRecommendationService service) {
        this.service = service;
    }

    @PostMapping("/api/location-recommendations")
    public CombinedLocationResponse recommend(@Valid @RequestBody BusinessLocationRequest request) {
        return service.recommend(request);
    }
}
