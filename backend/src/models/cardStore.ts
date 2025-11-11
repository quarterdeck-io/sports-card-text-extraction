import { CardRecord } from "../types";

// Shared in-memory storage for MVP (replace with database later)
export const cardsStore = new Map<string, CardRecord>();

