FROM gcc:14
RUN useradd -m runner
USER runner
WORKDIR /work
ENTRYPOINT ["sh","-c","gcc main -o /tmp/a && /tmp/a < stdin"]
