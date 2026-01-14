import { NextRequest } from "next/server";
import { getPipeline, searchChunks } from "@/lib/db";
import {
  embedText,
  rerankDocuments,
  formatContext,
  streamChatResponse,
  generateChatResponse,
} from "@/lib/ai";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { ChatRequest, ChatSource, ChatResponse } from "@/types/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/v1/knowledge-bases/:id/chat - Chat with RAG
export async function POST(
  request: NextRequest,
  routeContext: RouteContext
): Promise<Response> {
  const { id } = await routeContext.params;

  const pipeline = await getPipeline(id);
  if (!pipeline) {
    throw new NotFoundError("Knowledge Base", id);
  }

  const body = (await request.json()) as ChatRequest;

  // Validate
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    throw new ValidationError("messages array is required and must not be empty");
  }

  const lastUserMessage = [...body.messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage) {
    throw new ValidationError("At least one user message is required");
  }

  const query = lastUserMessage.content;
  const useStreaming = body.stream !== false; // Default to true

  // Search for relevant context
  const queryEmbedding = await embedText(query);
  const chunks = await searchChunks(id, queryEmbedding, 20);

  // Try to rerank for better relevance, fall back to vector search order
  let sources: ChatSource[] = [];
  let contextChunks: Array<{ content: string; title?: string; score?: number }> = [];

  if (chunks.length > 0) {
    try {
      const documents = chunks.map((c) => c.content);
      const reranked = await rerankDocuments(query, documents, 5);

      sources = reranked.map((r) => {
        const chunk = chunks[r.index];
        return {
          title: chunk.title || "Unknown",
          url: chunk.url,
          snippet: chunk.content.slice(0, 200) + "...",
        };
      });

      contextChunks = reranked.map((r) => {
        const chunk = chunks[r.index];
        return {
          content: chunk.content,
          title: chunk.title,
          score: r.relevanceScore,
        };
      });
    } catch (rerankError) {
      console.warn("Reranking failed, using vector search order:", rerankError);

      // Fall back to vector search results
      const topChunks = chunks.slice(0, 5);
      sources = topChunks.map((chunk) => ({
        title: chunk.title || "Unknown",
        url: chunk.url,
        snippet: chunk.content.slice(0, 200) + "...",
      }));

      contextChunks = topChunks.map((chunk) => ({
        content: chunk.content,
        title: chunk.title,
        score: chunk.similarity,
      }));
    }
  }

  const context = formatContext(contextChunks);

  if (useStreaming) {
    // Return Server-Sent Events stream
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Send sources first
        const sourcesEvent = `data: ${JSON.stringify({ type: "sources", sources })}\n\n`;
        controller.enqueue(encoder.encode(sourcesEvent));

        try {
          // Stream the response
          for await (const chunk of streamChatResponse(body.messages, context)) {
            const textEvent = `data: ${JSON.stringify({ type: "text", content: chunk })}\n\n`;
            controller.enqueue(encoder.encode(textEvent));
          }

          // Send done event
          const doneEvent = `data: ${JSON.stringify({ type: "done" })}\n\n`;
          controller.enqueue(encoder.encode(doneEvent));
        } catch (error) {
          const errorEvent = `data: ${JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } else {
    // Return full response
    const answer = await generateChatResponse(body.messages, context);

    const response: ChatResponse = {
      answer,
      sources,
    };

    return Response.json(response);
  }
}
