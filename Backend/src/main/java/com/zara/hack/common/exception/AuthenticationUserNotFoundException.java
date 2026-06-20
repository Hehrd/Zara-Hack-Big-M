package com.zara.hack.common.exception;

import org.springframework.security.core.userdetails.UsernameNotFoundException;

public class AuthenticationUserNotFoundException extends UsernameNotFoundException {

    public AuthenticationUserNotFoundException(String message) {
        super(message);
    }
}
