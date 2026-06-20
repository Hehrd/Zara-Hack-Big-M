package com.zara.hack.common.exception;

import org.springframework.http.HttpStatus;

public class InvalidPaymentRequestException extends CustomException {

    public InvalidPaymentRequestException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }
}
