import { BookRecord } from "../types";

// Shared in-memory storage for books (replace with database later)
export const booksStore = new Map<string, BookRecord>();
