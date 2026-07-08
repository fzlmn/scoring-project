package com.orus.scoringbackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ScoringBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(ScoringBackendApplication.class, args);
    }

}
