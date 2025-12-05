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

