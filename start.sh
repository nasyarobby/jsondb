#!/bin/sh
if [ -z "${LOG_TO_ES}" ]; then
node build/server.js
else
node build/server.js | log-to-es
fi