#!/usr/bin/env bash
set -e

CONFIG_FILE="$HOME/.tabnine/tabnine_config.json"
mkdir -p "$(dirname "$CONFIG_FILE")"

# Fungsi buat bikin config default
create_default_config() {
  cat << EOF > "$CONFIG_FILE"
{
  "version": "4.0.0",
  "api_keys": {
    "openai": "${OPENAI_API_KEY:-YOUR_OPENAI_KEY}",
    "anthropic": "${ANTHROPIC_API_KEY:-YOUR_ANTHROPIC_KEY}",
    "deepseek": "${DEEPSEEK_API_KEY:-YOUR_DEEPSEEK_KEY}"
  },
  "default_model": {
    "provider": "openai",
    "api_base": "https://api.openai.com/v1",
    "model": "gpt-4o"
  }
}
EOF
}

# Buat config kalau belum ada
if [ ! -f "$CONFIG_FILE" ]; then
  echo "⚠️  Config file belum ada, membuat default config..."
  create_default_config
fi

# Pastikan file bisa dibaca
if ! jq empty "$CONFIG_FILE" >/dev/null 2>&1; then
  echo "❌ File config rusak, membuat ulang..."
  create_default_config
fi

# Ganti model berdasarkan argumen
case "$1" in
  gpt)
    jq '.default_model.provider="openai" | .default_model.api_base="https://api.openai.com/v1" | .default_model.model="gpt-4o"' \
      "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
    echo "✅ Switched to GPT-4o"
    ;;
  claude)
    jq '.default_model.provider="anthropic" | .default_model.api_base="https://api.anthropic.com/v1" | .default_model.model="claude-3.5-sonnet"' \
      "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
    echo "✅ Switched to Claude 3.5 Sonnet"
    ;;
  deepseek)
    jq '.default_model.provider="deepseek" | .default_model.api_base="https://api.deepseek.com/v1" | .default_model.model="deepseek-coder"' \
      "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
    echo "✅ Switched to DeepSeek Coder"
    ;;
  *)
    echo "Usage: $0 {gpt|claude|deepseek}"
    exit 1
    ;;
esac
