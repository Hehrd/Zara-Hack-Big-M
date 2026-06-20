package com.zara.hack.location.service;

import com.zara.hack.location.dto.DatasetCategory;

import java.util.List;

/**
 * Dataset categories this build actually has data for (the focused set chosen
 * for the hackathon: four Census demographic layers plus the two Google Maps
 * point layers). Sent to the model service so it only weights categories that
 * the Spark job can score.
 */
public final class SupportedCategories {

    public static final List<DatasetCategory> ALL = List.of(
            new DatasetCategory("age", "Age", "Nomis Census 2021 bulk data", "context"),
            new DatasetCategory("population_density", "Population density", "Nomis Census 2021 bulk data", "positive"),
            new DatasetCategory("economic_activity", "Economic activity", "Nomis Census 2021 bulk data", "context"),
            new DatasetCategory("household_deprivation", "Household deprivation", "Nomis Census 2021 bulk data", "context"),
            new DatasetCategory("competitors", "Competitors", "Google Maps API", "negative"),
            new DatasetCategory("relevant_locations", "Relevant nearby locations", "Google Maps API", "positive")
    );

    private SupportedCategories() {
    }
}
