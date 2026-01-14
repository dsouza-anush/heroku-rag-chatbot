import { NextRequest, NextResponse } from "next/server";
import { getPipeline, searchChunks } from "@/lib/db";
import {
  embedText,
  rerankDocuments,
  formatContext,
  streamRAGResponse,
} from "@/lib/ai";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/pipelines/:id/chat - Streaming RAG chat
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  try {
    const { id } = await context.params;
    const { message, stream = true } = await request.json();

    const pipeline = await getPipeline(id);
    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    // Get retrieval settings from pipeline
    const settings = pipeline.settings || {};
    const topN = settings.topN ?? 5;
    const useReranking = settings.useReranking ?? true;

    // If streaming is disabled, use the non-streaming path
    if (!stream) {
      return handleNonStreaming(id, message, topN, useReranking);
    }

    // Streaming response with Server-Sent Events
    const encoder = new TextEncoder();

    const responseStream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // Step 1: Embedding
          send("step", { step: "embedding" });
          const queryEmbedding = await embedText(message);

          // Step 2: Searching
          send("step", { step: "searching" });
          const chunks = await searchChunks(id, queryEmbedding, 20);

          if (chunks.length === 0) {
            send("sources", { sources: [] });
            send("text", { content: "I don't have any information about that in my knowledge base." });
            send("done", {});
            controller.close();
            return;
          }

          // Step 3: Reranking (if enabled)
          send("step", { step: "reranking" });
          let sources;
          let contextChunks;

          if (useReranking) {
            try {
              const documents = chunks.map((c) => c.content);
              const reranked = await rerankDocuments(message, documents, topN);

              sources = reranked
                .filter((r) => r.index >= 0 && r.index < chunks.length)
                .map((r) => {
                  const chunk = chunks[r.index];
                  return {
                    url: chunk.url,
                    title: chunk.title || "Unknown",
                    snippet: chunk.content.slice(0, 200) + "...",
                  };
                });

              contextChunks = reranked
                .filter((r) => r.index >= 0 && r.index < chunks.length)
                .map((r) => {
                  const chunk = chunks[r.index];
                  return {
                    content: chunk.content,
                    title: chunk.title,
                    score: r.relevanceScore,
                  };
                });
            } catch {
              // Fall back to vector search order
              const topChunks = chunks.slice(0, topN);
              sources = topChunks.map((chunk) => ({
                url: chunk.url,
                title: chunk.title || "Unknown",
                snippet: chunk.content.slice(0, 200) + "...",
              }));

              contextChunks = topChunks.map((chunk) => ({
                content: chunk.content,
                title: chunk.title,
                score: chunk.similarity,
              }));
            }
          } else {
            // Skip reranking, use vector search order
            const topChunks = chunks.slice(0, topN);
            sources = topChunks.map((chunk) => ({
              url: chunk.url,
              title: chunk.title || "Unknown",
              snippet: chunk.content.slice(0, 200) + "...",
            }));

            contextChunks = topChunks.map((chunk) => ({
              content: chunk.content,
              title: chunk.title,
              score: chunk.similarity,
            }));
          }

          // Send sources immediately so user can see them while LLM generates
          send("sources", { sources });

          // Step 4: Generating
          send("step", { step: "generating" });
          const contextStr = formatContext(contextChunks);

          // Stream the LLM response
          for await (const chunk of streamRAGResponse(message, contextStr)) {
            send("text", { content: chunk });
          }

          send("done", {});
        } catch (error) {
          send("error", { message: error instanceof Error ? error.message : "Unknown error" });
        }

        controller.close();
      },
    });

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in chat:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}

// Non-streaming fallback for backwards compatibility
async function handleNonStreaming(pipelineId: string, message: string, topN: number, useReranking: boolean) {
  const { generateRAGResponse } = await import("@/lib/ai");

  const queryEmbedding = await embedText(message);
  const chunks = await searchChunks(pipelineId, queryEmbedding, 20);

  if (chunks.length === 0) {
    return NextResponse.json({
      answer: "I don't have any information about that in my knowledge base.",
      sources: [],
    });
  }

  let sources;
  let contextChunks;

  if (useReranking) {
    try {
      const documents = chunks.map((c) => c.content);
      const reranked = await rerankDocuments(message, documents, topN);

      sources = reranked.map((r) => {
        const chunk = chunks[r.index];
        return {
          url: chunk.url,
          title: chunk.title || "Unknown",
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
    } catch {
      // Fall back to vector search order
      const topChunks = chunks.slice(0, topN);
      sources = topChunks.map((chunk) => ({
        url: chunk.url,
        title: chunk.title || "Unknown",
        snippet: chunk.content.slice(0, 200) + "...",
      }));

      contextChunks = topChunks.map((chunk) => ({
        content: chunk.content,
        title: chunk.title,
        score: chunk.similarity,
      }));
    }
  } else {
    // Skip reranking, use vector search order
    const topChunks = chunks.slice(0, topN);
    sources = topChunks.map((chunk) => ({
      url: chunk.url,
      title: chunk.title || "Unknown",
      snippet: chunk.content.slice(0, 200) + "...",
    }));

    contextChunks = topChunks.map((chunk) => ({
      content: chunk.content,
      title: chunk.title,
      score: chunk.similarity,
    }));
  }

  const contextStr = formatContext(contextChunks);
  const answer = await generateRAGResponse(message, contextStr);

  return NextResponse.json({ answer, sources });
}
