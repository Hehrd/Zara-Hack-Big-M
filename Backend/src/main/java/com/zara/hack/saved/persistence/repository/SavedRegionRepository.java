package com.zara.hack.saved.persistence.repository;

import com.zara.hack.saved.persistence.entity.SavedRegionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SavedRegionRepository extends JpaRepository<SavedRegionEntity, Long> {

    List<SavedRegionEntity> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<SavedRegionEntity> findByIdAndUserId(Long id, Long userId);

    List<SavedRegionEntity> findAllByAnalysisId(Long analysisId);
}
