## Project Plan — Sports Card Text Extraction & Export

### 1) Scope and Goals
- **Goal**: Web app to upload/capture card slab photos, extract text via OCR, normalize into structured fields with AI, allow review/edit, and export to CSV/Google Sheets.
- **MVP**: Upload/capture → OCR (Google Vision) → AI normalization (OpenAI) → Review/Edit UI with confidence flags → Auto Title/Description → Export CSV/Sheets.
- **Non-goals (Phase 1)**: Advanced image preprocessing, multi-user RBAC, bulk batch operations beyond single-card or small batch, mobile apps.

### 2) Core Entities and Fields
- **CardRecord** (normalized):
  - `year`
  - `set` (brand/series)
  - `cardNumber`
  - `title` (card title/highlight)
  - `playerFirstName`
  - `playerLastName`
  - `gradingCompany` (e.g., PSA, SGC, BGS)
  - `grade` (e.g., NM-MT 8, VG-EX 4)
  - `cert` (certification number)
  - `caption` (front caption/extra text)
  - `autoTitle` (generated)
  - `autoDescription` (generated)
  - `confidenceByField` (0–1 per field)
  - `sourceImageId`
  - `processingStatus` (uploaded|ocr_complete|ai_normalized|ready_for_review|exported|error)
  - `errors` (array of processing errors)

### 3) Essentials (MVP)
- **Image input**: Desktop upload + webcam capture with simple guidance overlay (glare tips, framing).
- **OCR**: Google Vision Text Detection; collect text blocks + confidence; retain raw OCR for auditing.
- **AI normalization**: OpenAI prompt to parse raw OCR → structured fields; expand abbreviations; correct common misreads.
- **Confidence & flagging**: Combine Vision confidence + model certainty; flag low-confidence fields for review (UI highlight + tooltip).
- **Review/Edit UI**: Inline table/form editor per field; accept changes; track validation (required, formats).
- **Auto Title/Description**: Deterministic rule + prompt template to produce listing-ready strings.
- **Export**: CSV download; Google Sheets write via API to selected sheet/tab.
- **Cost controls**: Guardrails, batching, rate limits, and observability (counts per session/day).

### 4) Enhancements (Phase 1.5+)
- **Image preprocessing**: De-glare, denoise, contrast enhance; retry OCR.
- **Bulk processing**: Queue multiple images; progress tracking.
- **Template learning**: Improve prompts with feedback loop; per-grader/era heuristics.
- **User accounts**: Basic auth, saved sessions, history.

### 5) Architecture (High Level)
- **Frontend (React or Next.js)**:
  - Pages: Upload/Capture, Review/Edit, Exports, Settings (API keys, Google auth), About
  - Components: `ImageCapture`, `UploadDropzone`, `CardFieldEditor`, `ConfidenceBadge`, `ExportPanel`
  - State: Local + server via REST; simple client store (Zustand/Context) for review session
- **Backend (Node.js/Express)**:
  - Services: `ocrService` (Google Vision), `aiNormalizeService` (OpenAI), `sheetsService` (Google Sheets), `exportService` (CSV)
  - Controllers: `/cards`, `/ocr`, `/normalize`, `/export`, `/sheets`
  - Storage (MVP): In-memory or lightweight file-based storage for sessions; optional SQLite for persistence
  - Config: Env-based credentials; token budgeting; retry/backoff
- **External APIs**:
  - Google Vision (OCR)
  - OpenAI (normalization + generation)
  - Google Sheets (export)

### 6) Data Model (MVP)
```json
{
  "id": "string",
  "sourceImage": {
    "id": "string",
    "url": "string",
    "meta": { "width": 0, "height": 0 }
  },
  "rawOcrText": "string",
  "ocrBlocks": [
    { "text": "string", "confidence": 0.0, "bbox": [0,0,0,0] }
  ],
  "normalized": {
    "year": "",
    "set": "",
    "cardNumber": "",
    "title": "",
    "playerFirstName": "",
    "playerLastName": "",
    "gradingCompany": "",
    "grade": "",
    "cert": "",
    "caption": ""
  },
  "confidenceByField": { "year": 0.0, "set": 0.0, "cardNumber": 0.0, "title": 0.0, "playerFirstName": 0.0, "playerLastName": 0.0, "gradingCompany": 0.0, "grade": 0.0, "cert": 0.0, "caption": 0.0 },
  "autoTitle": "",
  "autoDescription": "",
  "processingStatus": "uploaded",
  "errors": []
}
```

### 7) API Endpoints (Draft)
- `POST /api/images` — upload image; returns `sourceImageId`
- `POST /api/ocr` — body: `{ sourceImageId }`; returns `{ rawOcrText, ocrBlocks }`
- `POST /api/normalize` — body: `{ rawOcrText }`; returns `{ normalized, confidenceByField }`
- `POST /api/cards` — create or update a `CardRecord` from `{ sourceImageId, normalized, confidenceByField }`
- `GET /api/cards/:id` — fetch record
- `POST /api/generate/title-description` — body: `{ normalized }`; returns `{ autoTitle, autoDescription }`
- `POST /api/export/csv` — body: `{ cardIds: [] }`; returns file
- `POST /api/export/sheets` — body: `{ cardIds: [], spreadsheetId, sheetName }`; writes to Sheets; returns range

### 8) UI Screens & Flow
- **Upload/Capture**: Dropzone + webcam; show guidance (glare tip, framing). After image acquired → start OCR.
- **Processing**: Progress indicator (OCR → Normalize → Generate Title/Description).
- **Review/Edit**: Editable fields; confidence badges; validation; regenerate title/description; save.
- **Export**: Pick records → CSV download or Google Sheets (with auth flow).
- **Settings**: API keys, Google OAuth connect; cost view (# OCR, # tokens).

### 9) Integrations
- **Google Vision**: Text Detection; request/response mapping; handle low confidence; retry/backoff.
- **OpenAI**: Structured extraction prompt with strict JSON schema; abbreviation expansion; misread fixes; deterministic sampling (e.g., low temperature).
- **Google Sheets**: OAuth for user or service account; append rows with normalized fields + auto title/description.

### 10) Error Handling & Confidence Strategy
- Aggregate confidence per field: `fieldConfidence = max(visionFieldConfidence, aiCertaintyProxy)`.
- Thresholds: `<0.6` red (verify), `0.6–0.8` amber (recommended review), `>0.8` green.
- Surface: Outline + tooltip with reasons; allow override.
- Logging: Store errors with step (ocr|normalize|export) and message for debugging.

### 11) Auto Title & Description Rules
- **Title template**: `[year] [set] [playerFirstName] [playerLastName] [special?] #[cardNumber] [gradingCompany] [grade]`
- **Description**: `[Title]. [player name]. [why player important]. [why card is good].`
- Ensure consistent capitalization and spacing; include special designations when present (rookie, patch, signed).

### 12) Non-Functional Requirements
- **Performance**: Single image flow < 8s (p50) end-to-end with cached models.
- **Reliability**: Graceful retries; meaningful errors; local persistence of session.
- **Cost**: Track OCR count and token usage; visible in Settings.
- **Security**: Store API keys securely; HTTPS; limit PII (none expected).

### 13) Milestones (3–4 business days)
- **Day 1**: Project scaffolding (React/Next + Express), env/config, upload/capture UI, image upload endpoint
- **Day 2**: Google Vision integration, OCR pipeline, Review/Edit UI skeleton with fields + confidence
- **Day 3**: OpenAI normalization + auto title/description, CSV export, Sheets export (basic)
- **Day 4**: Polish: validation, error states, cost counters, UX tips, docs, QA

### 14) Risks & Mitigations
- Low-quality/glare images → show guidance + allow retake; consider preprocessing in 1.5.
- OCR variance by grader labels → prompt includes grader-specific hints; expand dictionary.
- Token/cost spikes → budget checks, batch prompts, lower temperature.
- OAuth friction for Sheets → allow CSV fallback.

### 15) Open Questions
- Do we need batch processing (multi-image) in MVP?
- Preferred identity/auth (none/basic/OAuth)?
- Persist data across sessions or ephemeral only?
- Service account vs user OAuth for Sheets?

### 16) Env & Config (MVP)
- `GOOGLE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`
- `OPENAI_API_KEY`
- `GOOGLE_SHEETS_CREDS` or OAuth flow config
- `APP_BASE_URL`, `NODE_ENV`

### 17) Acceptance Criteria (MVP)
- Can upload or capture an image and see extracted fields populated.
- Low-confidence fields are visually flagged; fields are editable.
- Auto title and description generated consistently from fields.
- CSV download works; Google Sheets export writes correct columns.
- Processing errors are surfaced with actionable messages.

### 18) UI/UX Design Specifications

#### 18.1 Header & Navigation
- **Header Bar**: Dark blue background (`#1e3a5f` or similar)
- **Logo**: "CardExtract Pro" in white text, positioned far left
- **Navigation Links**: White text, positioned far right
  - Links: "Upload", "Processing", "Review", "Export"
  - Active state: Current step should be visually indicated (underline, bold, or highlight)
- **Layout**: Full-width header bar, sticky/fixed at top

#### 18.2 Main Upload Page
- **Hero Section**:
  - Large, bold heading (center): "Extract Text from Sports Cards Instantly"
  - Subtitle below heading: "Upload an image and let AI handle the rest"

- **Two-Column Layout**:
  - **Left Panel (Upload/Capture)**:
    - Large white rectangular drop zone with dashed border
    - Upload icon (box with upward arrow) in blue/red colors, centered
    - Text: "Drop image here or click to browse"
    - Two dark blue buttons below drop zone:
      1. "Capture via Camera" (with camera icon)
      2. "Simulate Upload & Proceed"
  
  - **Right Panel (Tips for Best Photo)**:
    - White card/panel with title "Tips for Best Photo" (with light brown folder icon)
    - **Single Column Layout** (vertical stack):
      - **Good Example Section**:
        - Green checkmark icon
        - Text: "Good: Clear, no glare"
        - Image placeholder: "Good photo" (needs actual example image)
      - **Bad Example Section** (below Good):
        - Red 'X' icon
        - Text: "Bad: Glare, blurry"
        - Image placeholder: "Bad photo" (needs actual example image)
    - **Note**: Good and Bad examples must be in one column (vertical), not side-by-side

#### 18.3 Export Success Modal
- **Modal Popup**: White background, rounded corners, centered overlay with shadow
- **Top Section**:
  - Celebration/confetti icon (colorful: yellow, blue, pink, purple) at top center
  - Large, bold dark grey text: "Export Successful!"
- **Middle Section**:
  - Smaller dark grey text: "Your data has been exported to:"
  - Two export options (vertical list):
    1. "Download CSV" - Blue text link with grey spreadsheet icon to the left
    2. "or" - Plain dark grey separator text
    3. "Open Google Sheet" - Blue text link with Google Sheets logo (green spreadsheet icon) to the left
- **Bottom Section**:
  - Large dark blue button spanning modal width: "Process Another Card"
  - White text on button

#### 18.4 Design Notes & Fixes Required
- **Image Placeholders**: Replace broken image placeholders in Tips section with actual example photos
- **Layout**: Ensure Good/Bad examples are stacked vertically in one column (not side-by-side)
- **Color Scheme**: 
  - Primary: Dark blue (`#1e3a5f` or similar) for headers, buttons, links
  - Background: Light grey for main content area
  - Cards: White with subtle shadows
  - Icons: Match brand colors (green for success, red for errors, blue for actions)

### 19) Implementation Checklist (Tracking)
- [ ] Frontend scaffold + routing
- [ ] Header component with navigation
- [ ] Upload page with two-column layout
- [ ] Upload/Capture dropzone with drag-and-drop
- [ ] Camera capture functionality
- [ ] Tips panel with Good/Bad examples (vertical column)
- [ ] Fix broken image placeholders with actual example images
- [ ] Image upload API
- [ ] OCR integration + confidence capture
- [ ] AI normalization + abbreviation expansion
- [ ] Review/Edit UI with flags
- [ ] Auto title/description
- [ ] CSV export
- [ ] Google Sheets export
- [ ] Export success modal with celebration icon
- [ ] Settings (keys/auth + usage)
- [ ] Logs/observability for calls and costs
- [ ] Basic tests + docs

