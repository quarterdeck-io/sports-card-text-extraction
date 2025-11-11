# CardExtract Pro

Web application for extracting and normalizing text from sports card images using OCR and AI.

## Project Structure

```
├── web/                 # Next.js frontend application
├── backend/            # Node.js/Express backend API
├── PROJECT_PLAN.md     # Project planning and specifications
├── SETUP.md            # Environment setup instructions
└── README.md           # This file
```

## Quick Start

### Prerequisites

See [SETUP.md](./SETUP.md) for detailed setup instructions.

### Installation

1. **Frontend (Next.js)**
   ```bash
   cd web
   pnpm install
   ```

2. **Backend (Node.js/Express)**
   ```bash
   cd backend
   pnpm install
   ```

### Environment Setup

1. Copy `.env.example` to `.env` in both `web/` and `backend/` directories
2. Fill in your API keys:
   - OpenAI API Key
   - Google Cloud Project ID
   - Google Service Account credentials
   - Google Sheets configuration

### Running the Application

**Development mode:**

1. Start backend:
   ```bash
   cd backend
   pnpm dev
   ```

2. Start frontend (in a new terminal):
   ```bash
   cd web
   pnpm dev
   ```

Frontend: http://localhost:3000
Backend API: http://localhost:3001

## Features

- 📸 Image upload and webcam capture
- 🔍 OCR text extraction via Google Vision API
- 🤖 AI-powered text normalization
- ✏️ Review and edit extracted data
- 📊 Export to CSV or Google Sheets
- 🎯 Confidence scoring and error flagging

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **APIs**: Google Vision API, OpenAI GPT, Google Sheets API

## License

Private project

