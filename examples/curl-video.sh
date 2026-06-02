#!/bin/bash

# Ensure local api server is running
# Usage: ./examples/curl-video.sh

curl -X POST http://127.0.0.1:8787/v1/videos/generations \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-web-video",
    "prompt": "Cinematic shot of ocean waves crushing against rocks, slow motion.",
    "duration": 5,
    "wait": true,
    "response_format": "path"
  }'
