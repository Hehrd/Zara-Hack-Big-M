package com.zara.hack.location.service;

import com.zara.hack.location.controller.dto.DatasetCategory;

import java.util.List;

/**
 * Dataset categories this build actually has data for: the four core Census
 * demographic layers, the extended Census 2021 demographic layers (ethnicity,
 * religion, language, country of birth, health, work, housing, etc.), plus the
 * two Google Maps point layers. Sent to the model service so it only weights
 * categories that the Spark job can score. The {@code categoryId}s must match
 * the keys written by pipeline/precompute_layers.py.
 *
 * <p>Extended demographic layers use polarity {@code context} (sign +1): we
 * expose each population share and let business-need matching decide relevance
 * and weight, rather than hardcoding value judgments about any group.
 */
public final class SupportedCategories {

    private static final String CENSUS = "Nomis Census 2021 bulk data";
    private static final String MAPS = "Google Maps API";

    public static final List<DatasetCategory> ALL = List.of(
            // Core layers
            new DatasetCategory("age", "Age", CENSUS, "context"),
            new DatasetCategory("population_density", "Population density", CENSUS, "positive"),
            new DatasetCategory("economic_activity", "Economic activity", CENSUS, "context"),
            new DatasetCategory("household_deprivation", "Household deprivation", CENSUS, "context"),
            // Ethnic group (TS021)
            new DatasetCategory("ethnic_asian", "Asian ethnic group share", CENSUS, "context"),
            new DatasetCategory("ethnic_black", "Black ethnic group share", CENSUS, "context"),
            new DatasetCategory("ethnic_mixed", "Mixed ethnic group share", CENSUS, "context"),
            new DatasetCategory("ethnic_other", "Other ethnic group share", CENSUS, "context"),
            // Religion (TS030)
            new DatasetCategory("religion_christian", "Christian share", CENSUS, "context"),
            new DatasetCategory("religion_muslim", "Muslim share", CENSUS, "context"),
            new DatasetCategory("religion_hindu", "Hindu share", CENSUS, "context"),
            new DatasetCategory("religion_jewish", "Jewish share", CENSUS, "context"),
            new DatasetCategory("religion_sikh", "Sikh share", CENSUS, "context"),
            new DatasetCategory("religion_none", "No religion share", CENSUS, "context"),
            // Country of birth (TS004)
            new DatasetCategory("born_outside_uk", "Born outside the UK", CENSUS, "context"),
            new DatasetCategory("born_eu", "EU-born share", CENSUS, "context"),
            new DatasetCategory("born_non_eu", "Non-EU-born share", CENSUS, "context"),
            // Language (TS029)
            new DatasetCategory("english_not_main", "Main language not English", CENSUS, "context"),
            new DatasetCategory("english_limited", "Limited English proficiency", CENSUS, "context"),
            // Passports (TS005)
            new DatasetCategory("foreign_passport", "Holds a non-UK passport", CENSUS, "context"),
            // Health & disability (TS037, TS038)
            new DatasetCategory("health_bad", "Bad or very bad health", CENSUS, "context"),
            new DatasetCategory("disability", "Disabled under the Equality Act", CENSUS, "context"),
            // Work (TS059, TS063, TS062, TS060)
            new DatasetCategory("full_time_workers", "Full-time workers", CENSUS, "context"),
            new DatasetCategory("occupation_professional", "Managerial & professional occupations", CENSUS, "context"),
            new DatasetCategory("social_grade_ab", "Higher social grade (NS-SeC AB)", CENSUS, "context"),
            new DatasetCategory("industry_retail", "Works in retail & wholesale", CENSUS, "context"),
            new DatasetCategory("industry_hospitality", "Works in hospitality & food service", CENSUS, "context"),
            new DatasetCategory("industry_professional", "Works in professional services", CENSUS, "context"),
            new DatasetCategory("industry_education", "Works in education", CENSUS, "context"),
            new DatasetCategory("industry_health", "Works in health & social care", CENSUS, "context"),
            // Household & housing (TS017, TS003, TS044, TS054, TS052)
            new DatasetCategory("single_person_household", "One-person households", CENSUS, "context"),
            new DatasetCategory("households_with_children", "Households with dependent children", CENSUS, "context"),
            new DatasetCategory("flats_share", "Lives in flats", CENSUS, "context"),
            new DatasetCategory("private_renters", "Private renters", CENSUS, "context"),
            new DatasetCategory("overcrowded", "Overcrowded households", CENSUS, "context"),
            // Students, cars, travel, second address (TS068, TS045, TS058, TS055)
            new DatasetCategory("students_share", "Schoolchildren & full-time students", CENSUS, "context"),
            new DatasetCategory("no_car_household", "Households with no car or van", CENSUS, "context"),
            new DatasetCategory("short_commute", "Short commute or works from home", CENSUS, "context"),
            new DatasetCategory("student_second_address", "Student second address", CENSUS, "context"),
            // Google Maps point layers
            new DatasetCategory("competitors", "Competitors", MAPS, "negative"),
            new DatasetCategory("relevant_locations", "Relevant nearby locations", MAPS, "positive")
    );

    private SupportedCategories() {
    }
}
