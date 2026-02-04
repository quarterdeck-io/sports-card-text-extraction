export interface CardRecord {
  id: string;
  sourceImage: {
    id: string;
    url: string;
    filename: string;
    meta?: {
      width?: number;
      height?: number;
    };
  };
  rawOcrText: string;
  ocrBlocks: OCRBlock[];
  normalized: NormalizedCardFields;
  confidenceByField: Record<string, number>;
  autoTitle: string;
  autoDescription: string;
  processingStatus: ProcessingStatus;
  errors: ProcessingError[];
  createdAt: string;
  updatedAt: string;
}

export interface OCRBlock {
  text: string;
  confidence: number;
  bbox?: [number, number, number, number];
}

export interface NormalizedCardFields {
  year: string;
  set: string;
  sku: string;
  cardNumber: string;
  title: string;
  playerFirstName: string;
  playerLastName: string;
  gradingCompany: string;
  grade: string;
  cert: string;
  caption: string;
}

export type ProcessingStatus =
  | "uploaded"
  | "ocr_complete"
  | "ai_normalized"
  | "ready_for_review"
  | "exported"
  | "error";

export interface ProcessingError {
  step: string;
  message: string;
  timestamp: string;
}

export interface OCRResponse {
  rawOcrText: string;
  ocrBlocks: OCRBlock[];
}

export interface NormalizeResponse {
  normalized: NormalizedCardFields;
  confidenceByField: Record<string, number>;
}

export interface TitleDescriptionResponse {
  autoTitle: string;
  autoDescription: string;
}

// Book-specific types
export interface BookRecord {
  id: string;
  sourceImage: {
    id: string;
    url: string;
    filename: string;
    meta?: {
      width?: number;
      height?: number;
    };
  };
  rawOcrText: string;
  ocrBlocks: OCRBlock[];
  normalized: NormalizedBookFields;
  confidenceByField: Record<string, number>;
  autoTitle: string;
  autoDescription: string;
  processingStatus: ProcessingStatus;
  errors: ProcessingError[];
  createdAt: string;
  updatedAt: string;
}

export interface NormalizedBookFields {
  // TIER 1 - Direct OCR Extraction
  printISBN: string;
  eISBN: string;
  publisherName: string;
  placePublished: string;
  yearPublished: string;
  editionText: string;
  printingText: string;
  printRunNumbers: string;
  volume: string;
  
  // TIER 2 - AI-Enhanced Data
  title: string;
  author: string;
  illustrator: string;
  completePublisherInfo: string;
  description: string;
  genre: string;
  category: string;
  retailPrice: string;
  
  // Additional fields from title page
  copyrightInfo: string;
  libraryOfCongress: string;
  coverDesigner: string;
  originalPublicationDetails: string;
  
  // TIER 3 - Default Values (set in processing)
  format: string; // "Hardcover" by default
  condition: string; // "Acceptable" by default
  quantity: string; // "1" by default
  productType: string; // "book" by default
  language: string; // "English" by default
  jacketCondition: string; // "dust jacket included" by default
  signedText: string; // "not signed" by default
}

export interface NormalizeBookResponse {
  normalized: NormalizedBookFields;
  confidenceByField: Record<string, number>;
}

export interface BookTitleDescriptionResponse {
  autoTitle: string;
  autoDescription: string;
  /**
   * Optional AI-estimated retail price derived from ISBN / title lookup.
   * This is kept separate from normalization so we can choose when to apply it.
   */
  retailPrice?: string;
}
