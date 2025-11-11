import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3001",

  google: {
    projectId: process.env.GOOGLE_PROJECT_ID || "project-fast-pitch",
    visionCredentials: process.env.GOOGLE_VISION_CREDENTIALS || "./credentials/google-vision-credentials.json",
    geminiCredentials: process.env.GOOGLE_GEMINI_CREDENTIALS || "./credentials/google-gemini-credentials.json",
    sheets: {
      serviceAccountKey: process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY || "./credentials/google-sheets-credentials.json",
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "",
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || "Cards",
    },
  },

  upload: {
    dir: process.env.UPLOAD_DIR || "./uploads",
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760", 10), // 10MB
  },
};

