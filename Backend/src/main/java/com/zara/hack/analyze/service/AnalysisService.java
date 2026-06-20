package com.zara.hack.analyze.service;

import com.zara.hack.analyze.controller.dto.ResAnalysisDTO;
import com.zara.hack.analyze.persistence.entity.AnalysisEntity;
import com.zara.hack.analyze.persistence.repository.AnalysisRepository;
import com.zara.hack.auth.entity.AppUser;
import com.zara.hack.auth.repository.AppUserRepository;
import com.zara.hack.common.exception.AnalysisNotFoundException;
import com.zara.hack.common.exception.AuthenticationUserNotFoundException;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AnalysisService {

    private final AnalysisRepository analysisRepository;
    private final AppUserRepository userRepository;

    public AnalysisService(AnalysisRepository analysisRepository, AppUserRepository userRepository) {
        this.analysisRepository = analysisRepository;
        this.userRepository = userRepository;
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
    public List<ResAnalysisDTO> getAnalyses(Long userId) {
        return analysisRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toDto)
                .toList();
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

