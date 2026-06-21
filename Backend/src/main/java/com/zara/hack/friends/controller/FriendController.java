package com.zara.hack.friends.controller;

import com.zara.hack.analyze.controller.dto.AnalysisDetailDTO;
import com.zara.hack.analyze.controller.dto.AnalysisSummaryDTO;
import com.zara.hack.friends.controller.dto.FriendDTO;
import com.zara.hack.friends.service.FriendService;
import com.zara.hack.saved.controller.dto.ResSavedRegionDTO;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/friends")
public class FriendController {

    private final FriendService friendService;

    public FriendController(FriendService friendService) {
        this.friendService = friendService;
    }

    @PostMapping("/add/{token}")
    public FriendDTO addFriend(@AuthenticationPrincipal Jwt jwt, @PathVariable String token) {
        return friendService.addFriendByToken(userId(jwt), token);
    }

    @GetMapping
    public List<FriendDTO> listFriends(@AuthenticationPrincipal Jwt jwt) {
        return friendService.listFriends(userId(jwt));
    }

    @GetMapping("/{friendId}/analyses")
    public List<AnalysisSummaryDTO> friendAnalyses(@AuthenticationPrincipal Jwt jwt,
                                                   @PathVariable Long friendId) {
        return friendService.getFriendAnalyses(userId(jwt), friendId);
    }

    @GetMapping("/{friendId}/analyses/{analysisId}")
    public AnalysisDetailDTO friendAnalysisDetail(@AuthenticationPrincipal Jwt jwt,
                                                  @PathVariable Long friendId,
                                                  @PathVariable Long analysisId) {
        return friendService.getFriendAnalysisDetail(userId(jwt), friendId, analysisId);
    }

    @GetMapping("/{friendId}/locations")
    public List<ResSavedRegionDTO> friendLocations(@AuthenticationPrincipal Jwt jwt,
                                                   @PathVariable Long friendId) {
        return friendService.getFriendSavedRegions(userId(jwt), friendId);
    }

    @DeleteMapping("/{friendId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeFriend(@AuthenticationPrincipal Jwt jwt, @PathVariable Long friendId) {
        friendService.removeFriend(userId(jwt), friendId);
    }

    private Long userId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
