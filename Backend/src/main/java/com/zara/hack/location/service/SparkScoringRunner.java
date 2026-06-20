package com.zara.hack.location.service;

import tools.jackson.databind.json.JsonMapper;
import com.zara.hack.common.exception.SparkProcessingException;
import com.zara.hack.location.config.LocationProperties;
import com.zara.hack.location.dto.SparkOutput;
import com.zara.hack.location.dto.SparkScoringInput;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

/**
 * Treats Spark as an external job: writes the scoring input JSON, invokes
 * spark-submit on the combine job through a process, then reads the scored
 * output JSON. No Spark transformations run inside Spring-managed code.
 */
@Component
public class SparkScoringRunner {

    private static final Logger log = LoggerFactory.getLogger(SparkScoringRunner.class);
    private static final long TIMEOUT_MINUTES = 5;

    private final LocationProperties properties;
    private final JsonMapper objectMapper = new JsonMapper();

    public SparkScoringRunner(LocationProperties properties) {
        this.properties = properties;
    }

    public SparkOutput run(SparkScoringInput input) {
        try {
            Path runDir = Path.of(properties.runDir());
            Files.createDirectories(runDir);
            Path inputPath = runDir.resolve(input.runId() + "_input.json");
            Path outputPath = runDir.resolve(input.runId() + "_output.json");

            objectMapper.writeValue(inputPath.toFile(), input);

            ProcessBuilder pb = new ProcessBuilder(
                    properties.sparkSubmitPath(),
                    "--master", "local[2]",
                    properties.sparkJobPath(),
                    inputPath.toString(),
                    outputPath.toString(),
                    properties.precomputedLayersPath()
            );
            pb.environment().put("JAVA_HOME", properties.javaHome());
            pb.environment().put("SPARK_HOME", properties.sparkHome());
            pb.environment().put("PYSPARK_PYTHON", properties.pythonPath());
            pb.environment().put("PYSPARK_DRIVER_PYTHON", properties.pythonPath());
            pb.redirectErrorStream(true);
            File logFile = runDir.resolve(input.runId() + "_spark.log").toFile();
            pb.redirectOutput(logFile);

            log.info("Starting spark-submit for run {}", input.runId());
            Process process = pb.start();
            boolean finished = process.waitFor(TIMEOUT_MINUTES, TimeUnit.MINUTES);
            if (!finished) {
                process.destroyForcibly();
                throw new SparkProcessingException("Spark job timed out for run " + input.runId(), null);
            }
            if (process.exitValue() != 0) {
                throw new SparkProcessingException(
                        "Spark job failed (exit " + process.exitValue() + "); see " + logFile, null);
            }
            log.info("Spark job complete for run {}", input.runId());
            return objectMapper.readValue(outputPath.toFile(), SparkOutput.class);
        } catch (SparkProcessingException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new SparkProcessingException("Failed to run Spark scoring job: " + ex.getMessage(), ex);
        }
    }
}
