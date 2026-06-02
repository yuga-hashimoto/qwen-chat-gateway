#!/bin/bash

# Ensure local api server is running
# Usage: ./examples/curl-chat.sh

curl -X POST http://127.0.0.1:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-web",
    "messages": [
      {
        "role": "user",
        "content": "Why is JavaScript synchronous by default?"
      }
    ],
    "extra_body": {
      "mode": "thinking",
      "web_search": false
    }
  }'
