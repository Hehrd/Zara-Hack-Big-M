package com.zara.hack.friends.persistence.repository;

import com.zara.hack.friends.persistence.entity.FriendshipEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FriendshipRepository extends JpaRepository<FriendshipEntity, Long> {

    boolean existsByUserIdAndFriendId(Long userId, Long friendId);

    List<FriendshipEntity> findAllByUserIdOrFriendId(Long userId, Long friendId);

    Optional<FriendshipEntity> findByUserIdAndFriendId(Long userId, Long friendId);
}
