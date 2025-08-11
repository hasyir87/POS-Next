#!/bin/bash
set -e

# Buat config Continue
mkdir -p ~/.continue
cat << EOCFG > ~/.continue/config.json
{
  "models": [
    {
      "title": "GPT-4o",
      "provider": "openai",
      "model": "gpt-4o",
      "apiKey": "${OPENAI_API_KEY}"
    },
    {
      "title": "Claude 3.5 Sonnet",
      "provider": "anthropic",
      "model": "claude-3.5-sonnet",
      "apiKey": "${ANTHROPIC_API_KEY}"
    },
    {
      "title": "DeepSeek Coder",
      "provider": "openai",
      "model": "deepseek-coder",
      "apiBase": "https://api.deepseek.com/v1",
      "apiKey": "${DEEPSEEK_API_KEY}"
    }
  ]
}
EOCFG

# Buat config TabNine
mkdir -p ~/.tabnine
cat << EOTB > ~/.tabnine/tabnine_config.json
{
  "version": "4.0.0",
  "api_keys": {
    "openai": "${OPENAI_API_KEY}",
    "anthropic": "${ANTHROPIC_API_KEY}",
    "deepseek": "${DEEPSEEK_API_KEY}"
  },
  "default_model": {
    "provider": "deepseek",
    "api_base": "https://api.deepseek.com/v1",
    "model": "deepseek-coder"
  }
}
EOTB

echo "✅ Post-setup selesai. Model default: DeepSeek Coder"
