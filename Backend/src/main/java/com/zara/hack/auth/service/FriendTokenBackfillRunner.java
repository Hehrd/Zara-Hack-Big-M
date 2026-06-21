package com.zara.hack.auth.service;

import com.zara.hack.auth.entity.AppUser;
import com.zara.hack.auth.repository.AppUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
public class FriendTokenBackfillRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(FriendTokenBackfillRunner.class);
    private static final String TEST_USER_EMAIL = "locus2@gmail.com";

    private final AppUserRepository appUserRepository;

    public FriendTokenBackfillRunner(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<AppUser> missing = appUserRepository.findAllByFriendTokenIsNull();
        for (AppUser user : missing) {
            user.setFriendToken(UUID.randomUUID().toString());
        }
        if (!missing.isEmpty()) {
            appUserRepository.saveAll(missing);
            log.info("Backfilled friend tokens for {} existing user(s)", missing.size());
        }

        appUserRepository.findByEmail(TEST_USER_EMAIL).ifPresent(user ->
                log.info("Test user {} add-friend token: {}", TEST_USER_EMAIL, user.getFriendToken()));
    }
}
