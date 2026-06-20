package com.zara.hack.common.exception;

import org.springframework.http.HttpStatus;

public class KafkaOperationException extends CustomException {

    public KafkaOperationException(String message, Throwable cause) {
        super(HttpStatus.INTERNAL_SERVER_ERROR, message, cause);
    }
}
