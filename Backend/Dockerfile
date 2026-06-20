FROM maven:3.9.11-eclipse-temurin-25 AS build
WORKDIR /workspace

COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -q -DskipTests package

FROM maven:3.9.11-eclipse-temurin-25
WORKDIR /app

COPY --from=build /workspace/target/zara-hack-preparation-1.0.0-SNAPSHOT.jar app.jar

EXPOSE 6969

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
