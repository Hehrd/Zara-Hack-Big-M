package com.zara.hack.common.exception;

import org.springframework.http.HttpStatus;

public class MqttOperationException extends CustomException {

    public MqttOperationException(String message, Throwable cause) {
        super(HttpStatus.INTERNAL_SERVER_ERROR, message, cause);
    }
}
