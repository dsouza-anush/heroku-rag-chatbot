import { NextRequest, NextResponse } from "next/server";
import { getPipeline, updatePipelineSettings } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/pipelines/:id/settings - Update pipeline settings only
export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const settings = await request.json();

    // Validate settings
    if (typeof settings !== "object") {
      return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
    }

    const pipeline = await updatePipelineSettings(id, settings);

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
    console.error("Error updating pipeline settings:", error);
    return NextResponse.json(
      { error: "Failed to update pipeline settings" },
      { status: 500 }
    );
  }
}

// GET /api/pipelines/:id/settings - Get pipeline settings
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

    return NextResponse.json(pipeline.settings || {});
  } catch (error) {
    console.error("Error fetching pipeline settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipeline settings" },
      { status: 500 }
    );
  }
}
