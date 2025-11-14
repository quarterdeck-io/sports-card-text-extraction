import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import { config } from "../config";
import { extractTextFromImage } from "../services/ocrService";
import { normalizeCardText, generateTitleAndDescription } from "../services/aiService";
import { randomUUID } from "crypto";
import { CardRecord } from "../types";
import { cardsStore } from "../models/cardStore";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    console.log("🚀 Starting card processing pipeline...");
    const { filename, sourceImageId, url } = req.body;

    if (!filename) {
      console.error("❌ Missing filename in request");
      return res.status(400).json({ error: "Filename is required" });
    }

    console.log(`📁 Processing file: ${filename}`);

    // Step 1: OCR
    console.log("\n--- Step 1: OCR Extraction ---");
    // Build image path - handle both absolute and relative paths
    const uploadDir = config.upload.dir;
    const imagePath = path.isAbsolute(uploadDir) 
      ? path.join(uploadDir, filename)
      : path.join(__dirname, "../../", uploadDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      console.error(`❌ Image file not found: ${imagePath}`);
      console.error(`   Upload directory: ${uploadDir}`);
      console.error(`   Filename: ${filename}`);
      return res.status(404).json({ 
        error: "Image file not found",
        path: imagePath 
      });
    }
    
    console.log(`   Image path verified: ${imagePath}`);
    let ocrResult;
    try {
      ocrResult = await extractTextFromImage(imagePath);
      console.log(`   Extracted ${ocrResult.rawOcrText.length} characters`);
      
      // Check if OCR extracted any text
      if (!ocrResult.rawOcrText || ocrResult.rawOcrText.trim().length === 0) {
        console.warn("⚠️  OCR returned empty text - image may be invalid or contain no readable text");
        return res.status(400).json({
          error: "No text found in image",
          message: "Unable to extract any text from this image. Please ensure:\n• The image is clear and in focus\n• The card text is visible and readable\n• The image is not corrupted or damaged\n• Try uploading a higher quality image",
          step: "ocr",
        });
      }
    } catch (ocrError: any) {
      console.error("❌ OCR processing failed:", ocrError);
      const ocrErrorMessage = ocrError instanceof Error ? ocrError.message : "Unknown OCR error";
      
      // Provide specific error messages for common OCR failures
      if (ocrErrorMessage.includes("does not exist") || ocrErrorMessage.includes("not found")) {
        return res.status(404).json({
          error: "Image file not found",
          message: "The uploaded image file could not be found. Please try uploading again.",
          step: "ocr",
        });
      } else if (ocrErrorMessage.includes("not readable") || ocrErrorMessage.includes("permission")) {
        return res.status(403).json({
          error: "Image file access denied",
          message: "Unable to read the image file. Please try uploading again.",
          step: "ocr",
        });
      } else if (ocrErrorMessage.includes("Invalid image") || ocrErrorMessage.includes("corrupted")) {
        return res.status(400).json({
          error: "Invalid or corrupted image",
          message: "The uploaded image appears to be corrupted or invalid. Please try:\n• Uploading a different image file\n• Ensuring the file is a valid JPG, PNG, GIF, or WebP\n• Checking that the image is not damaged",
          step: "ocr",
        });
      } else {
        return res.status(500).json({
          error: "OCR processing failed",
          message: "Unable to extract text from the image. Please ensure the image is clear and contains readable text, then try again.",
          step: "ocr",
          details: config.nodeEnv === "development" ? ocrErrorMessage : undefined,
        });
      }
    }

    // Step 2: Normalize
    console.log("\n--- Step 2: AI Normalization ---");
    const normalizeResult = await normalizeCardText(ocrResult.rawOcrText);
    console.log("   Normalization completed");

    // Step 3: Generate title and description
    console.log("\n--- Step 3: Generate Title/Description ---");
    const titleDescResult = await generateTitleAndDescription(normalizeResult.normalized);
    console.log("   Title/Description generated");

    // Step 4: Create card record
    console.log("\n--- Step 4: Creating Card Record ---");
    const cardId = randomUUID();
    const now = new Date().toISOString();

    const card: CardRecord = {
      id: cardId,
      sourceImage: {
        id: sourceImageId || cardId,
        url: url || `/uploads/${filename}`,
        filename,
      },
      rawOcrText: ocrResult.rawOcrText,
      ocrBlocks: ocrResult.ocrBlocks,
      normalized: normalizeResult.normalized,
      confidenceByField: normalizeResult.confidenceByField,
      autoTitle: titleDescResult.autoTitle,
      autoDescription: titleDescResult.autoDescription,
      processingStatus: "ready_for_review",
      errors: [],
      createdAt: now,
      updatedAt: now,
    };

    cardsStore.set(cardId, card);
    console.log(`✅ Card processing completed successfully! Card ID: ${cardId}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    res.json({ cardId, card });
  } catch (error) {
    console.error("\n❌ Processing error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`   Error details: ${errorMessage}`);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
    // Return more details even in production for debugging
    res.status(500).json({
      error: "Processing failed",
      message: errorMessage,
      step: errorMessage.includes("OCR") ? "ocr" : errorMessage.includes("Normalization") ? "normalization" : errorMessage.includes("Title") ? "title_generation" : "unknown",
      details: error instanceof Error ? error.stack : undefined,
    });
  }
});

export { router as processRouter };

