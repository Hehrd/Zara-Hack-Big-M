package com.zara.hack.common.exception;

import org.springframework.http.HttpStatus;

public class SavedRegionNotFoundException extends CustomException {

    public SavedRegionNotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, message);
    }
}
