import { Router, Request, Response } from "express";
import { normalizeCardText, generateTitleAndDescription } from "../services/aiService";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { rawOcrText } = req.body;
    
    if (!rawOcrText) {
      return res.status(400).json({ error: "OCR text is required" });
    }

    const result = await normalizeCardText(rawOcrText);
    res.json(result);
  } catch (error) {
    console.error("Normalization error:", error);
    res.status(500).json({ 
      error: "Text normalization failed",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.post("/title-description", async (req: Request, res: Response) => {
  try {
    const { normalized } = req.body;
    
    if (!normalized) {
      return res.status(400).json({ error: "Normalized fields are required" });
    }

    const result = await generateTitleAndDescription(normalized);
    res.json(result);
  } catch (error) {
    console.error("Title/Description generation error:", error);
    res.status(500).json({ 
      error: "Failed to generate title/description",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export { router as normalizeRouter };

