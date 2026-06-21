package com.zara.hack.auth.repository;

import com.zara.hack.auth.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    boolean existsByEmail(String email);

    Optional<AppUser> findByEmail(String email);

    Optional<AppUser> findByFriendToken(String friendToken);

    List<AppUser> findAllByFriendTokenIsNull();
}
