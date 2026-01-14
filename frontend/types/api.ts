// Knowledge Base types (renamed from Pipeline for clearer API)
export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKnowledgeBaseRequest {
  name: string;
  description?: string;
}

// Document types
export interface Document {
  id: string;
  url: string;
  chunkCount: number;
  lastIndexed: string;
}

export interface CreateDocumentRequest {
  type: "url" | "text";
  source: string;
  crawl?: boolean;
  maxPages?: number;
}

export interface DocumentStatus {
  id: string;
  status: "pending" | "indexing" | "complete" | "error";
  source: string;
  progress: {
    crawled: number;
    total: number | null;
    chunksCreated?: number;
  };
  error?: string;
}

// Search types
export interface SearchRequest {
  query: string;
  topK?: number;
  rerank?: boolean;
}

export interface SearchResult {
  content: string;
  source: string;
  score: number;
  metadata: {
    title?: string;
    chunkIndex?: number;
  };
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  totalResults: number;
}

// Chat types
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  stream?: boolean;
}

export interface ChatSource {
  title: string;
  url: string;
  snippet: string;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
}

// Health check
export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  services: {
    database: "up" | "down";
    embedding: "up" | "down";
    chat: "up" | "down";
  };
}

// API compatibility - map to old pipeline types for frontend
export type Pipeline = KnowledgeBase;
export type IndexedUrl = Document;

export interface IndexStatus {
  indexed_urls: Array<{ url: string; chunk_count: number }>;
  total_chunks: number;
}

export interface IndexProgress {
  status: "indexing" | "complete" | "error" | "not_found";
  progress?: string;
  pages_indexed?: number;
  chunks_created?: number;
  message?: string;
}
