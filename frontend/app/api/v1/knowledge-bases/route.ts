import { NextRequest, NextResponse } from "next/server";
import { createPipeline, getPipelines } from "@/lib/db";
import { ValidationError, jsonResponse, createdResponse } from "@/lib/errors";
import type { KnowledgeBase, CreateKnowledgeBaseRequest } from "@/types/api";

// GET /api/v1/knowledge-bases - List all knowledge bases
export async function GET(): Promise<NextResponse> {
  const pipelines = await getPipelines();

  const knowledgeBases: KnowledgeBase[] = pipelines.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    documentCount: p.chunk_count || 0,
    createdAt: p.created_at?.toISOString() || new Date().toISOString(),
    updatedAt: p.updated_at?.toISOString() || new Date().toISOString(),
  }));

  return jsonResponse(knowledgeBases);
}

// POST /api/v1/knowledge-bases - Create a new knowledge base
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as CreateKnowledgeBaseRequest;

  // Validate
  if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
    throw new ValidationError("name is required and must be a non-empty string");
  }

  const pipeline = await createPipeline(body.name.trim(), body.description);

  const knowledgeBase: KnowledgeBase = {
    id: pipeline.id,
    name: pipeline.name,
    description: pipeline.description,
    documentCount: 0,
    createdAt: pipeline.created_at?.toISOString() || new Date().toISOString(),
    updatedAt: pipeline.updated_at?.toISOString() || new Date().toISOString(),
  };

  return createdResponse(knowledgeBase);
}
