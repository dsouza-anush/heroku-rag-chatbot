import { NextRequest, NextResponse } from "next/server";
import { getPipeline, getIndexedUrls, insertChunksBatch } from "@/lib/db";
import { embedTexts } from "@/lib/ai";
import { crawlUrl, prepareForIndexing } from "@/lib/crawler";
import {
  NotFoundError,
  ValidationError,
  jsonResponse,
  acceptedResponse,
} from "@/lib/errors";
import type { Document, CreateDocumentRequest, DocumentStatus } from "@/types/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// In-memory indexing status (in production, use Redis or database)
const indexingStatus = new Map<string, DocumentStatus>();

// GET /api/v1/knowledge-bases/:id/documents - List documents
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;

  const pipeline = await getPipeline(id);
  if (!pipeline) {
    throw new NotFoundError("Knowledge Base", id);
  }

  const urls = await getIndexedUrls(id);

  const documents: Document[] = urls.map((u) => ({
    id: Buffer.from(u.url).toString("base64url"),
    url: u.url,
    chunkCount: u.chunk_count,
    lastIndexed: u.last_indexed?.toISOString() || new Date().toISOString(),
  }));

  return jsonResponse(documents);
}

// POST /api/v1/knowledge-bases/:id/documents - Add a document
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;

  const pipeline = await getPipeline(id);
  if (!pipeline) {
    throw new NotFoundError("Knowledge Base", id);
  }

  const body = (await request.json()) as CreateDocumentRequest;

  // Validate
  if (!body.type || !["url", "text"].includes(body.type)) {
    throw new ValidationError("type must be 'url' or 'text'");
  }
  if (!body.source || typeof body.source !== "string") {
    throw new ValidationError("source is required");
  }

  const docId = Buffer.from(body.source).toString("base64url").slice(0, 20);
  const statusKey = `${id}:${docId}`;

  // Initialize status
  const status: DocumentStatus = {
    id: docId,
    status: "indexing",
    source: body.source,
    progress: { crawled: 0, total: null },
  };
  indexingStatus.set(statusKey, status);

  // Start indexing in background
  indexDocument(id, body, statusKey).catch((error) => {
    console.error("Indexing error:", error);
    const s = indexingStatus.get(statusKey);
    if (s) {
      s.status = "error";
      s.error = error.message;
    }
  });

  return acceptedResponse(status);
}

async function indexDocument(
  pipelineId: string,
  body: CreateDocumentRequest,
  statusKey: string
): Promise<void> {
  const status = indexingStatus.get(statusKey);
  if (!status) return;

  try {
    let chunks: Array<{ url: string; title: string; content: string }> = [];

    if (body.type === "url") {
      // Crawl the URL
      const pages = await crawlUrl(body.source, {
        maxPages: body.maxPages || 20,
        onProgress: (progress) => {
          status.progress = {
            crawled: progress.crawled,
            total: progress.total,
          };
        },
      });

      // Prepare chunks
      const indexableChunks = prepareForIndexing(pages);
      chunks = indexableChunks.map((c) => ({
        url: c.url,
        title: c.title,
        content: c.content,
      }));
    } else {
      // Direct text indexing
      chunks = [
        {
          url: "text://" + statusKey,
          title: "Direct text input",
          content: body.source,
        },
      ];
    }

    if (chunks.length === 0) {
      status.status = "complete";
      status.progress.chunksCreated = 0;
      return;
    }

    // Generate embeddings in batches
    const batchSize = 50;
    const chunksWithEmbeddings: Array<{
      url: string;
      title: string;
      content: string;
      embedding: number[];
    }> = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const embeddings = await embedTexts(batch.map((c) => c.content));

      for (let j = 0; j < batch.length; j++) {
        chunksWithEmbeddings.push({
          ...batch[j],
          embedding: embeddings[j],
        });
      }
    }

    // Insert into database
    await insertChunksBatch(pipelineId, chunksWithEmbeddings);

    status.status = "complete";
    status.progress.chunksCreated = chunksWithEmbeddings.length;
  } catch (error) {
    status.status = "error";
    status.error = error instanceof Error ? error.message : "Unknown error";
    throw error;
  }
}

// Export for status checking
export function getIndexingStatus(
  pipelineId: string,
  docId: string
): DocumentStatus | undefined {
  return indexingStatus.get(`${pipelineId}:${docId}`);
}
