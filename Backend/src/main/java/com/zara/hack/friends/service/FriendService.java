package com.zara.hack.friends.service;

import com.zara.hack.analyze.controller.dto.AnalysisDetailDTO;
import com.zara.hack.analyze.controller.dto.AnalysisSummaryDTO;
import com.zara.hack.analyze.service.AnalysisService;
import com.zara.hack.auth.entity.AppUser;
import com.zara.hack.auth.repository.AppUserRepository;
import com.zara.hack.common.exception.AuthenticationUserNotFoundException;
import com.zara.hack.common.exception.ConflictException;
import com.zara.hack.common.exception.CustomException;
import com.zara.hack.friends.controller.dto.FriendDTO;
import com.zara.hack.friends.persistence.entity.FriendshipEntity;
import com.zara.hack.friends.persistence.repository.FriendshipRepository;
import com.zara.hack.saved.controller.dto.ResSavedRegionDTO;
import com.zara.hack.saved.service.SavedRegionService;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FriendService {

    private final FriendshipRepository friendshipRepository;
    private final AppUserRepository userRepository;
    private final AnalysisService analysisService;
    private final SavedRegionService savedRegionService;

    public FriendService(FriendshipRepository friendshipRepository,
                         AppUserRepository userRepository,
                         AnalysisService analysisService,
                         SavedRegionService savedRegionService) {
        this.friendshipRepository = friendshipRepository;
        this.userRepository = userRepository;
        this.analysisService = analysisService;
        this.savedRegionService = savedRegionService;
    }

    @Transactional
    public FriendDTO addFriendByToken(Long meId, String token) {
        AppUser me = userRepository.findById(meId)
                .orElseThrow(() -> new AuthenticationUserNotFoundException("Authenticated user not found"));
        AppUser owner = userRepository.findByFriendToken(token)
                .orElseThrow(() -> new CustomException(HttpStatus.NOT_FOUND, "Invalid add-friend link"));

        if (owner.getId().equals(meId)) {
            throw new ConflictException("You cannot add yourself as a friend");
        }
        if (areFriends(meId, owner.getId())) {
            return toDto(owner);
        }

        FriendshipEntity friendship = new FriendshipEntity();
        friendship.setUser(me);
        friendship.setFriend(owner);
        friendshipRepository.save(friendship);
        return toDto(owner);
    }

    @Transactional
    public List<FriendDTO> listFriends(Long meId) {
        return friendshipRepository.findAllByUserIdOrFriendId(meId, meId).stream()
                .map(f -> f.getUser().getId().equals(meId) ? f.getFriend() : f.getUser())
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public List<AnalysisSummaryDTO> getFriendAnalyses(Long meId, Long friendId) {
        requireFriendship(meId, friendId);
        return analysisService.getPublicAnalysisSummaries(friendId);
    }

    @Transactional
    public AnalysisDetailDTO getFriendAnalysisDetail(Long meId, Long friendId, Long analysisId) {
        requireFriendship(meId, friendId);
        return analysisService.getPublicAnalysisDetail(friendId, analysisId);
    }

    @Transactional
    public List<ResSavedRegionDTO> getFriendSavedRegions(Long meId, Long friendId) {
        requireFriendship(meId, friendId);
        return savedRegionService.getPublicRegions(friendId);
    }

    @Transactional
    public void removeFriend(Long meId, Long friendId) {
        friendshipRepository.findByUserIdAndFriendId(meId, friendId)
                .or(() -> friendshipRepository.findByUserIdAndFriendId(friendId, meId))
                .ifPresent(friendshipRepository::delete);
    }

    private void requireFriendship(Long meId, Long friendId) {
        if (!areFriends(meId, friendId)) {
            throw new CustomException(HttpStatus.FORBIDDEN, "You are not friends with this user");
        }
    }

    private boolean areFriends(Long a, Long b) {
        return friendshipRepository.existsByUserIdAndFriendId(a, b)
                || friendshipRepository.existsByUserIdAndFriendId(b, a);
    }

    private FriendDTO toDto(AppUser user) {
        return new FriendDTO(user.getId(), user.getEmail());
    }
}
