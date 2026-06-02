#!/bin/bash

# Ensure local api server is running
# Usage: ./examples/curl-image.sh

curl -X POST http://127.0.0.1:8787/v1/images/generations \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-web-image",
    "prompt": "An oil painting of a vintage typewriter on a wooden desk, sunlight leaking through window.",
    "response_format": "path"
  }'
