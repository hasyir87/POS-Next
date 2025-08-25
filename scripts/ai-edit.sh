#!/usr/bin/env bash
set -e

FILE="$1"
PROMPT="$2"

if [ -z "$FILE" ] || [ -z "$PROMPT" ]; then
  echo "Usage: ai-edit <file> <prompt>"
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "❌ File '$FILE' not found."
  exit 1
fi

# wait for server (short)
for i in {1..8}; do
  if netstat -tuln 2>/dev/null | grep -q ":3001"; then
    break
  fi
  sleep 1
done

if ! netstat -tuln 2>/dev/null | grep -q ":3001"; then
  echo "❌ AI server not running on port 3001. Aborting."
  exit 1
fi

# Read file content and escape for JSON safely (base64 to avoid quoting issues)
CONTENT_B64=$(base64 -w0 "$FILE")
REQUEST_JSON=$(jq -n --arg model "${MODEL_NAME}" --arg prompt "$PROMPT" --arg content_b64 "$CONTENT_B64" \
  '{model:$model, prompt:$prompt, input_base64:$content_b64}')

# Send to local AI server; server expected to accept this API. Adjust endpoint if needed.
RESPONSE=$(curl -s -X POST "http://localhost:3001/edit" \
  -H "Content-Type: application/json" \
  -d "$REQUEST_JSON" )

# Try to extract 'output' field; if server returns base64, decode; otherwise raw
OUTPUT=$(echo "$RESPONSE" | jq -r '.output // empty')
OUTPUT_B64=$(echo "$RESPONSE" | jq -r '.output_base64 // empty')

if [ -n "$OUTPUT_B64" ] && [ "$OUTPUT_B64" != "null" ]; then
  echo "$OUTPUT_B64" | base64 -d > "$FILE"
  echo "✅ Updated $FILE (decoded from base64)"
elif [ -n "$OUTPUT" ] && [ "$OUTPUT" != "null" ]; then
  echo "$OUTPUT" > "$FILE"
  echo "✅ Updated $FILE"
else
  echo "⚠ Unexpected response from AI server. Raw response:"
  echo "$RESPONSE"
  exit 1
fi
