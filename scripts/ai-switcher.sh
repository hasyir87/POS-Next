#!/bin/bash
MODEL="$1"
CONFIG="$HOME/.tabnine/tabnine_config.json"

case $MODEL in
  gpt)
    jq '.default_model = { "provider": "openai", "model": "gpt-4o" }' "$CONFIG" > tmp.$$.json && mv tmp.$$.json "$CONFIG"
    echo "✅ Switched to GPT-4o"
    ;;
  claude)
    jq '.default_model = { "provider": "anthropic", "model": "claude-3.5-sonnet" }' "$CONFIG" > tmp.$$.json && mv tmp.$$.json "$CONFIG"
    echo "✅ Switched to Claude 3.5 Sonnet"
    ;;
  deepseek)
    jq '.default_model = { "provider": "deepseek", "model": "deepseek-coder", "api_base": "https://api.deepseek.com/v1" }' "$CONFIG" > tmp.$$.json && mv tmp.$$.json "$CONFIG"
    echo "✅ Switched to DeepSeek Coder"
    ;;
  *)
    echo "Usage: ./ai-switcher.sh [gpt|claude|deepseek]"
    ;;
esac
