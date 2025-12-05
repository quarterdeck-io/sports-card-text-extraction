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

export default api;

