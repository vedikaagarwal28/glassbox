#!/bin/sh
set -eu

timeout 8s g++ -x c++ -std=c++17 -O2 -pipe main -o /tmp/glassbox-program
exec timeout 8s /tmp/glassbox-program < stdin
