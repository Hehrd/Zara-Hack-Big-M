package com.zara.hack.common.exception;

import org.springframework.http.HttpStatus;

public class SparkProcessingException extends CustomException {

    public SparkProcessingException(String message, Throwable cause) {
        super(HttpStatus.INTERNAL_SERVER_ERROR, message, cause);
    }
}
