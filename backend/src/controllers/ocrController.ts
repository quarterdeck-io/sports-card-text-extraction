import { Router, Request, Response } from "express";
import path from "path";
import { config } from "../config";
import { extractTextFromImage } from "../services/ocrService";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: "Filename is required" });
    }

    const imagePath = path.join(__dirname, "../../", config.upload.dir, filename);
    const result = await extractTextFromImage(imagePath);

    res.json(result);
  } catch (error) {
    console.error("OCR error:", error);
    res.status(500).json({ 
      error: "OCR processing failed",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export { router as ocrRouter };

