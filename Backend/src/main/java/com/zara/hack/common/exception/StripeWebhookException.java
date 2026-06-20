package com.zara.hack.common.exception;

import org.springframework.http.HttpStatus;

public class StripeWebhookException extends CustomException {

    public StripeWebhookException(String message, Throwable cause) {
        super(HttpStatus.BAD_REQUEST, message, cause);
    }
}
