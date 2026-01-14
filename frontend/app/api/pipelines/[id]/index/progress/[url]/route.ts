import { NextRequest, NextResponse } from "next/server";
import { getProgress } from "../../route";

interface RouteContext {
  params: Promise<{ id: string; url: string }>;
}

// GET /api/pipelines/:id/index/progress/:url
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id, url } = await context.params;
  const decodedUrl = decodeURIComponent(url);

  const progress = getProgress(id, decodedUrl);

  if (!progress) {
    return NextResponse.json({ status: "not_found" });
  }

  return NextResponse.json({
    status: progress.status,
    progress: progress.progress,
    pages_indexed: progress.pagesIndexed,
    chunks_created: progress.chunksCreated,
    message: progress.message,
  });
}
