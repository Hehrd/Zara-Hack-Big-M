package com.zara.hack.common.exception;

import org.springframework.http.HttpStatus;

public class InvalidStripeAccountException extends CustomException {

    public InvalidStripeAccountException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }
}
