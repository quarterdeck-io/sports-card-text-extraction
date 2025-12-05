import { Router, Request, Response } from "express";
import { CardRecord } from "../types";
import { randomUUID } from "crypto";
import { cardsStore } from "../models/cardStore";

const router = Router();

router.post("/", (req: Request, res: Response) => {
  try {
    const cardData: Partial<CardRecord> = req.body;
    
    const cardId = randomUUID();
    const now = new Date().toISOString();
    
    const card: CardRecord = {
      id: cardId,
      sourceImage: cardData.sourceImage || {
        id: "",
        url: "",
        filename: "",
      },
      rawOcrText: cardData.rawOcrText || "",
      ocrBlocks: cardData.ocrBlocks || [],
      normalized: cardData.normalized || {
        year: "",
        set: "",
        sku: "",
        cardNumber: "",
        title: "",
        playerFirstName: "",
        playerLastName: "",
        gradingCompany: "",
        grade: "",
        cert: "",
        caption: "",
      },
      confidenceByField: cardData.confidenceByField || {},
      autoTitle: cardData.autoTitle || "",
      autoDescription: cardData.autoDescription || "",
      processingStatus: cardData.processingStatus || "ready_for_review",
      errors: cardData.errors || [],
      createdAt: now,
      updatedAt: now,
    };

    cardsStore.set(cardId, card);
    
    res.json({ cardId, card });
  } catch (error) {
    console.error("Card creation error:", error);
    res.status(500).json({ error: "Failed to create card" });
  }
});

router.get("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const card = cardsStore.get(id);
    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }
    res.json(card);
  } catch (error) {
    console.error("Card retrieval error:", error);
    res.status(500).json({ error: "Failed to retrieve card" });
  }
});

router.put("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const card = cardsStore.get(id);
    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }

    // Log what we're receiving
    console.log(`📝 Updating card ${id}:`);
    if (req.body.normalized) {
      console.log(`   Received normalized.sku: "${req.body.normalized.sku || ""}"`);
      console.log(`   Received normalized.cardNumber: "${req.body.normalized.cardNumber || ""}"`);
      console.log(`   Received normalized.title: "${req.body.normalized.title || ""}"`);
    }

    // Update normalized fields if provided
    if (req.body.normalized) {
      card.normalized = {
        ...card.normalized,
        ...req.body.normalized,
      };
      console.log(`   ✅ Updated card.normalized.sku: "${card.normalized.sku || ""}"`);
      console.log(`   ✅ Updated card.normalized.cardNumber: "${card.normalized.cardNumber || ""}"`);
    }

    // Update other fields if provided
    if (req.body.autoTitle !== undefined) {
      card.autoTitle = req.body.autoTitle;
    }
    if (req.body.autoDescription !== undefined) {
      card.autoDescription = req.body.autoDescription;
    }

    card.updatedAt = new Date().toISOString();
    cardsStore.set(id, card);

    res.json(card);
  } catch (error) {
    console.error("Card update error:", error);
    res.status(500).json({ error: "Failed to update card" });
  }
});

export { router as cardRouter };

