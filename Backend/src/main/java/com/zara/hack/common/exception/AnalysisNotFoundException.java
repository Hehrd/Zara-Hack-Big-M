package com.zara.hack.common.exception;

import org.springframework.http.HttpStatus;

public class AnalysisNotFoundException extends CustomException {

    public AnalysisNotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, message);
    }
}
