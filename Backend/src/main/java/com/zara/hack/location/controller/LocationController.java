package com.zara.hack.location.controller;

import com.zara.hack.location.controller.dto.BusinessLocationRequest;
import com.zara.hack.location.controller.dto.CombinedLocationResponse;
import com.zara.hack.location.service.LocationRecommendationService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class LocationController {

    private final LocationRecommendationService service;

    public LocationController(LocationRecommendationService service) {
        this.service = service;
    }

    @PostMapping("/api/location-recommendations")
    public CombinedLocationResponse recommend(@AuthenticationPrincipal Jwt jwt,
                                              @Valid @RequestBody BusinessLocationRequest request,
                                              @RequestParam(value = "count", required = false) Integer count) {
        return service.recommend(request, count, Long.valueOf(jwt.getSubject()));
    }
}
