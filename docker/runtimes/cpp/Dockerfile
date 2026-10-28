FROM gcc:14-bookworm

RUN useradd --create-home --shell /usr/sbin/nologin runner
COPY docker/runtimes/cpp/runner.sh /usr/local/bin/runner
RUN chmod 755 /usr/local/bin/runner
USER runner
WORKDIR /work
ENTRYPOINT ["runner"]
