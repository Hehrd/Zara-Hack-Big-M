package com.zara.hack.account.controller;

import com.zara.hack.account.controller.dto.AccountDTO;
import com.zara.hack.account.controller.dto.ReqUpdateCredentialsDTO;
import com.zara.hack.account.service.AccountService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/account")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @GetMapping
    public AccountDTO getAccount(@AuthenticationPrincipal Jwt jwt) {
        return accountService.getAccount(userId(jwt));
    }

    @PutMapping("/credentials")
    public AccountDTO updateCredentials(@AuthenticationPrincipal Jwt jwt,
                                        @RequestBody ReqUpdateCredentialsDTO request) {
        return accountService.updateCredentials(userId(jwt), request);
    }

    private Long userId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
