package com.zara.hack.location.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.location")
public record LocationProperties(
        String modelServiceUrl,
        String googleMapsApiKey,
        String grokApiKey,
        String grokApiUrl,
        String grokModel,
        String sparkSubmitPath,
        String sparkJobPath,
        String precomputedLayersPath,
        String javaHome,
        String sparkHome,
        String pythonPath,
        String runDir,
        Integer requestedResultCount
) {
    public boolean grokEnabled() {
        return grokApiKey != null && !grokApiKey.isBlank();
    }

    public boolean googleMapsEnabled() {
        return googleMapsApiKey != null && !googleMapsApiKey.isBlank();
    }

    public int resultCount() {
        return requestedResultCount == null || requestedResultCount < 1 ? 3 : requestedResultCount;
    }
}
