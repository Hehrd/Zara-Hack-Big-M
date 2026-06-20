package com.zara.hack.auth.service;

import com.zara.hack.auth.config.AuthProperties;
import com.zara.hack.auth.dto.LoginResponse;
import com.zara.hack.auth.entity.AppUser;
import com.zara.hack.auth.entity.RefreshToken;
import com.zara.hack.auth.repository.AppUserRepository;
import com.zara.hack.auth.repository.RefreshTokenRepository;
import com.zara.hack.common.exception.UnauthorizedException;
import jakarta.transaction.Transactional;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class JwtTokenService {

    private static final String TOKEN_TYPE_CLAIM = "token_type";
    private static final String ACCESS_TOKEN_TYPE = "access";
    private static final String REFRESH_TOKEN_TYPE = "refresh";

    private final JwtEncoder jwtEncoder;
    private final JwtDecoder jwtDecoder;
    private final AuthProperties authProperties;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AppUserRepository appUserRepository;

    public JwtTokenService(
            JwtEncoder jwtEncoder,
            JwtDecoder jwtDecoder,
            AuthProperties authProperties,
            RefreshTokenRepository refreshTokenRepository,
            AppUserRepository appUserRepository
    ) {
        this.jwtEncoder = jwtEncoder;
        this.jwtDecoder = jwtDecoder;
        this.authProperties = authProperties;
        this.refreshTokenRepository = refreshTokenRepository;
        this.appUserRepository = appUserRepository;
    }

    @Transactional
    public LoginResponse issueTokenPair(AppUser user) {
        Instant now = Instant.now();
        Instant accessExpiresAt = now.plus(authProperties.accessTokenTtl());
        Instant refreshExpiresAt = now.plus(authProperties.refreshTokenTtl());
        String refreshTokenId = UUID.randomUUID().toString();

        String accessToken = encodeToken(user, ACCESS_TOKEN_TYPE, now, accessExpiresAt, UUID.randomUUID().toString());
        String refreshTokenValue = encodeToken(user, REFRESH_TOKEN_TYPE, now, refreshExpiresAt, refreshTokenId);

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setTokenId(refreshTokenId);
        refreshToken.setUser(user);
        refreshToken.setExpiresAt(refreshExpiresAt);
        refreshTokenRepository.save(refreshToken);

        return new LoginResponse("Bearer", accessToken, accessExpiresAt, refreshTokenValue, refreshExpiresAt);
    }

    @Transactional
    public LoginResponse refreshAccessToken(String rawRefreshToken) {
        Jwt jwt = decode(rawRefreshToken);
        validateTokenType(jwt, REFRESH_TOKEN_TYPE);

        String tokenId = jwt.getId();
        RefreshToken storedToken = refreshTokenRepository.findByTokenId(tokenId)
                .orElseThrow(() -> unauthorized("Refresh token is not recognized"));

        if (storedToken.isRevoked() || storedToken.getExpiresAt().isBefore(Instant.now())) {
            throw unauthorized("Refresh token is no longer active");
        }

        AppUser user = appUserRepository.findById(Long.valueOf(jwt.getSubject()))
                .orElseThrow(() -> unauthorized("User not found for refresh token"));

        storedToken.revoke(Instant.now());
        return issueTokenPair(user);
    }

    @Transactional
    public void revokeRefreshToken(String rawRefreshToken) {
        Jwt jwt = decode(rawRefreshToken);
        validateTokenType(jwt, REFRESH_TOKEN_TYPE);

        refreshTokenRepository.findByTokenId(jwt.getId()).ifPresent(token -> {
            if (!token.isRevoked()) {
                token.revoke(Instant.now());
            }
        });
    }

    private String encodeToken(AppUser user, String tokenType, Instant issuedAt, Instant expiresAt, String tokenId) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(authProperties.issuer())
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .subject(String.valueOf(user.getId()))
                .id(tokenId)
                .claim("email", user.getEmail())
                .claim("roles", List.of(user.getRole().name()))
                .claim(TOKEN_TYPE_CLAIM, tokenType)
                .build();

        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    private Jwt decode(String token) {
        try {
            return jwtDecoder.decode(token);
        } catch (JwtException ex) {
            throw unauthorized("Invalid token");
        }
    }

    private void validateTokenType(Jwt jwt, String expectedType) {
        String actualType = jwt.getClaimAsString(TOKEN_TYPE_CLAIM);
        if (!expectedType.equals(actualType)) {
            throw unauthorized("Unexpected token type");
        }
    }

    private UnauthorizedException unauthorized(String message) {
        return new UnauthorizedException(message);
    }
}
