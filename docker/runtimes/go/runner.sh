#!/bin/sh
set -eu

cp main /tmp/main.go
timeout 8s go build -o /tmp/glassbox-program /tmp/main.go
exec timeout 8s /tmp/glassbox-program < stdin
