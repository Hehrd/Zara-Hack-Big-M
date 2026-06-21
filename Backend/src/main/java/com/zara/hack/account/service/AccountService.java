package com.zara.hack.account.service;

import com.zara.hack.account.controller.dto.AccountDTO;
import com.zara.hack.account.controller.dto.ReqUpdateCredentialsDTO;
import com.zara.hack.auth.entity.AppUser;
import com.zara.hack.auth.repository.AppUserRepository;
import com.zara.hack.common.exception.AuthenticationUserNotFoundException;
import com.zara.hack.common.exception.ConflictException;
import com.zara.hack.common.exception.CustomException;
import com.zara.hack.common.exception.UnauthorizedException;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class AccountService {

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AccountService(AppUserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public AccountDTO getAccount(Long userId) {
        return toDto(findUser(userId));
    }

    @Transactional
    public AccountDTO updateCredentials(Long userId, ReqUpdateCredentialsDTO req) {
        AppUser user = findUser(userId);

        boolean wantsEmailChange = req.email() != null && !req.email().isBlank();
        boolean wantsPasswordChange = req.newPassword() != null && !req.newPassword().isBlank();

        if (!wantsEmailChange && !wantsPasswordChange) {
            throw new CustomException(HttpStatus.BAD_REQUEST, "Nothing to update");
        }

        if (req.currentPassword() == null
                || !passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Current password is incorrect");
        }

        if (wantsEmailChange) {
            String normalizedEmail = req.email().trim().toLowerCase(Locale.ROOT);
            if (!normalizedEmail.equals(user.getEmail()) && userRepository.existsByEmail(normalizedEmail)) {
                throw new ConflictException("Email is already registered");
            }
            user.setEmail(normalizedEmail);
        }

        if (wantsPasswordChange) {
            user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        }

        return toDto(userRepository.save(user));
    }

    private AppUser findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new AuthenticationUserNotFoundException("Authenticated user not found"));
    }

    private AccountDTO toDto(AppUser user) {
        return new AccountDTO(user.getId(), user.getEmail(), user.getFriendToken());
    }
}
