package com.zara.hack.auth.service;

import com.zara.hack.auth.dto.LoginResponse;
import com.zara.hack.auth.dto.LoginRequest;
import com.zara.hack.auth.dto.LogoutRequest;
import com.zara.hack.auth.dto.RefreshTokenRequest;
import com.zara.hack.auth.dto.SignupRequest;
import com.zara.hack.auth.dto.SignupResponse;
import com.zara.hack.auth.entity.AppUser;
import com.zara.hack.auth.entity.Role;
import com.zara.hack.auth.repository.AppUserRepository;
import com.zara.hack.common.exception.ConflictException;
import com.zara.hack.common.exception.UnauthorizedException;
import jakarta.transaction.Transactional;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class AuthService {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenService jwtTokenService;

    public AuthService(
            AppUserRepository appUserRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtTokenService jwtTokenService
    ) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtTokenService = jwtTokenService;
    }

    @Transactional
    public SignupResponse signup(SignupRequest request) {
        String normalizedEmail = normalizeEmail(request.email());
        if (appUserRepository.existsByEmail(normalizedEmail)) {
            throw new ConflictException("Email is already registered");
        }

        AppUser user = new AppUser();
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(Role.USER);

        AppUser savedUser = appUserRepository.save(user);
        return new SignupResponse(savedUser.getId(), savedUser.getEmail(), savedUser.getCreatedAt());
    }

    public LoginResponse login(LoginRequest request) {
        String normalizedEmail = normalizeEmail(request.email());
        try {
            authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(normalizedEmail, request.password())
            );
        } catch (BadCredentialsException ex) {
            throw new UnauthorizedException("Invalid email or password", ex);
        }

        AppUser user = appUserRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        return jwtTokenService.issueTokenPair(user);
    }

    public LoginResponse refresh(RefreshTokenRequest request) {
        return jwtTokenService.refreshAccessToken(request.refreshToken());
    }

    @Transactional
    public void logout(LogoutRequest request) {
        jwtTokenService.revokeRefreshToken(request.refreshToken());
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
