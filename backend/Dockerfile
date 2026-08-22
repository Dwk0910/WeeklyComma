FROM eclipse-temurin:17-jdk-jammy AS springbuilder

WORKDIR /app
COPY backend/gradlew .
COPY backend/gradle gradle
COPY backend/settings.gradle backend/build.gradle ./

RUN chmod +x ./gradlew

RUN ./gradlew build -x test --no-daemon || true

COPY backend/src src

RUN ./gradlew bootJar --no-daemon --stacktrace

FROM eclipse-temurin:17-jre-jammy

WORKDIR /app
COPY --from=springbuilder /app/build/libs/* app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]