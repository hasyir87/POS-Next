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
  "postCreateCommand": "mkdir -p ~/.continue && cat << 'EOCFG' > ~/.continue/config.json\n{\n  \"models\": [\n    {\n      \"title\": \"GPT-4o\",\n      \"provider\": \"openai\",\n      \"model\": \"gpt-4o\",\n      \"apiKey\": \"${OPENAI_API_KEY}\"\n    },\n    {\n      \"title\": \"Claude 3.5 Sonnet\",\n      \"provider\": \"anthropic\",\n      \"model\": \"claude-3.5-sonnet\",\n      \"apiKey\": \"${ANTHROPIC_API_KEY}\"\n    },\n    {\n      \"title\": \"DeepSeek Coder\",\n      \"provider\": \"openai\",\n      \"model\": \"deepseek-coder\",\n      \"apiBase\": \"https://api.deepseek.com/v1\",\n      \"apiKey\": \"${DEEPSEEK_API_KEY}\"\n    }\n  ]\n}\nEOCFG\nmkdir -p ~/.tabnine && cat << 'EOTB' > ~/.tabnine/tabnine_config.json\n{\n  \"version\": \"4.0.0\",\n  \"api_keys\": {\n    \"openai\": \"${OPENAI_API_KEY}\",\n    \"anthropic\": \"${ANTHROPIC_API_KEY}\",\n    \"deepseek\": \"${DEEPSEEK_API_KEY}\"\n  },\n  \"default_model\": {\n    \"provider\": \"deepseek\",\n    \"api_base\": \"https://api.deepseek.com/v1\",\n    \"model\": \"deepseek-coder\"\n  }\n}\nEOTB"
}
EOF

# ====== BUAT AI SWITCHER CEPAT ======
mkdir -p scripts
cat << 'EOF' > scripts/ai-switcher.sh
#!/bin/bash
MODEL="$1"
case $MODEL in
  gpt)
    sed -i 's/"default_model".*/"default_model": { "provider": "openai", "model": "gpt-4o" },/' ~/.tabnine/tabnine_config.json
    echo "Switched to GPT-4o"
    ;;
  claude)
    sed -i 's/"default_model".*/"default_model": { "provider": "anthropic", "model": "claude-3.5-sonnet" },/' ~/.tabnine/tabnine_config.json
    echo "Switched to Claude 3.5 Sonnet"
    ;;
  deepseek)
    sed -i 's/"default_model".*/"default_model": { "provider": "deepseek", "model": "deepseek-coder" },/' ~/.tabnine/tabnine_config.json
    echo "Switched to DeepSeek Coder"
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

# ====== BUKA DI CODESPACES ======
gh codespace create --repo $GITHUB_USER/$PROJECT_NAME --wait
