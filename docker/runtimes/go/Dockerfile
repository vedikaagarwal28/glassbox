FROM golang:1.23-alpine

# The runner must build with exactly these settings: Go cache keys include the
# environment and flags, so any mismatch recompiles the standard library on
# every run and blows the 8s sandbox timeout.
ENV GOCACHE=/usr/local/go-cache \
    GO111MODULE=off \
    GOTOOLCHAIN=local \
    GOFLAGS="-trimpath -buildvcs=false" \
    CGO_ENABLED=0

RUN adduser -D runner
RUN mkdir -p /tmp/go-warmup \
    && printf 'package main\nimport "fmt"\nfunc main(){fmt.Println("warmup")}\n' > /tmp/go-warmup/main.go \
    && go build -o /tmp/go-warmup/program /tmp/go-warmup/main.go \
    && chmod -R a+rX /usr/local/go-cache \
    && rm -rf /tmp/go-warmup
COPY docker/runtimes/go/runner.sh /usr/local/bin/runner
RUN chmod 755 /usr/local/bin/runner
USER runner
WORKDIR /work
ENTRYPOINT ["runner"]
