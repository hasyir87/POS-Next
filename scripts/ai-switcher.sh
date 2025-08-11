#!/bin/bash
MODEL="$1"
case $MODEL in
  gpt)
    sed -i 's/"default_model".*/"default_model": { "provider": "openai", "model": "gpt-4o" },/' ~/.tabnine/tabnine_config.json
    echo "✅ Switched to GPT-4o"
    ;;
  claude)
    sed -i 's/"default_model".*/"default_model": { "provider": "anthropic", "model": "claude-3.5-sonnet" },/' ~/.tabnine/tabnine_config.json
    echo "✅ Switched to Claude 3.5 Sonnet"
    ;;
  deepseek)
    sed -i 's/"default_model".*/"default_model": { "provider": "deepseek", "model": "deepseek-coder" },/' ~/.tabnine/tabnine_config.json
    echo "✅ Switched to DeepSeek Coder"
    ;;
  *)
    echo "Usage: ./ai-switcher.sh [gpt|claude|deepseek]"
    ;;
esac
