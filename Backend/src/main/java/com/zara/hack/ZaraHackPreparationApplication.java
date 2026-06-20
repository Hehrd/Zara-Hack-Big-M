package com.zara.hack;

import com.zara.hack.auth.config.AuthProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
@EnableConfigurationProperties(AuthProperties.class)
public class ZaraHackPreparationApplication {

   public static void main(String[] args) {
        SpringApplication.run(ZaraHackPreparationApplication.class, args);
    }
}
