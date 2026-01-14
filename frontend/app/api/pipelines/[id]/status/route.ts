import { NextRequest, NextResponse } from "next/server";
import { getPipeline, getIndexedUrls, getTotalChunks } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/pipelines/:id/status
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

    const urls = await getIndexedUrls(id);
    const totalChunks = await getTotalChunks(id);

    return NextResponse.json({
      indexed_urls: urls.map((u) => ({
        url: u.url,
        chunk_count: u.chunk_count,
      })),
      total_chunks: totalChunks,
    });
  } catch (error) {
    console.error("Error fetching status:", error);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
