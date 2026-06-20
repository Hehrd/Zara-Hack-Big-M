package com.zara.hack.saved.controller;

import com.zara.hack.saved.controller.dto.ReqSaveRegionDTO;
import com.zara.hack.saved.controller.dto.ReqUpdateSavedRegionDTO;
import com.zara.hack.saved.controller.dto.ResSavedRegionDTO;
import com.zara.hack.saved.service.SavedRegionService;
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
@RequestMapping("/api/saved-regions")
public class SavedRegionController {

    private final SavedRegionService savedRegionService;

    public SavedRegionController(SavedRegionService savedRegionService) {
        this.savedRegionService = savedRegionService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResSavedRegionDTO save(@AuthenticationPrincipal Jwt jwt,
                                  @Valid @RequestBody ReqSaveRegionDTO request) {
        return savedRegionService.save(userId(jwt), request);
    }

    @GetMapping
    public List<ResSavedRegionDTO> list(@AuthenticationPrincipal Jwt jwt) {
        return savedRegionService.list(userId(jwt));
    }

    @PutMapping("/{id}")
    public ResSavedRegionDTO update(@AuthenticationPrincipal Jwt jwt,
                                    @PathVariable Long id,
                                    @RequestBody ReqUpdateSavedRegionDTO request) {
        return savedRegionService.update(userId(jwt), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        savedRegionService.delete(userId(jwt), id);
    }

    private Long userId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
