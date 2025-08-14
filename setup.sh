#!/usr/bin/env bash
set -e

# ===== Interactive inputs =====
echo "🤖 Pilih AI model default:"
echo "1) DeepSeek (fast coder)"
echo "2) GPT (detailed)"
echo "3) Claude (context-aware)"
read -p "Masukkan pilihan (1/2/3) [1]: " MODEL_CHOICE
MODEL_CHOICE=${MODEL_CHOICE:-1}

case $MODEL_CHOICE in
  1) MODEL_NAME="deepseek-coder"; CLI_CMD="deepseek-cli" ;;
  2) MODEL_NAME="gpt-4o"; CLI_CMD="openai" ;;
  3) MODEL_NAME="claude-3-5-sonnet"; CLI_CMD="claude-cli" ;;
  *) echo "Pilihan tidak valid. Menggunakan DeepSeek."; MODEL_NAME="deepseek-coder"; CLI_CMD="deepseek-cli" ;;
esac

echo
read -p "Masukkan daftar file yang ingin auto-diedit saat startup (pisah koma), contoh: src/app.js,src/lib/util.js  : " AUTO_FILES_RAW
read -p "Masukkan prompt untuk auto-edit (contoh: \"Tambahkan komentar di setiap fungsi dan perbaiki variable naming\"): " AUTO_PROMPT
AUTO_FILES_RAW=${AUTO_FILES_RAW:-}
AUTO_PROMPT=${AUTO_PROMPT:-"Tambahkan komentar di setiap fungsi"}

# Normalize file list to array (trim spaces)
IFS=',' read -r -a AUTO_FILES_ARR <<< "$AUTO_FILES_RAW"

# Ensure directories
mkdir -p .devcontainer scripts

# Write devcontainer.json (calls post-start)
cat > .devcontainer/devcontainer.json <<EOF
{
  "name": "AI Workspace - ${MODEL_NAME}",
  "postCreateCommand": "bash .devcontainer/post-start.sh",
  "customizations": {
    "vscode": {
      "settings": {
        "terminal.integrated.shell.linux": "/bin/bash"
      }
    }
  }
}
EOF

# Write post-start script: installs CLI, ensures server runs with self-heal, runs auto edits
cat > .devcontainer/post-start.sh <<EOF
#!/usr/bin/env bash
set -e

MODEL_NAME="${MODEL_NAME}"
CLI_CMD="${CLI_CMD}"

echo "🚀 post-start: installing deps & CLI for \${MODEL_NAME}..."
apt-get update -y
apt-get install -y curl jq npm net-tools >/dev/null

# install CLI (best-effort, may already exist)
if ! command -v \$CLI_CMD >/dev/null 2>&1; then
  echo "📦 Installing CLI: \$CLI_CMD (may require network)"
  npm install -g \$CLI_CMD || echo "⚠ npm install -g \$CLI_CMD failed (continuing)"
fi

if [ -z "\${AI_API_KEY}" ]; then
  echo "❌ AI_API_KEY not set in environment. Please set secret AI_API_KEY in IDX/Codespaces settings."
  exit 1
fi

# Kill any previous server bound to port 3001 (safe cleanup)
pkill -f "serve --port 3001" || true

# self-healing server runner (background)
(
  while true; do
    if ! netstat -tuln 2>/dev/null | grep -q ":3001"; then
      echo "\$(date +%T) 🌐 Starting AI server (\$MODEL_NAME)..."
      nohup \$CLI_CMD serve --port 3001 --api-key "\${AI_API_KEY}" > /workspace/ai.log 2>&1 || echo "⚠ failed to start server"
      sleep 2
    fi
    sleep 5
  done
) &

# make ai-edit alias available to codespace user
BASHRC="/home/codespace/.bashrc"
if ! grep -q "alias ai-edit=" "\$BASHRC" 2>/dev/null; then
  echo "alias ai-edit='/workspace/scripts/ai-edit.sh'" >> "\$BASHRC"
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
AUTO_FILES_RAW="${AUTO_FILES_RAW}"
AUTO_PROMPT_ESCAPED=\$(printf '%s' "${AUTO_PROMPT}" | sed 's/"/\\"/g')
if [ -n "\$AUTO_FILES_RAW" ]; then
  IFS=',' read -r -a FILES <<< "\$AUTO_FILES_RAW"
  for f in "\${FILES[@]}"; do
    f_trim=\$(echo "\$f" | sed 's/^ *//;s/ *$//')
    if [ -f "\$f_trim" ]; then
      echo "✏️ Running auto-edit on \$f_trim..."
      /workspace/scripts/ai-edit.sh "\$f_trim" "\$AUTO_PROMPT_ESCAPED" || echo "⚠ ai-edit failed for \$f_trim"
    else
      echo "⚠ file not found: \$f_trim (skipping)"
    fi
  done
else
  echo "ℹ No auto-edit files configured."
fi

echo "✅ post-start completed."
EOF
chmod +x .devcontainer/post-start.sh

# Write scripts/ai-edit.sh — robust: checks server, retries once, escapes properly
cat > scripts/ai-edit.sh <<'EOF'
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
EOF
chmod +x scripts/ai-edit.sh

# Write scripts/ai-switch.sh — change CLI/model and restart server
cat > scripts/ai-switch.sh <<'EOF'
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
EOF
chmod +x scripts/ai-switch.sh

# Final notes and git init (optional)
echo
echo "✅ setup files created."
echo "📌 NEXT STEPS:"
echo "1) Set secret AI_API_KEY in your IDX / Codespaces environment settings."
echo "2) Commit these files to repo if you like, then restart/rebuild your Codespace to trigger post-start."
echo "   Example commit:"
echo "     git init && git add . && git commit -m 'add ai-inject setup' && git push origin main"
echo "3) After workspace starts, the AI server will auto-run and auto-edit the files you specified (if present)."
echo
echo "Extras:"
echo " - Run manual edit: ai-edit path/to/file.js \"Your prompt\""
echo " - Switch model: ./scripts/ai-switch.sh gpt"
