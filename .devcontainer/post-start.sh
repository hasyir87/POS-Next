#!/usr/bin/env bash
set -e

MODEL_NAME="deepseek-coder"
CLI_CMD="deepseek-cli"

echo "🚀 post-start: installing deps & CLI for ${MODEL_NAME}..."
apt-get update -y
apt-get install -y curl jq npm net-tools >/dev/null

# install CLI (best-effort, may already exist)
if ! command -v $CLI_CMD >/dev/null 2>&1; then
  echo "📦 Installing CLI: $CLI_CMD (may require network)"
  npm install -g $CLI_CMD || echo "⚠ npm install -g $CLI_CMD failed (continuing)"
fi

if [ -z "${AI_API_KEY}" ]; then
  echo "❌ AI_API_KEY not set in environment. Please set secret AI_API_KEY in IDX/Codespaces settings."
  exit 1
fi

# Kill any previous server bound to port 3001 (safe cleanup)
pkill -f "serve --port 3001" || true

# self-healing server runner (background)
(
  while true; do
    if ! netstat -tuln 2>/dev/null | grep -q ":3001"; then
      echo "$(date +%T) 🌐 Starting AI server ($MODEL_NAME)..."
      nohup $CLI_CMD serve --port 3001 --api-key "${AI_API_KEY}" > /workspace/ai.log 2>&1 || echo "⚠ failed to start server"
      sleep 2
    fi
    sleep 5
  done
) &

# make ai-edit alias available to codespace user
BASHRC="/home/codespace/.bashrc"
if ! grep -q "alias ai-edit=" "$BASHRC" 2>/dev/null; then
  echo "alias ai-edit='/workspace/scripts/ai-edit.sh'" >> "$BASHRC"
fi

# Wait a moment for server to be up (best-effort)
echo "⏳ Waiting for AI server to listen on port 3001..."
for i in {1..12}; do
  if netstat -tuln 2>/dev/null | grep -q ":3001"; then
    echo "✅ AI server appears running."
    break
  fi
  sleep 1
done

# === Auto-edit multiple files (if provided) ===
AUTO_FILES_RAW="src/app.js"
AUTO_PROMPT_ESCAPED=$(printf '%s' "berikan komentar di setiap fungsi dan perbaiki variable naming" | sed 's/"/\"/g')
if [ -n "$AUTO_FILES_RAW" ]; then
  IFS=',' read -r -a FILES <<< "$AUTO_FILES_RAW"
  for f in "${FILES[@]}"; do
    f_trim=$(echo "$f" | sed 's/^ *//;s/ *$//')
    if [ -f "$f_trim" ]; then
      echo "✏️ Running auto-edit on $f_trim..."
      /workspace/scripts/ai-edit.sh "$f_trim" "$AUTO_PROMPT_ESCAPED" || echo "⚠ ai-edit failed for $f_trim"
    else
      echo "⚠ file not found: $f_trim (skipping)"
    fi
  done
else
  echo "ℹ No auto-edit files configured."
fi

echo "✅ post-start completed."
