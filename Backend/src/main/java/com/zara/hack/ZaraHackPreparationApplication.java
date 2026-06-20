package com.zara.hack;

import com.zara.hack.auth.config.AuthProperties;
import com.zara.hack.location.config.LocationProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({AuthProperties.class, LocationProperties.class})
public class ZaraHackPreparationApplication {

   public static void main(String[] args) {
        SpringApplication.run(ZaraHackPreparationApplication.class, args);
    }
}
