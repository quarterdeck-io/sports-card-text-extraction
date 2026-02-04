import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import { performance } from "perf_hooks";
import { config } from "../config";
import { extractTextFromImage } from "../services/ocrService";
import { normalizeBookText, generateBookTitleAndDescription } from "../services/aiService";
import { randomUUID } from "crypto";
import { BookRecord } from "../types";
import { booksStore } from "../models/bookStore";

const router: Router = Router();

router.post("/", async (req: Request, res: Response) => {
  const timings: Record<string, number> = {};
  const totalStartTime = performance.now();
  
  try {
    console.log("🚀 Starting book processing pipeline...");
    const { filename, sourceImageId, url } = req.body;

    if (!filename) {
      console.error("❌ Missing filename in request");
      return res.status(400).json({ error: "Filename is required" });
    }

    console.log(`📁 Processing file: ${filename}`);

    // Step 1: OCR
    console.log("\n--- Step 1: OCR Extraction ---");
    const ocrStartTime = performance.now();
    
    const uploadDir = config.upload.dir;
    const imagePath = path.isAbsolute(uploadDir) 
      ? path.join(uploadDir, filename)
      : path.join(__dirname, "../../", uploadDir, filename);
    
    if (!fs.existsSync(imagePath)) {
      console.error(`❌ Image file not found: ${imagePath}`);
      return res.status(404).json({ 
        error: "Image file not found",
        path: imagePath 
      });
    }
    
    console.log(`   Image path verified: ${imagePath}`);
    let ocrResult;
    try {
      ocrResult = await extractTextFromImage(imagePath);
      const ocrEndTime = performance.now();
      timings.ocr = Math.round((ocrEndTime - ocrStartTime) / 100) / 10;
      console.log(`   Extracted ${ocrResult.rawOcrText.length} characters`);
      console.log(`   ⏱️  OCR took ${timings.ocr}s`);
      
      if (!ocrResult.rawOcrText || ocrResult.rawOcrText.trim().length === 0) {
        console.warn("⚠️  OCR returned empty text");
        return res.status(400).json({
          error: "No text found in image",
          message: "Unable to extract any text from this image. Please ensure:\n• The image is clear and in focus\n• The title page text is visible and readable\n• The image is not corrupted or damaged\n• Try uploading a higher quality image",
          step: "ocr",
        });
      }
    } catch (ocrError: any) {
      console.error("❌ OCR processing failed:", ocrError);
      const ocrErrorMessage = ocrError instanceof Error ? ocrError.message : "Unknown OCR error";
      
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
          message: "The uploaded image appears to be corrupted or invalid. Please try:\n• Uploading a different image file\n• Ensuring the file is a valid JPG, PNG, or PDF\n• Checking that the image is not damaged",
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
    console.log("\n--- Step 2: AI Book Normalization ---");
    const normalizeStartTime = performance.now();
    let normalizeResult;
    try {
      normalizeResult = await normalizeBookText(ocrResult.rawOcrText);
      const normalizeEndTime = performance.now();
      timings.normalization = Math.round((normalizeEndTime - normalizeStartTime) / 100) / 10;
      console.log("   Book normalization completed");
      console.log(`   ⏱️  Normalization took ${timings.normalization}s`);
    } catch (normalizeError: any) {
      console.error("❌ AI Book Normalization failed:", normalizeError);
      const normalizeErrorMessage = normalizeError instanceof Error ? normalizeError.message : "Unknown error";
      
      if (normalizeErrorMessage.includes("AI service unavailable") || normalizeErrorMessage.includes("No compatible models")) {
        return res.status(503).json({
          error: "AI service unavailable",
          message: "The AI service is currently unavailable. This may be due to:\n• API configuration issues\n• No compatible AI models available\n• Please try again later or contact support",
          step: "normalization",
        });
      } else if (normalizeErrorMessage.includes("access denied") || normalizeErrorMessage.includes("billing")) {
        return res.status(403).json({
          error: "AI service access denied",
          message: "Unable to access AI services. Please ensure:\n• Billing is enabled for your Google Cloud account\n• API permissions are correctly configured\n• Contact your administrator if this persists",
          step: "normalization",
        });
      } else if (normalizeErrorMessage.includes("authentication failed") || normalizeErrorMessage.includes("API key")) {
        return res.status(401).json({
          error: "AI service authentication failed",
          message: "Invalid API credentials. Please check:\n• Your API key is correctly configured\n• The API key has the necessary permissions\n• Contact support if you need help setting up API access",
          step: "normalization",
        });
      } else if (normalizeErrorMessage.includes("temporarily unavailable")) {
        return res.status(503).json({
          error: "AI service temporarily unavailable",
          message: "The AI service is temporarily overloaded. Please:\n• Wait a few moments and try again\n• The service should be available shortly",
          step: "normalization",
        });
      } else {
        return res.status(500).json({
          error: "AI normalization failed",
          message: normalizeErrorMessage || "Unable to process the extracted text. Please try again or contact support if the issue persists.",
          step: "normalization",
          details: config.nodeEnv === "development" ? normalizeErrorMessage : undefined,
        });
      }
    }

    // Step 3: Create book record first (before background title generation)
    console.log("\n--- Step 3: Creating Book Record ---");
    const bookId = randomUUID();
    const now = new Date().toISOString();

    // Apply TIER 3 defaults
    const normalizedWithDefaults = {
      ...normalizeResult.normalized,
      format: normalizeResult.normalized.format || "Hardcover",
      condition: normalizeResult.normalized.condition || "Acceptable",
      quantity: normalizeResult.normalized.quantity || "1",
      productType: normalizeResult.normalized.productType || "book",
      language: normalizeResult.normalized.language || "English",
      jacketCondition: normalizeResult.normalized.jacketCondition || "dust jacket included",
      signedText: normalizeResult.normalized.signedText || "not signed",
    };

    const book: BookRecord = {
      id: bookId,
      sourceImage: {
        id: sourceImageId || bookId,
        url: url || `/uploads/${filename}`,
        filename,
      },
      rawOcrText: ocrResult.rawOcrText,
      ocrBlocks: ocrResult.ocrBlocks,
      normalized: normalizedWithDefaults,
      confidenceByField: normalizeResult.confidenceByField,
      autoTitle: "", // Will be filled in background
      autoDescription: "", // Will be filled in background
      processingStatus: "ready_for_review",
      errors: [],
      createdAt: now,
      updatedAt: now,
    };

    booksStore.set(bookId, book);
    
    // Step 4: Generate title and description (NON-BLOCKING - runs in background)
    console.log("\n--- Step 4: Generate Title/Description (background) ---");
    
    const titleStartTime = performance.now();
    const isbn = normalizedWithDefaults.printISBN || normalizedWithDefaults.eISBN;
    generateBookTitleAndDescription(normalizedWithDefaults, isbn)
      .then((result) => {
        const titleEndTime = performance.now();
        const titleTime = Math.round((titleEndTime - titleStartTime) / 100) / 10;
        console.log("   ✅ Title/Description generated in background");
        console.log(`   ⏱️  Title generation took ${titleTime}s`);
        
        const existingBook = booksStore.get(bookId);
        if (existingBook) {
          let finalTitle = result.autoTitle || "";
          let finalDescription = result.autoDescription || "";
          let finalRetailPrice = (result as any).retailPrice || "";
          
          if (!finalTitle || finalTitle.trim() === "") {
            finalTitle = existingBook.normalized.title || "Untitled Book";
          }
          
          if (!finalDescription || finalDescription.trim() === "") {
            const parts = [
              finalTitle,
              existingBook.normalized.author ? `by ${existingBook.normalized.author}` : "",
              existingBook.normalized.publisherName ? `Published by ${existingBook.normalized.publisherName}` : "",
              existingBook.normalized.yearPublished ? `(${existingBook.normalized.yearPublished})` : "",
            ].filter(Boolean);
            finalDescription = parts.join(". ") + ". " + (existingBook.normalized.description || "Bibliographic information extracted from title page.");
          }

          // Only apply AI-estimated retail price if:
          // - We actually have an ISBN (no price lookups for books without ISBN)
          // - The model returned a non-empty price
          // - We don't already have a price from OCR or prior edits
          if (
            isbn &&
            typeof finalRetailPrice === "string" &&
            finalRetailPrice.trim() !== "" &&
            (!existingBook.normalized.retailPrice || existingBook.normalized.retailPrice.trim() === "")
          ) {
            existingBook.normalized.retailPrice = finalRetailPrice.trim();
            // Set a moderate confidence score for AI-estimated pricing if slot exists
            if (!existingBook.confidenceByField) {
              existingBook.confidenceByField = {};
            }
            if (existingBook.confidenceByField.retailPrice === undefined) {
              existingBook.confidenceByField.retailPrice = 0.8;
            }
            console.log(`   🏷️  Applied AI-estimated retailPrice: ${finalRetailPrice.trim()}`);
          }
          
          existingBook.autoTitle = finalTitle;
          existingBook.autoDescription = finalDescription;
          existingBook.updatedAt = new Date().toISOString();
          booksStore.set(bookId, existingBook);
          
          console.log(`   📝 Book ${bookId} updated with title/description`);
          console.log(`   📝 Final autoTitle: "${finalTitle}" (${finalTitle.length} chars)`);
          console.log(`   📝 Final autoDescription: "${finalDescription.substring(0, 80)}..." (${finalDescription.length} chars)`);
        } else {
          console.error(`   ❌ Book ${bookId} not found in store - cannot update title/description`);
        }
      })
      .catch((titleError: any) => {
        console.error("❌ Title/Description generation failed (background):", titleError);
        console.warn("⚠️  Title generation failed, but book processing completed");
      });
    
    console.log("   ⚡ Title generation started in background, returning response immediately");
    
    const totalEndTime = performance.now();
    timings.total = Math.round((totalEndTime - totalStartTime) / 100) / 10;
    
    console.log(`✅ Book processing completed successfully! Book ID: ${bookId}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("⏱️  Processing Timings:");
    console.log(`   OCR: ${timings.ocr}s`);
    console.log(`   AI Normalization: ${timings.normalization}s`);
    console.log(`   Title Generation: Running in background (non-blocking)`);
    console.log(`   Total (blocking): ${timings.total}s`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    res.json({ bookId, book, timings });
  } catch (error) {
    console.error("\n❌ Book processing error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`   Error details: ${errorMessage}`);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
    res.status(500).json({
      error: "Processing failed",
      message: errorMessage,
      step: errorMessage.includes("OCR") ? "ocr" : errorMessage.includes("Normalization") ? "normalization" : errorMessage.includes("Title") ? "title_generation" : "unknown",
      details: error instanceof Error ? error.stack : undefined,
    });
  }
});

export { router as processBookRouter };
