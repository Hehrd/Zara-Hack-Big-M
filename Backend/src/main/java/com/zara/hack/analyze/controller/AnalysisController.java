package com.zara.hack.analyze.controller;

import com.zara.hack.analyze.service.AnalysisService;
import com.zara.hack.analyze.controller.dto.ReqAnalysisDTO;
import com.zara.hack.analyze.controller.dto.ResAnalysisDTO;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/analyze")
public class AnalysisController {

    private final AnalysisService analysisService;

    public AnalysisController(AnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResAnalysisDTO saveAnalysis(@AuthenticationPrincipal Jwt jwt,
                                       @Valid @RequestBody ReqAnalysisDTO request) {
        return analysisService.saveAnalysis(userId(jwt), request.getAnalysis());
    }

    @GetMapping
    public List<ResAnalysisDTO> getAnalyses(@AuthenticationPrincipal Jwt jwt) {
        return analysisService.getAnalyses(userId(jwt));
    }

    @PutMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public ResAnalysisDTO updateAnalysis(@AuthenticationPrincipal Jwt jwt,
                                         @PathVariable Long id,
                                         @Valid @RequestBody ReqAnalysisDTO request) {
        return analysisService.updateAnalysis(userId(jwt), id, request.getAnalysis());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAnalysis(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        analysisService.deleteAnalysis(userId(jwt), id);
    }

    private Long userId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
