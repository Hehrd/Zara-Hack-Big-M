package com.zara.hack.common.exception;

import org.springframework.http.HttpStatus;

public class StripeConfigurationException extends CustomException {

    public StripeConfigurationException(String message) {
        super(HttpStatus.INTERNAL_SERVER_ERROR, message);
    }
}
