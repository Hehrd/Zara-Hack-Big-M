package com.zara.hack.saved.persistence.entity;

import com.zara.hack.analyze.persistence.entity.AnalysisEntity;
import com.zara.hack.auth.entity.AppUser;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "saved_regions")
@Setter
@Getter
public class SavedRegionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "analysis_id", nullable = false)
    private AnalysisEntity analysis;

    @Column(nullable = false)
    private String lsoaCode;

    private String lsoaName;

    @Column(nullable = false)
    private double finalScore;

    private Double centroidLat;

    private Double centroidLng;

    @Column(columnDefinition = "text")
    private String city;

    @Column(columnDefinition = "text")
    private String businessDescription;

    private Integer requestedResultCount;

    @Column(columnDefinition = "text")
    private String notes;

    @ElementCollection
    @CollectionTable(name = "saved_region_tags", joinColumns = @JoinColumn(name = "saved_region_id"))
    @Column(name = "tag")
    private List<String> tags = new ArrayList<>();

    @Column(nullable = false)
    private boolean publicShared = false;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
