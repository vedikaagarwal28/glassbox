FROM eclipse-temurin:21-jdk-alpine
RUN adduser -D runner
USER runner
WORKDIR /work
ENTRYPOINT ["sh","-c","cp main Main.java && javac -d /tmp Main.java && java -cp /tmp Main < stdin"]
