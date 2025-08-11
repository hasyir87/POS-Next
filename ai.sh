# ====== SET VARIABEL ======
PROJECT_NAME="codespaces-ai"
GITHUB_USER="hasyir87"

# ====== BUAT FOLDER & MASUK ======
mkdir $PROJECT_NAME && cd $PROJECT_NAME

# ====== BUAT .devcontainer ======
mkdir -p .devcontainer
cat << 'EOF' > .devcontainer/devcontainer.json
{
  "name": "AI Codespaces Turbo",
  "image": "mcr.microsoft.com/devcontainers/universal:2",
  "customizations": {
    "codespaces": { "editorVersion": "next" },
    "vscode": {
      "extensions": [
        "Continue.continue",
        "TabNine.tabnine-vscode"
      ]
    }
  },
  "postCreateCommand": "bash /workspaces/codespaces-ai/scripts/post-setup.sh"
}
EOF

# ====== BUAT SCRIPT POST SETUP ======
mkdir -p scripts
cat << 'EOF' > scripts/post-setup.sh
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
EOF
chmod +x scripts/post-setup.sh

# ====== BUAT AI SWITCHER ======
cat << 'EOF' > scripts/ai-switcher.sh
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
EOF
chmod +x scripts/ai-switcher.sh

# ====== INIT GIT & PUSH KE GITHUB ======
git init
git add .
git commit -m "Initial AI Codespaces setup"
gh repo create $PROJECT_NAME --public --source=. --remote=origin --push

# ====== BUAT CODESPACE (PAKAI --wait) ======
gh codespace create --repo $GITHUB_USER/$PROJECT_NAME --machine standardLinux --wait
