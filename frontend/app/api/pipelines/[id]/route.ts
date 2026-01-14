import { NextRequest, NextResponse } from "next/server";
import { getPipeline, deletePipeline, updatePipeline } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/pipelines/:id
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const pipeline = await getPipeline(id);

    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: pipeline.id,
      name: pipeline.name,
      description: pipeline.description,
      settings: pipeline.settings || {},
      created_at: pipeline.created_at?.toISOString(),
      updated_at: pipeline.updated_at?.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching pipeline:", error);
    return NextResponse.json({ error: "Failed to fetch pipeline" }, { status: 500 });
  }
}

// PATCH /api/pipelines/:id - Update pipeline
export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const { name, description, settings } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const pipeline = await updatePipeline(id, name, description, settings);

    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: pipeline.id,
      name: pipeline.name,
      description: pipeline.description,
      settings: pipeline.settings || {},
      created_at: pipeline.created_at?.toISOString(),
      updated_at: pipeline.updated_at?.toISOString(),
    });
  } catch (error) {
    console.error("Error updating pipeline:", error);
    return NextResponse.json({ error: "Failed to update pipeline" }, { status: 500 });
  }
}

// DELETE /api/pipelines/:id
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const deleted = await deletePipeline(id);

    if (!deleted) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    return NextResponse.json({ status: "deleted" });
  } catch (error) {
    console.error("Error deleting pipeline:", error);
    return NextResponse.json({ error: "Failed to delete pipeline" }, { status: 500 });
  }
}
