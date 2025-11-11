import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { config } from "../config";
import { randomUUID } from "crypto";

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Invalid file type. Only images are allowed."));
  },
});

router.post("/", upload.single("image"), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const imageId = randomUUID();
    const imageUrl = `/uploads/${req.file.filename}`;

    res.json({
      sourceImageId: imageId,
      filename: req.file.filename,
      url: imageUrl,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    console.error("Image upload error:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

export { router as imageRouter };

