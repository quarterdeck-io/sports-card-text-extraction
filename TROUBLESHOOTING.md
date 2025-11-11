# Troubleshooting Guide

## Terminal Setup

You need **TWO terminals** running simultaneously:

### Terminal 1: Backend Server
```bash
cd "/Users/User/Desktop/projects/Sports card Text Extraction & Export/backend"
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 20
pnpm dev
```

cd "/Users/User/Desktop/projects/Sports card Text Extraction & Export/backend"
pnpm dev


**Keep this terminal open** - This is your backend API server.

### Terminal 2: Frontend Server
```bash
cd "/Users/User/Desktop/projects/Sports card Text Extraction & Export/web"
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 20
pnpm dev
```

cd "/Users/User/Desktop/projects/Sports card Text Extraction & Export/web"
pnpm dev


**Keep this terminal open** - This is your Next.js frontend.

## When You Get a 500 Error

1. **Look at Terminal 1 (Backend)** - The error details will be logged there
2. The logs will show:
   - ✅ or ❌ for each step
   - Detailed error messages
   - Which API is failing (Google Vision or OpenAI)

## Common Issues

### Missing API Keys
If you see:
- ❌ OpenAI API key is not configured
- ❌ Google Vision API: Connection failed

**Solution:** Create a `.env` file in the `backend/` directory:
```env
OPENAI_API_KEY=your_openai_key_here
GOOGLE_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account.json
```

### File Not Found
If you see:
- ❌ Image file not found

**Solution:** Make sure the `uploads/` directory exists in the `backend/` folder

### API Connection Issues
Check the health endpoint:
```bash
curl http://localhost:3001/api/health
```

This will show which APIs are connected/disconnected.