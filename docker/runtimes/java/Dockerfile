FROM eclipse-temurin:21-jdk-alpine
RUN adduser -D runner
USER runner
WORKDIR /work
ENTRYPOINT ["sh","-c","cp main /tmp/Main.java && javac -d /tmp /tmp/Main.java && java -cp /tmp Main < stdin"]
