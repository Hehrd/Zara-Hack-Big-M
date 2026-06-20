package com.zara.hack.analyze;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AnalysisRepository extends JpaRepository<AnalysisEntity, Long> {

    List<AnalysisEntity> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<AnalysisEntity> findByIdAndUserId(Long id, Long userId);
}
