FROM gcc:14
RUN useradd -m runner
USER runner
WORKDIR /work
ENTRYPOINT ["sh","-c","gcc -x c main -o /tmp/a && /tmp/a < stdin"]
