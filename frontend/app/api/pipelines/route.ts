import { NextRequest, NextResponse } from "next/server";
import { createPipeline, getPipelines } from "@/lib/db";

// GET /api/pipelines - List all pipelines
export async function GET(): Promise<NextResponse> {
  try {
    const pipelines = await getPipelines();
    return NextResponse.json(
      pipelines.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        created_at: p.created_at?.toISOString(),
        updated_at: p.updated_at?.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching pipelines:", error);
    return NextResponse.json({ error: "Failed to fetch pipelines" }, { status: 500 });
  }
}

// POST /api/pipelines - Create a pipeline
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const pipeline = await createPipeline(name, description);

    return NextResponse.json({
      id: pipeline.id,
      name: pipeline.name,
      description: pipeline.description,
      created_at: pipeline.created_at?.toISOString(),
      updated_at: pipeline.updated_at?.toISOString(),
    });
  } catch (error) {
    console.error("Error creating pipeline:", error);
    return NextResponse.json({ error: "Failed to create pipeline" }, { status: 500 });
  }
}
