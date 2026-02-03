import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface UploadImageResponse {
  sourceImageId: string;
  filename: string;
  url: string;
  size: number;
  mimetype: string;
  timings?: {
    upload: number;
  };
}

export const uploadImage = async (file: File): Promise<UploadImageResponse> => {
  const formData = new FormData();
  formData.append("image", file);

  const response = await api.post<UploadImageResponse>("/api/images", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export interface ProcessImageResponse {
  cardId: string;
  card: {
    id: string;
    normalized: {
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
    };
    autoTitle: string;
    autoDescription: string;
    confidenceByField: Record<string, number>;
  };
  timings?: {
    ocr: number;
    normalization: number;
    titleGeneration: number;
    total: number;
  };
}

export const processImage = async (
  filename: string,
  sourceImageId: string,
  url: string
): Promise<ProcessImageResponse> => {
  const response = await api.post<ProcessImageResponse>("/api/process", {
    filename,
    sourceImageId,
    url,
  });

  return response.data;
};

export interface CardRecord {
  id: string;
  normalized: {
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
  };
  autoTitle: string;
  autoDescription: string;
  confidenceByField: Record<string, number>;
}

export const getCard = async (cardId: string): Promise<CardRecord> => {
  const response = await api.get<CardRecord>(`/api/cards/${cardId}`);
  return response.data;
};

// Book-specific interfaces and functions
export interface BookRecord {
  id: string;
  normalized: {
    printISBN: string;
    eISBN: string;
    publisherName: string;
    placePublished: string;
    yearPublished: string;
    editionText: string;
    printingText: string;
    printRunNumbers: string;
    volume: string;
    title: string;
    author: string;
    illustrator: string;
    completePublisherInfo: string;
    description: string;
    genre: string;
    category: string;
    retailPrice: string;
    copyrightInfo: string;
    libraryOfCongress: string;
    coverDesigner: string;
    originalPublicationDetails: string;
    format: string;
    condition: string;
    quantity: string;
    productType: string;
    language: string;
    jacketCondition: string;
    signedText: string;
  };
  autoTitle: string;
  autoDescription: string;
  confidenceByField: Record<string, number>;
  sourceImage: {
    id: string;
    url: string;
    filename: string;
  };
}

export interface ProcessBookImageResponse {
  bookId: string;
  book: BookRecord;
  timings?: {
    ocr: number;
    normalization: number;
    titleGeneration: number;
    total: number;
  };
}

export const processBookImage = async (
  filename: string,
  sourceImageId: string,
  url: string
): Promise<ProcessBookImageResponse> => {
  const response = await api.post<ProcessBookImageResponse>("/api/process-book", {
    filename,
    sourceImageId,
    url,
  });

  return response.data;
};

export const getBook = async (bookId: string): Promise<BookRecord> => {
  const response = await api.get<BookRecord>(`/api/books/${bookId}`);
  return response.data;
};

export default api;

