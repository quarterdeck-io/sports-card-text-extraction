import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { performance } from "perf_hooks";
import { config } from "../config";
import { randomUUID } from "crypto";

const router: Router = Router();

// Ensure upload directory exists
const uploadDir = config.upload.dir;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`📁 Created upload directory: ${uploadDir}`);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure directory exists before saving
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
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
  const uploadStartTime = performance.now();
  
  try {
    if (!req.file) {
      // Check if it's a multer error
      if (req.body && (req.body as any).error) {
        const multerError = (req.body as any).error;
        if (multerError.includes("File too large")) {
          return res.status(413).json({ 
            error: "File too large",
            message: "The uploaded file exceeds the maximum size of 10MB. Please upload a smaller image."
          });
        }
        if (multerError.includes("Invalid file type")) {
          return res.status(400).json({ 
            error: "Invalid file type",
            message: "Only image files (JPG, PNG, GIF, WebP) are allowed. Please upload a valid image file."
          });
        }
      }
      return res.status(400).json({ 
        error: "No file uploaded",
        message: "Please select an image file to upload."
      });
    }

    const imageId = randomUUID();
    const imageUrl = `/uploads/${req.file.filename}`;
    
    const uploadEndTime = performance.now();
    const uploadTime = Math.round((uploadEndTime - uploadStartTime) / 100) / 10;

    console.log(`✅ Image uploaded: ${req.file.filename} (${req.file.size} bytes)`);
    console.log(`   Saved to: ${path.join(uploadDir, req.file.filename)}`);
    console.log(`   ⏱️  Upload took ${uploadTime}s`);

    res.json({
      sourceImageId: imageId,
      filename: req.file.filename,
      url: imageUrl,
      size: req.file.size,
      mimetype: req.file.mimetype,
      timings: {
        upload: uploadTime,
      },
    });
  } catch (error) {
    console.error("Image upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Handle specific multer errors
    if (errorMessage.includes("File too large") || errorMessage.includes("LIMIT_FILE_SIZE")) {
      return res.status(413).json({ 
        error: "File too large",
        message: "The uploaded file exceeds the maximum size of 10MB. Please upload a smaller image."
      });
    }
    
    if (errorMessage.includes("Invalid file type") || errorMessage.includes("LIMIT_FILE_TYPE")) {
      return res.status(400).json({ 
        error: "Invalid file type",
        message: "Only image files (JPG, PNG, GIF, WebP) are allowed. Please upload a valid image file."
      });
    }
    
    res.status(500).json({ 
      error: "Failed to upload image",
      message: config.nodeEnv === "development" ? errorMessage : "An error occurred while uploading the image. Please try again."
    });
  }
});

// Error handler for multer errors
router.use((error: any, req: Request, res: Response, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ 
        error: "File too large",
        message: "The uploaded file exceeds the maximum size of 10MB. Please upload a smaller image."
      });
    }
    return res.status(400).json({ 
      error: "Upload error",
      message: error.message || "An error occurred while uploading the file. Please try again."
    });
  }
  
  if (error) {
    if (error.message?.includes("Invalid file type")) {
      return res.status(400).json({ 
        error: "Invalid file type",
        message: "Only image files (JPG, PNG, GIF, WebP) are allowed. Please upload a valid image file."
      });
    }
    return res.status(400).json({ 
      error: "Upload error",
      message: error.message || "An error occurred while uploading the file. Please try again."
    });
  }
  
  next(error);
});

export { router as imageRouter };

