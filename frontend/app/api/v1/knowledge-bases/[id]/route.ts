import { NextRequest, NextResponse } from "next/server";
import { getPipeline, deletePipeline } from "@/lib/db";
import { NotFoundError, jsonResponse, noContentResponse } from "@/lib/errors";
import type { KnowledgeBase } from "@/types/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/v1/knowledge-bases/:id - Get a knowledge base
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;

  const pipeline = await getPipeline(id);

  if (!pipeline) {
    throw new NotFoundError("Knowledge Base", id);
  }

  const knowledgeBase: KnowledgeBase = {
    id: pipeline.id,
    name: pipeline.name,
    description: pipeline.description,
    documentCount: pipeline.chunk_count || 0,
    createdAt: pipeline.created_at?.toISOString() || new Date().toISOString(),
    updatedAt: pipeline.updated_at?.toISOString() || new Date().toISOString(),
  };

  return jsonResponse(knowledgeBase);
}

// DELETE /api/v1/knowledge-bases/:id - Delete a knowledge base
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = await context.params;

  const deleted = await deletePipeline(id);

  if (!deleted) {
    throw new NotFoundError("Knowledge Base", id);
  }

  return noContentResponse();
}
