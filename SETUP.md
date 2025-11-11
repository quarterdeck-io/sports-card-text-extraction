## Environment Setup (macOS) — Sports Card Text Extraction & Export

This guide prepares a macOS dev environment for a React (or Next.js) + Node.js/Express stack with Google Vision, OpenAI, and Google Sheets integrations.

### 1) Prerequisites (Summary)
- macOS 14+ (you have Sonoma 14.6)
- Homebrew
- Xcode Command Line Tools
- nvm + Node.js 20 LTS
- pnpm (or npm/yarn; we recommend pnpm)
- Git
- Python 3 (for native node builds)
- Optional: Google Cloud SDK (gcloud)

### 2) Install Core Tooling
```bash
# 2.1 Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"

# 2.2 Xcode Command Line Tools
xcode-select --install || true

# 2.3 nvm + Node 20 LTS
brew install nvm
mkdir -p ~/.nvm
grep -q 'NVM_DIR' ~/.zshrc || cat >> ~/.zshrc << 'EOF'
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && . "/opt/homebrew/opt/nvm/nvm.sh"
[ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && . "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"
EOF
source ~/.zshrc
nvm install --lts=Hydrogen # Node 20 LTS
nvm use --lts=Hydrogen
npm -v && node -v

# 2.4 pnpm (recommended)
brew install pnpm
pnpm -v

# 2.5 Git
brew install git
git --version

# 2.6 Python 3 (for node-gyp when needed)
brew install python@3.12
python3 --version

# 2.7 Optional: Google Cloud SDK (useful for auth and debugging)
brew install --cask google-cloud-sdk || true
gcloud --version || true
```

### 3) Create local env files
Create `.env` for runtime secrets and `.env.example` for sharing required keys (without real secrets).

```bash
cd "/Users/User/Desktop/projects/Sports card Text Extraction & Export"
cat > .env.example << 'ENVVARS'
# Runtime
NODE_ENV=development
APP_BASE_URL=http://localhost:3000

# OpenAI
OPENAI_API_KEY=

# Google Vision (use service account credentials JSON)
GOOGLE_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/google-service-account.json

# Google Sheets
# If using Service Account: place JSON file path and share Sheet with service account email
GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY=/absolute/path/to/google-sheets-service-account.json
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SHEETS_SHEET_NAME=Cards

# If using OAuth (alternative to Service Account), supply client info as needed
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/oauth/google/callback
ENVVARS
cp -n .env.example .env || true
```

### 4) Accounts and API access
- OpenAI: create an account, generate `OPENAI_API_KEY` and place it in `.env`.
- Google Cloud Project:
  - Create a new project.
  - Enable APIs: Vision API, Sheets API.
  - Create Service Account; grant minimal roles (e.g., Vision User, Sheets Editor for specific project/scopes).
  - Create a JSON key and store the file securely (path set in `.env`).
- Google Sheets access:
  - If using Service Account: share the target spreadsheet with the service account email.
  - If using OAuth: create OAuth credentials and set redirect URI; app will handle consent flow.

### 5) Recommended global utilities
- VS Code or Cursor
- Insomnia/Postman for API testing
- `jq` for JSON CLI formatting: `brew install jq`
- Optional: `imagemagick` for image debugging: `brew install imagemagick`

### 6) Verify toolchain
```bash
node -v            # v20.x
pnpm -v            # should print version
git --version
python3 --version
gcloud --version   # optional
```

### 7) First-time project bootstrap (once code is scaffolded)
```bash
# from project root
pnpm install
pnpm dev           # starts frontend/backend per workspace scripts (to be added)
```

### 8) Troubleshooting
- Build tools missing for native modules → ensure Xcode CLT + Python 3 are installed.
- Permission issues on gcloud → run `gcloud init` or use service account JSON paths.
- Google Sheets 403 → verify spreadsheet is shared with service account or OAuth scopes approved.
- Vision API errors → confirm API enabled and correct `GOOGLE_PROJECT_ID`.

### 9) Security notes
- Never commit `.env` or credential JSON files.
- Prefer service accounts with least-privilege roles.
- Consider using a secrets manager for sharing credentials across teammates.


