import { Router, Request, Response } from "express";
import { BookRecord } from "../types";
import { randomUUID } from "crypto";
import { booksStore } from "../models/bookStore";

const router = Router();

router.post("/", (req: Request, res: Response) => {
  try {
    const bookData: Partial<BookRecord> = req.body;
    
    const bookId = randomUUID();
    const now = new Date().toISOString();
    
    const book: BookRecord = {
      id: bookId,
      sourceImage: bookData.sourceImage || {
        id: "",
        url: "",
        filename: "",
      },
      rawOcrText: bookData.rawOcrText || "",
      ocrBlocks: bookData.ocrBlocks || [],
      normalized: bookData.normalized || {
        printISBN: "",
        eISBN: "",
        publisherName: "",
        placePublished: "",
        yearPublished: "",
        editionText: "",
        printingText: "",
        printRunNumbers: "",
        volume: "",
        title: "",
        author: "",
        illustrator: "",
        completePublisherInfo: "",
        description: "",
        genre: "",
        category: "",
        retailPrice: "",
        copyrightInfo: "",
        libraryOfCongress: "",
        coverDesigner: "",
        originalPublicationDetails: "",
        format: "Hardcover",
        condition: "Acceptable",
        quantity: "1",
        productType: "book",
        language: "English",
        jacketCondition: "dust jacket included",
        signedText: "not signed",
      },
      confidenceByField: bookData.confidenceByField || {},
      autoTitle: bookData.autoTitle || "",
      autoDescription: bookData.autoDescription || "",
      processingStatus: bookData.processingStatus || "ready_for_review",
      errors: bookData.errors || [],
      createdAt: now,
      updatedAt: now,
    };

    booksStore.set(bookId, book);
    
    res.json({ bookId, book });
  } catch (error) {
    console.error("Book creation error:", error);
    res.status(500).json({ error: "Failed to create book" });
  }
});

router.get("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const book = booksStore.get(id);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    res.json(book);
  } catch (error) {
    console.error("Book retrieval error:", error);
    res.status(500).json({ error: "Failed to retrieve book" });
  }
});

router.put("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const book = booksStore.get(id);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    console.log(`📝 Updating book ${id}:`);

    // Update normalized fields if provided
    if (req.body.normalized) {
      book.normalized = {
        ...book.normalized,
        ...req.body.normalized,
      };
    }

    // Update other fields if provided
    if (req.body.autoTitle !== undefined) {
      book.autoTitle = req.body.autoTitle;
    }
    if (req.body.autoDescription !== undefined) {
      book.autoDescription = req.body.autoDescription;
    }

    book.updatedAt = new Date().toISOString();
    booksStore.set(id, book);

    res.json(book);
  } catch (error) {
    console.error("Book update error:", error);
    res.status(500).json({ error: "Failed to update book" });
  }
});

export { router as bookRouter };
