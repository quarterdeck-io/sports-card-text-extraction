import { GoogleGenerativeAI } from "@google/generative-ai";
import { NormalizedCardFields, NormalizeResponse, TitleDescriptionResponse } from "../types";

let geminiClient: GoogleGenerativeAI | null = null;
let workingGeminiModel: string = "gemini-2.5-flash"; // Default model name (updated to newer model)

function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    console.log("🤖 Initializing Google Gemini API client...");
    
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error("❌ Gemini API key is not configured");
      throw new Error("Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file. Get it from https://aistudio.google.com/app/apikey");
    }
    
    try {
      geminiClient = new GoogleGenerativeAI(apiKey);
      console.log("✅ Google Gemini API client initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Gemini API client:", error);
      throw error;
    }
  }
  return geminiClient;
}

// Helper function to list available models via REST API
async function listAvailableModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    
    if (!response.ok) {
      console.log(`   ⚠️  Could not list models (status: ${response.status})`);
      return [];
    }
    
    const data = await response.json() as { models?: Array<{ name?: string }> };
    if (data.models && Array.isArray(data.models)) {
      return data.models
        .map((model) => model.name?.replace("models/", "") || "")
        .filter((name: string) => name.includes("gemini"))
        .filter(Boolean);
    }
    return [];
  } catch (error) {
    console.log(`   ⚠️  Error listing models: ${error instanceof Error ? error.message : "Unknown"}`);
    return [];
  }
}

export async function checkGeminiConnection(): Promise<boolean> {
  try {
    console.log("🔍 Testing Google Gemini API connection...");
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error("❌ GEMINI_API_KEY is not set in environment variables");
      return false;
    }
    
    // Show first few characters for debugging (mask the rest)
    const maskedKey = apiKey.length > 8 
      ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` 
      : "***";
    console.log(`   API Key: ${maskedKey} (${apiKey.length} characters)`);
    
    // Try to list available models first
    console.log("   Checking available models...");
    const availableModels = await listAvailableModels(apiKey);
    
    if (availableModels.length > 0) {
      console.log(`   ✅ Found ${availableModels.length} available model(s): ${availableModels.join(", ")}`);
    } else {
      console.log("   ⚠️  Could not list models, will try common model names...");
    }
    
    const client = getGeminiClient();
    
    // Build list of models to try: available models first, then common ones
    const modelsToTry = [
      ...availableModels,
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-pro",
      "gemini-1.0-pro",
    ].filter((model, index, self) => self.indexOf(model) === index); // Remove duplicates
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`   Testing model: ${modelName}...`);
        const model = client.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("test");
        
        console.log(`✅ Google Gemini API: Connected (using ${modelName})`);
        workingGeminiModel = modelName;
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage.includes("not found") || errorMessage.includes("404")) {
          console.log(`   ⚠️  Model ${modelName} not found`);
          continue;
        } else if (errorMessage.includes("403") || errorMessage.includes("PERMISSION_DENIED")) {
          console.error(`❌ Google Gemini API: Permission denied for ${modelName}`);
          console.error(`   Error: ${errorMessage}`);
          console.error(`   💡 This model may require billing to be enabled.`);
          console.error(`   💡 Enable billing at: https://console.cloud.google.com/billing`);
          continue;
        } else if (errorMessage.includes("401") || errorMessage.includes("API_KEY")) {
          console.error(`❌ Google Gemini API: Invalid API key`);
          console.error(`   Error: ${errorMessage}`);
          console.error(`   💡 Get a new API key from: https://aistudio.google.com/app/apikey`);
          return false;
        } else {
          // Other error - log but continue
          console.log(`   ⚠️  Error with ${modelName}: ${errorMessage.substring(0, 80)}...`);
          continue;
        }
      }
    }
    
    // All models failed
    console.error("❌ Google Gemini API: All model attempts failed");
    console.error("   💡 Possible issues:");
    console.error("   1. Billing not enabled - Enable at: https://console.cloud.google.com/billing");
    console.error("   2. API not enabled - Enable Generative Language API in Google Cloud Console");
    console.error("   3. Invalid API key - Get new key from: https://aistudio.google.com/app/apikey");
    return false;
  } catch (error) {
    console.error("❌ Google Gemini API: Connection failed", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`   Error details: ${errorMessage}`);
    return false;
  }
}

// Helper function to retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Only retry on 503 (service unavailable) or 429 (rate limit)
      if (errorMsg.includes("503") || errorMsg.includes("Service Unavailable") || 
          errorMsg.includes("429") || errorMsg.includes("overloaded")) {
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
          console.log(`   ⚠️  Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      // For other errors, don't retry
      throw error;
    }
  }
  
  throw lastError;
}

// Helper function to find a working model
async function findWorkingModel(client: GoogleGenerativeAI, apiKey: string): Promise<string> {
  // Try to get available models
  const availableModels = await listAvailableModels(apiKey);
  
  // Prefer stable models over preview ones (avoid preview models that might be overloaded)
  const preferredModels = [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-flash-latest",
    "gemini-pro-latest",
    ...availableModels.filter(m => !m.includes("preview") && !m.includes("exp")),
    ...availableModels,
  ].filter((model, index, self) => self.indexOf(model) === index);
  
  for (const modelName of preferredModels) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      await model.generateContent("test");
      console.log(`   ✅ Found working model: ${modelName}`);
      return modelName;
    } catch (e) {
      continue;
    }
  }
  
  throw new Error("No working Gemini model found");
}

export async function normalizeCardText(rawOcrText: string): Promise<NormalizeResponse> {
  try {
    console.log("🤖 Starting AI text normalization with Gemini...");
    console.log(`   OCR text length: ${rawOcrText.length} characters`);
    
    const client = getGeminiClient();
    const apiKey = process.env.GEMINI_API_KEY || "";
    
    // Use the working model
    let modelToUse = workingGeminiModel;
    console.log(`   Using model: ${modelToUse}`);

    const prompt = `You are an expert at extracting and normalizing information from sports card images. Extract the following information from the OCR text below:

${rawOcrText}

Extract and normalize the following fields:
- year: The year the card was produced (e.g., "1972", "1955")
- set: The brand/set name (e.g., "Topps", "Bowman")
- cardNumber: The card number (e.g., "#595", "#123")
- title: The card title or highlight text
- playerFirstName: First name of the player
- playerLastName: Last name of the player
- gradingCompany: The grading company (e.g., "PSA", "SGC", "BGS")
- grade: The grade (e.g., "NM-MT 8", "VG-EX 4", "Mint 9")
- cert: Certification number if available
- caption: Any additional caption or text from the front of the card

Expand abbreviations:
- VG → VG-EX
- EX → EX-MT
- NM → NM-MT
- etc.

Fix common OCR misreads:
- POW → Powell
- etc.

Return ONLY a valid JSON object with this exact structure:
{
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
  "confidenceByField": {
    "year": 0.0,
    "set": 0.0,
    "cardNumber": 0.0,
    "title": 0.0,
    "playerFirstName": 0.0,
    "playerLastName": 0.0,
    "gradingCompany": 0.0,
    "grade": 0.0,
    "cert": 0.0,
    "caption": 0.0
  }
}

For confidence scores, use values between 0.0 and 1.0. Use lower values (0.5-0.7) if the field is unclear or missing, and higher values (0.8-1.0) if the field is clearly identified.`;

    // Try with retry logic and fallback models
    let result;
    let lastError: Error | unknown;
    const modelsToTry = [
      modelToUse,
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-pro",
    ].filter((model, index, self) => self.indexOf(model) === index); // Remove duplicates
    
    for (const currentModel of modelsToTry) {
      try {
        console.log(`   Trying model: ${currentModel}...`);
        const model = client.getGenerativeModel({ 
          model: currentModel,
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        });
        
        // Retry with exponential backoff for 503/429 errors
        result = await retryWithBackoff(async () => {
          return await model.generateContent(prompt);
        }, 3, 1000);
        
        // Success - update working model
        if (currentModel !== modelToUse) {
          console.log(`   ✅ Switched to model: ${currentModel}`);
          workingGeminiModel = currentModel;
        }
        break; // Success, exit loop
      } catch (modelError) {
        lastError = modelError;
        const errorMsg = modelError instanceof Error ? modelError.message : String(modelError);
        
        // If it's a 404 (model not found), try next model
        if (errorMsg.includes("not found") || errorMsg.includes("404")) {
          console.log(`   ⚠️  Model ${currentModel} not found, trying next...`);
          continue;
        }
        
        // If it's 503/429 (overloaded/rate limit), try next model
        if (errorMsg.includes("503") || errorMsg.includes("Service Unavailable") || 
            errorMsg.includes("429") || errorMsg.includes("overloaded")) {
          console.log(`   ⚠️  Model ${currentModel} is overloaded, trying alternative...`);
          continue;
        }
        
        // For other errors, throw immediately
        throw modelError;
      }
    }
    
    // If all models failed
    if (!result) {
      throw lastError || new Error("All model attempts failed");
    }
    const response = result.response;
    const content = response.text();

    if (!content) {
      throw new Error("No response from Gemini");
    }

    const parsed = JSON.parse(content);
    console.log("✅ AI normalization completed");
    return parsed as NormalizeResponse;
  } catch (error) {
    console.error("❌ AI Normalization Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`   Error details: ${errorMessage}`);
    throw new Error(`AI normalization failed: ${errorMessage}`);
  }
}

export async function generateTitleAndDescription(
  normalized: NormalizedCardFields
): Promise<TitleDescriptionResponse> {
  try {
    console.log("📝 Generating title and description with Gemini...");
    const client = getGeminiClient();
    const apiKey = process.env.GEMINI_API_KEY || "";
    const modelToUse = workingGeminiModel;
    console.log(`   Using model: ${modelToUse}`);

    // Build player name
    const playerName = [normalized.playerFirstName, normalized.playerLastName].filter(Boolean).join(" ");
    const playerLastName = normalized.playerLastName || "";
    
    // Check if title already contains player's last name to avoid duplication
    const titleContainsPlayerName = normalized.title && playerLastName && 
      normalized.title.toLowerCase().includes(playerLastName.toLowerCase());

    const prompt = `Generate a title and description for this sports card based on the following information:

Year: ${normalized.year}
Set: ${normalized.set}
Card Number: ${normalized.cardNumber}
Player First Name: ${normalized.playerFirstName || ""}
Player Last Name: ${normalized.playerLastName || ""}
Grading Company: ${normalized.gradingCompany}
Grade: ${normalized.grade}
Card Title/Event: ${normalized.title || "None"}

CRITICAL INSTRUCTIONS FOR TITLE FORMAT:
${titleContainsPlayerName 
  ? `The card title "${normalized.title}" already contains the player's last name "${playerLastName}". 
     Format: [year] [set] [card title/event as-is] #[cardNumber] [gradingCompany] [grade]
     DO NOT include the player's name separately since it's already in the card title.`
  : `Format: [year] [set] [playerFirstName] [playerLastName] [card title/event if different from player name] #[cardNumber] [gradingCompany] [grade]
     Special designations include: rookie, logo patch, jersey patch, signed, etc.`}

Examples:
- "1972 Topps Nolan Ryan #595 PSA NM-MT 8"
- "1955 Topps Sandy Koufax Rookie #123 PSA VG-EX 4"
- If card title is "Powell Homers to Opposite Field!" and player is "Powell", use: "1971 O-Pee-Chee Powell Homers to Opposite Field! #327 PSA VG-EX 4" (NOT "Powell Powell...")

Description Format: [repeat title], [player name]. [description of why player is important]. [why card is good].

Return ONLY a valid JSON object:
{
  "autoTitle": "",
  "autoDescription": ""
}`;

    // Try with retry logic and fallback models
    let result;
    let lastError: Error | unknown;
    const modelsToTry = [
      modelToUse,
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-pro",
    ].filter((model, index, self) => self.indexOf(model) === index); // Remove duplicates
    
    for (const currentModel of modelsToTry) {
      try {
        console.log(`   Trying model: ${currentModel}...`);
        const model = client.getGenerativeModel({ 
          model: currentModel,
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        });
        
        // Retry with exponential backoff for 503/429 errors
        result = await retryWithBackoff(async () => {
          return await model.generateContent(prompt);
        }, 3, 1000);
        
        // Success - update working model
        if (currentModel !== modelToUse) {
          console.log(`   ✅ Switched to model: ${currentModel}`);
          workingGeminiModel = currentModel;
        }
        break; // Success, exit loop
      } catch (modelError) {
        lastError = modelError;
        const errorMsg = modelError instanceof Error ? modelError.message : String(modelError);
        
        // If it's a 404 (model not found), try next model
        if (errorMsg.includes("not found") || errorMsg.includes("404")) {
          console.log(`   ⚠️  Model ${currentModel} not found, trying next...`);
          continue;
        }
        
        // If it's 503/429 (overloaded/rate limit), try next model
        if (errorMsg.includes("503") || errorMsg.includes("Service Unavailable") || 
            errorMsg.includes("429") || errorMsg.includes("overloaded")) {
          console.log(`   ⚠️  Model ${currentModel} is overloaded, trying alternative...`);
          continue;
        }
        
        // For other errors, throw immediately
        throw modelError;
      }
    }
    
    // If all models failed
    if (!result) {
      throw lastError || new Error("All model attempts failed");
    }
    const response = result.response;
    const content = response.text();

    if (!content) {
      throw new Error("No response from Gemini");
    }

    const parsed = JSON.parse(content);
    console.log("✅ Title and description generated");
    return parsed as TitleDescriptionResponse;
  } catch (error) {
    console.error("❌ Title/Description Generation Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`   Error details: ${errorMessage}`);
    throw new Error(`Title/description generation failed: ${errorMessage}`);
  }
}
