# ── Stage 1: Build the JAR ──────────────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-17-alpine AS build
WORKDIR /app

# Cache Maven dependencies first (faster rebuilds)
COPY pom.xml .
RUN mvn dependency:go-offline -B -q

# Build the application (skip tests for faster build)
COPY src ./src
RUN mvn clean package -DskipTests -q

# ── Stage 2: Run the JAR ────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

COPY --from=build /app/target/vmas-backend-0.0.1-SNAPSHOT.jar app.jar

# Memory limits for Render free tier (512MB RAM)
ENV JAVA_TOOL_OPTIONS="-Xmx300m -Xms100m -XX:+UseContainerSupport -XX:MaxRAMPercentage=60"

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
