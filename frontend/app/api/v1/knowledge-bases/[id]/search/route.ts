import { NextRequest, NextResponse } from "next/server";
import { getPipeline, searchChunks } from "@/lib/db";
import { embedText, rerankDocuments } from "@/lib/ai";
import { NotFoundError, ValidationError, jsonResponse } from "@/lib/errors";
import type { SearchRequest, SearchResponse, SearchResult } from "@/types/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/v1/knowledge-bases/:id/search - Search documents
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;

  const pipeline = await getPipeline(id);
  if (!pipeline) {
    throw new NotFoundError("Knowledge Base", id);
  }

  const body = (await request.json()) as SearchRequest;

  // Validate
  if (!body.query || typeof body.query !== "string") {
    throw new ValidationError("query is required");
  }

  const topK = body.topK || 5;
  const useRerank = body.rerank !== false; // Default to true

  // Generate query embedding
  const queryEmbedding = await embedText(body.query);

  // Search with more results if we're going to rerank
  const searchLimit = useRerank ? topK * 4 : topK;
  const chunks = await searchChunks(id, queryEmbedding, searchLimit);

  let results: SearchResult[];

  if (useRerank && chunks.length > 0) {
    try {
      // Try to rerank the results
      const documents = chunks.map((c) => c.content);
      const reranked = await rerankDocuments(body.query, documents, topK);

      results = reranked.map((r) => {
        const chunk = chunks[r.index];
        return {
          content: chunk.content,
          source: chunk.url,
          score: r.relevanceScore,
          metadata: {
            title: chunk.title,
          },
        };
      });
    } catch (rerankError) {
      console.warn("Reranking failed, using vector search order:", rerankError);
      // Fall back to vector similarity scores
      results = chunks.slice(0, topK).map((c) => ({
        content: c.content,
        source: c.url,
        score: c.similarity,
        metadata: {
          title: c.title,
        },
      }));
    }
  } else {
    // Use vector similarity scores directly
    results = chunks.slice(0, topK).map((c) => ({
      content: c.content,
      source: c.url,
      score: c.similarity,
      metadata: {
        title: c.title,
      },
    }));
  }

  const response: SearchResponse = {
    results,
    query: body.query,
    totalResults: results.length,
  };

  return jsonResponse(response);
}
