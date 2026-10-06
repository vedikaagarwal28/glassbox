FROM python:3.12-alpine
RUN adduser -D runner
COPY compiler-core /compiler-core
COPY docker/runtimes/glassbox-lang/runner.py /runner.py
RUN chown -R runner /compiler-core
USER runner
ENTRYPOINT ["python","/runner.py"]
