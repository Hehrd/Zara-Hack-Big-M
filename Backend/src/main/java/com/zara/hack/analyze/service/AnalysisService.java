package com.zara.hack.analyze.service;

import com.zara.hack.analyze.controller.dto.AnalysisDetailDTO;
import com.zara.hack.analyze.controller.dto.AnalysisSummaryDTO;
import com.zara.hack.analyze.controller.dto.ReqRescoreDTO;
import com.zara.hack.analyze.controller.dto.ResAnalysisDTO;
import com.zara.hack.analyze.persistence.entity.AnalysisEntity;
import com.zara.hack.analyze.persistence.repository.AnalysisRepository;
import com.zara.hack.auth.entity.AppUser;
import com.zara.hack.auth.repository.AppUserRepository;
import com.zara.hack.common.exception.AnalysisNotFoundException;
import com.zara.hack.common.exception.AuthenticationUserNotFoundException;
import com.zara.hack.common.exception.CustomException;
import com.zara.hack.location.controller.dto.CombinedLocationResponse;
import com.zara.hack.location.controller.dto.LayerWeight;
import com.zara.hack.location.controller.dto.LocationExplanation;
import com.zara.hack.location.controller.dto.LsoaScore;
import com.zara.hack.saved.persistence.repository.SavedRegionRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import tools.jackson.databind.json.JsonMapper;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AnalysisService {

    private final AnalysisRepository analysisRepository;
    private final AppUserRepository userRepository;
    private final SavedRegionRepository savedRegionRepository;
    private final JsonMapper jsonMapper = new JsonMapper();

    public AnalysisService(AnalysisRepository analysisRepository, AppUserRepository userRepository,
                           SavedRegionRepository savedRegionRepository) {
        this.analysisRepository = analysisRepository;
        this.userRepository = userRepository;
        this.savedRegionRepository = savedRegionRepository;
    }

    @Transactional
    public Long saveLocationAnalysis(Long userId, String city, String businessDescription,
                                     String regionJson, Integer requestedResultCount, String resultJson) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new AuthenticationUserNotFoundException("Authenticated user not found"));

        AnalysisEntity entity = new AnalysisEntity();
        entity.setUser(user);
        entity.setCity(city);
        entity.setBusinessDescription(businessDescription);
        entity.setRegion(regionJson);
        entity.setRequestedResultCount(requestedResultCount);
        entity.setResult(resultJson);
        return analysisRepository.saveAndFlush(entity).getId();
    }

    @Transactional
    public List<AnalysisSummaryDTO> getAnalysisSummaries(Long userId) {
        return analysisRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(e -> new AnalysisSummaryDTO(e.getId(), e.getCity(), e.getBusinessDescription(),
                        e.getRequestedResultCount(), e.isPublicShared(), e.getCreatedAt()))
                .toList();
    }

    @Transactional
    public List<AnalysisSummaryDTO> getPublicAnalysisSummaries(Long userId) {
        return analysisRepository.findAllByUserIdAndPublicSharedTrueOrderByCreatedAtDesc(userId).stream()
                .map(e -> new AnalysisSummaryDTO(e.getId(), e.getCity(), e.getBusinessDescription(),
                        e.getRequestedResultCount(), true, e.getCreatedAt()))
                .toList();
    }

    @Transactional
    public AnalysisDetailDTO getAnalysisDetail(Long userId, Long analysisId) {
        AnalysisEntity e = findOwnedAnalysis(userId, analysisId);
        return new AnalysisDetailDTO(
                e.getId(),
                e.getCity(),
                e.getBusinessDescription(),
                e.getRequestedResultCount(),
                e.getRegion() == null ? null : jsonMapper.readTree(e.getRegion()),
                e.getResult() == null ? null : jsonMapper.readTree(e.getResult()),
                e.isPublicShared(),
                e.getCreatedAt());
    }

    @Transactional
    public AnalysisDetailDTO getPublicAnalysisDetail(Long ownerId, Long analysisId) {
        AnalysisEntity e = analysisRepository.findByIdAndUserIdAndPublicSharedTrue(analysisId, ownerId)
                .orElseThrow(() -> new AnalysisNotFoundException("Analysis not found or private"));
        return new AnalysisDetailDTO(e.getId(), e.getCity(), e.getBusinessDescription(),
                e.getRequestedResultCount(), e.getRegion() == null ? null : jsonMapper.readTree(e.getRegion()),
                e.getResult() == null ? null : jsonMapper.readTree(e.getResult()), true, e.getCreatedAt());
    }

    @Transactional
    public AnalysisDetailDTO updateVisibility(Long userId, Long analysisId, boolean publicShared) {
        AnalysisEntity entity = findOwnedAnalysis(userId, analysisId);
        entity.setPublicShared(publicShared);
        if (!publicShared) {
            savedRegionRepository.findAllByAnalysisId(analysisId).forEach(region -> region.setPublicShared(false));
        }
        analysisRepository.saveAndFlush(entity);
        return getAnalysisDetail(userId, analysisId);
    }

    @Transactional
    public AnalysisDetailDTO rescoreAnalysis(Long userId, Long analysisId, ReqRescoreDTO req) {
        AnalysisEntity entity = findOwnedAnalysis(userId, analysisId);
        if (entity.getResult() == null) {
            throw new CustomException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "This analysis has no scored result to re-score");
        }
        CombinedLocationResponse res = jsonMapper.readValue(entity.getResult(), CombinedLocationResponse.class);

        Map<String, Double> overrides = req.weights().stream()
                .collect(Collectors.toMap(ReqRescoreDTO.WeightOverride::categoryId,
                        ReqRescoreDTO.WeightOverride::weight, (a, b) -> b));

        List<LayerWeight> newWeights = res.layerWeights().stream()
                .map(lw -> overrides.containsKey(lw.categoryId())
                        ? new LayerWeight(lw.categoryId(), overrides.get(lw.categoryId()),
                                appendEdited(lw.reason()))
                        : lw)
                .toList();

        List<LsoaScore> rescored = res.heatmapLayer().stream()
                .map(score -> applyWeights(score, newWeights))
                .sorted(Comparator.comparingDouble(LsoaScore::finalScore).reversed())
                .toList();

        int n = entity.getRequestedResultCount() != null && entity.getRequestedResultCount() > 0
                ? entity.getRequestedResultCount() : rescored.size();
        List<LsoaScore> ranked = rescored.subList(0, Math.min(n, rescored.size()));

        Set<String> rankedCodes = ranked.stream().map(LsoaScore::lsoaCode).collect(Collectors.toSet());
        List<LocationExplanation> explanations = res.explanations() == null ? List.of()
                : res.explanations().stream()
                        .filter(e -> rankedCodes.contains(e.lsoaCode()))
                        .toList();

        CombinedLocationResponse updated = new CombinedLocationResponse(
                res.analysisId(), res.city(), res.businessNeeds(), res.selectedCategories(),
                newWeights, rescored, ranked, explanations, res.googleMapsPoints());

        entity.setResult(jsonMapper.writeValueAsString(updated));
        analysisRepository.saveAndFlush(entity);
        return getAnalysisDetail(userId, analysisId);
    }

    private static String appendEdited(String reason) {
        if (reason == null || reason.isBlank()) {
            return "edited by user";
        }
        return reason.endsWith(" (edited)") ? reason : reason + " (edited)";
    }

    private static LsoaScore applyWeights(LsoaScore score, List<LayerWeight> weights) {
        Map<String, Double> normalized = score.normalizedLayerValues() == null
                ? Map.of() : score.normalizedLayerValues();
        Map<String, Double> weighted = new LinkedHashMap<>();
        double sum = 0.0;
        for (LayerWeight lw : weights) {
            double nv = normalized.getOrDefault(lw.categoryId(), 0.0);
            double w = lw.weight() * nv;
            weighted.put(lw.categoryId(), w);
            sum += w;
        }
        return new LsoaScore(score.lsoaCode(), score.lsoaName(), score.geometry(),
                score.centroid(), score.normalizedLayerValues(), weighted, sum);
    }

    @Transactional
    public ResAnalysisDTO saveAnalysis(Long userId, List<String> analysis) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new AuthenticationUserNotFoundException("Authenticated user not found"));

        AnalysisEntity entity = new AnalysisEntity();
        entity.setUser(user);
        entity.setAnalysis(List.copyOf(analysis));
        return toDto(analysisRepository.saveAndFlush(entity));
    }

    @Transactional
    public ResAnalysisDTO updateAnalysis(Long userId, Long analysisId, List<String> analysis) {
        AnalysisEntity entity = findOwnedAnalysis(userId, analysisId);
        entity.setAnalysis(List.copyOf(analysis));
        return toDto(analysisRepository.saveAndFlush(entity));
    }

    @Transactional
    public void deleteAnalysis(Long userId, Long analysisId) {
        analysisRepository.delete(findOwnedAnalysis(userId, analysisId));
    }

    private AnalysisEntity findOwnedAnalysis(Long userId, Long analysisId) {
        return analysisRepository.findByIdAndUserId(analysisId, userId)
                .orElseThrow(() -> new AnalysisNotFoundException("Analysis not found"));
    }

    private ResAnalysisDTO toDto(AnalysisEntity entity) {
        return new ResAnalysisDTO(
                entity.getId(),
                List.copyOf(entity.getAnalysis()),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}

