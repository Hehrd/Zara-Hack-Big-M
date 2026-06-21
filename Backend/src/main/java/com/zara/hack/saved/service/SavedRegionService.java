package com.zara.hack.saved.service;

import com.zara.hack.analyze.persistence.entity.AnalysisEntity;
import com.zara.hack.analyze.persistence.repository.AnalysisRepository;
import com.zara.hack.auth.entity.AppUser;
import com.zara.hack.auth.repository.AppUserRepository;
import com.zara.hack.common.exception.AnalysisNotFoundException;
import com.zara.hack.common.exception.AuthenticationUserNotFoundException;
import com.zara.hack.common.exception.CustomException;
import com.zara.hack.common.exception.SavedRegionNotFoundException;
import com.zara.hack.saved.controller.dto.ReqSaveRegionDTO;
import com.zara.hack.saved.controller.dto.ReqUpdateSavedRegionDTO;
import com.zara.hack.saved.controller.dto.ResSavedRegionDTO;
import com.zara.hack.saved.persistence.entity.SavedRegionEntity;
import com.zara.hack.saved.persistence.repository.SavedRegionRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.List;

@Service
public class SavedRegionService {

    private final SavedRegionRepository savedRegionRepository;
    private final AnalysisRepository analysisRepository;
    private final AppUserRepository userRepository;
    private final JsonMapper jsonMapper = new JsonMapper();

    public SavedRegionService(SavedRegionRepository savedRegionRepository,
                              AnalysisRepository analysisRepository,
                              AppUserRepository userRepository) {
        this.savedRegionRepository = savedRegionRepository;
        this.analysisRepository = analysisRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public ResSavedRegionDTO save(Long userId, ReqSaveRegionDTO req) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new AuthenticationUserNotFoundException("Authenticated user not found"));
        AnalysisEntity analysis = analysisRepository.findByIdAndUserId(req.analysisId(), userId)
                .orElseThrow(() -> new AnalysisNotFoundException("Analysis not found"));

        JsonNode lsoa = findLsoa(analysis, req.lsoaCode());

        SavedRegionEntity entity = new SavedRegionEntity();
        entity.setUser(user);
        entity.setAnalysis(analysis);
        entity.setLsoaCode(req.lsoaCode());
        entity.setLsoaName(textOrNull(lsoa.get("lsoa_name")));
        entity.setFinalScore(lsoa.get("final_score").asDouble());
        JsonNode centroid = lsoa.get("centroid");
        if (centroid != null && !centroid.isNull()) {
            entity.setCentroidLat(centroid.get("latitude").asDouble());
            entity.setCentroidLng(centroid.get("longitude").asDouble());
        }
        entity.setCity(analysis.getCity());
        entity.setBusinessDescription(analysis.getBusinessDescription());
        entity.setRequestedResultCount(analysis.getRequestedResultCount());
        entity.setNotes(req.notes());
        entity.setTags(req.tags() == null ? new ArrayList<>() : new ArrayList<>(req.tags()));

        return toDto(savedRegionRepository.saveAndFlush(entity));
    }

    @Transactional
    public List<ResSavedRegionDTO> list(Long userId) {
        return savedRegionRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public List<ResSavedRegionDTO> getPublicRegions(Long ownerId) {
        return savedRegionRepository.findAllByUserIdAndPublicSharedTrueOrderByCreatedAtDesc(ownerId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public ResSavedRegionDTO update(Long userId, Long id, ReqUpdateSavedRegionDTO req) {
        SavedRegionEntity entity = findOwned(userId, id);
        entity.setNotes(req.notes());
        entity.setTags(req.tags() == null ? new ArrayList<>() : new ArrayList<>(req.tags()));
        return toDto(savedRegionRepository.saveAndFlush(entity));
    }

    @Transactional
    public void delete(Long userId, Long id) {
        savedRegionRepository.delete(findOwned(userId, id));
    }

    private SavedRegionEntity findOwned(Long userId, Long id) {
        return savedRegionRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new SavedRegionNotFoundException("Saved region not found"));
    }

    private JsonNode findLsoa(AnalysisEntity analysis, String lsoaCode) {
        if (analysis.getResult() == null) {
            throw new CustomException(HttpStatus.UNPROCESSABLE_ENTITY, "Analysis has no stored results");
        }
        JsonNode result = jsonMapper.readTree(analysis.getResult());
        JsonNode heatmap = result.get("heatmap_layer");
        if (heatmap != null && heatmap.isArray()) {
            for (JsonNode node : heatmap) {
                if (lsoaCode.equals(textOrNull(node.get("lsoa_code")))) {
                    return node;
                }
            }
        }
        throw new CustomException(HttpStatus.UNPROCESSABLE_ENTITY,
                "LSOA \"" + lsoaCode + "\" is not part of analysis " + analysis.getId());
    }

    private String textOrNull(JsonNode node) {
        return node == null || node.isNull() ? null : node.asText();
    }

    private ResSavedRegionDTO toDto(SavedRegionEntity e) {
        return new ResSavedRegionDTO(
                e.getId(),
                e.getAnalysis().getId(),
                e.getLsoaCode(),
                e.getLsoaName(),
                e.getFinalScore(),
                e.getCentroidLat(),
                e.getCentroidLng(),
                e.getCity(),
                e.getBusinessDescription(),
                e.getRequestedResultCount(),
                e.getNotes(),
                List.copyOf(e.getTags()),
                e.isPublicShared(),
                e.getCreatedAt(),
                e.getUpdatedAt());
    }

    @Transactional
    public ResSavedRegionDTO updateVisibility(Long userId, Long id, boolean publicShared) {
        SavedRegionEntity entity = findOwned(userId, id);
        if (publicShared && !entity.getAnalysis().isPublicShared()) {
            throw new CustomException(HttpStatus.CONFLICT,
                    "A location cannot be public while its parent analysis is private");
        }
        entity.setPublicShared(publicShared);
        return toDto(savedRegionRepository.saveAndFlush(entity));
    }
}
