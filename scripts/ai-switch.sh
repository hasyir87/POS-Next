#!/usr/bin/env bash
set -e
NEW="$1"
if [ -z "$NEW" ]; then
  echo "Usage: ./scripts/ai-switch.sh [deepseek|gpt|claude]"
  exit 1
fi

case "$NEW" in
  deepseek) NEW_MODEL="deepseek-coder"; NEW_CLI="deepseek-cli" ;;
  gpt) NEW_MODEL="gpt-4o"; NEW_CLI="openai" ;;
  claude) NEW_MODEL="claude-3-5-sonnet"; NEW_CLI="claude-cli" ;;
  *) echo "Unknown model: $NEW"; exit 1 ;;
esac

echo "🔄 Switching to $NEW_MODEL (installing $NEW_CLI if needed)..."
if ! command -v $NEW_CLI >/dev/null 2>&1; then
  npm install -g $NEW_CLI || echo "⚠ install $NEW_CLI failed; ensure CLI available"
fi

# replace any running server on port 3001
pkill -f "serve --port 3001" || true

# start new server
nohup $NEW_CLI serve --port 3001 --api-key "${AI_API_KEY}" > /workspace/ai.log 2>&1 &

echo "✅ Switched to $NEW_MODEL (server starting)."
