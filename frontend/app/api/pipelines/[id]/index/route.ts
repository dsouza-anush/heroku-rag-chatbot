import { NextRequest, NextResponse } from "next/server";
import { getPipeline, insertChunksBatch, deleteByUrl, updatePipeline, getIndexedUrls } from "@/lib/db";
import { embedTexts } from "@/lib/ai";
import { crawlUrl, prepareForIndexing } from "@/lib/crawler";

// Force Node.js runtime instead of Edge
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for long indexing jobs

// Generate a pipeline name from a URL
function generatePipelineNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Get hostname without www
    const hostname = parsed.hostname.replace(/^www\./, '');
    // Capitalize first letter of each segment
    const parts = hostname.split('.');
    // Use the main domain name (e.g., "heroku" from "devcenter.heroku.com")
    const mainPart = parts.length > 2 ? parts[parts.length - 2] : parts[0];
    // Capitalize and add "Docs" suffix
    const capitalized = mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
    return `${capitalized} Docs`;
  } catch {
    return 'Documentation';
  }
}

// Check if name is a default auto-generated name
function isDefaultPipelineName(name: string): boolean {
  return /^Pipeline \d+$/.test(name);
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// In-memory indexing progress (in production, use Redis or database)
const indexingProgress = new Map<
  string,
  {
    status: "indexing" | "complete" | "error";
    progress: string;
    pagesIndexed: number;
    chunksCreated: number;
    message?: string;
  }
>();

// Cleanup delay for completed/errored entries (5 minutes)
const PROGRESS_CLEANUP_DELAY_MS = 5 * 60 * 1000;

// Schedule cleanup of progress entry after completion
function scheduleProgressCleanup(progressKey: string): void {
  setTimeout(() => {
    indexingProgress.delete(progressKey);
  }, PROGRESS_CLEANUP_DELAY_MS);
}

// POST /api/pipelines/:id/index - Start indexing
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const pipeline = await getPipeline(id);
    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    const { url, max_pages, sync = false } = await request.json();

    // Use pipeline settings with fallback to request params then defaults
    const settings = pipeline.settings || {};
    const maxPages = max_pages ?? settings.maxPages ?? 20;
    const chunkSize = settings.chunkSize ?? 1000;

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const progressKey = `${id}:${url}`;

    // Check for concurrent indexing of the same URL (race condition prevention)
    const existingProgress = indexingProgress.get(progressKey);
    if (existingProgress && existingProgress.status === "indexing") {
      return NextResponse.json(
        { error: "This URL is already being indexed" },
        { status: 409 }
      );
    }

    // Initialize progress
    indexingProgress.set(progressKey, {
      status: "indexing",
      progress: "Starting crawl...",
      pagesIndexed: 0,
      chunksCreated: 0,
    });

    // If sync mode, wait for completion (for debugging/testing)
    if (sync) {
      try {
        console.log("[Index API] Starting SYNC indexing for:", url);
        await indexUrl(id, url, maxPages, chunkSize, progressKey);
        const finalProgress = indexingProgress.get(progressKey);
        console.log("[Index API] SYNC complete:", finalProgress);
        return NextResponse.json({
          status: finalProgress?.status || "complete",
          message: finalProgress?.progress || "Indexing complete",
          pagesIndexed: finalProgress?.pagesIndexed,
          chunksCreated: finalProgress?.chunksCreated,
        });
      } catch (error) {
        console.error("[Index API] SYNC error:", error);
        return NextResponse.json({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        }, { status: 500 });
      }
    }

    // Start indexing in background (async mode)
    console.log("[Index API] Starting ASYNC indexing for:", url);
    indexUrl(id, url, maxPages, chunkSize, progressKey).catch((error) => {
      console.error("Indexing error:", error);
      const progress = indexingProgress.get(progressKey);
      if (progress) {
        progress.status = "error";
        progress.message = error.message;
      }
    });

    return NextResponse.json({
      status: "indexing",
      message: `Started indexing ${url}`,
    });
  } catch (error) {
    console.error("Error starting indexing:", error);
    return NextResponse.json({ error: "Failed to start indexing" }, { status: 500 });
  }
}

async function indexUrl(
  pipelineId: string,
  url: string,
  maxPages: number,
  chunkSize: number,
  progressKey: string
): Promise<void> {
  const progress = indexingProgress.get(progressKey);
  if (!progress) return;

  try {
    // Crawl the URL
    progress.progress = "Crawling pages...";
    const pages = await crawlUrl(url, {
      maxPages,
      onProgress: (p) => {
        progress.pagesIndexed = p.crawled;
        progress.progress = `Crawled ${p.crawled}/${p.total || "?"} pages`;
      },
    });

    if (pages.length === 0) {
      progress.status = "error";
      progress.progress = "Could not extract content from this URL";
      progress.message = "The page may be protected, require authentication, or use JavaScript rendering that we couldn't process.";
      progress.chunksCreated = 0;
      scheduleProgressCleanup(progressKey);
      return;
    }

    // Prepare chunks with configured chunk size
    progress.progress = "Preparing chunks...";
    const chunks = prepareForIndexing(pages, { chunkSize });

    // Generate embeddings
    // Note: Using small batch size to avoid WAF blocks on large payloads
    progress.progress = "Generating embeddings...";
    const batchSize = 3;
    const chunksWithEmbeddings: Array<{
      url: string;
      title: string;
      content: string;
      embedding: number[];
    }> = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const embeddings = await embedTexts(batch.map((c) => c.content));

      for (let j = 0; j < batch.length; j++) {
        chunksWithEmbeddings.push({
          url: batch[j].url,
          title: batch[j].title,
          content: batch[j].content,
          embedding: embeddings[j],
        });
      }

      progress.progress = `Embedded ${Math.min(i + batchSize, chunks.length)}/${chunks.length} chunks`;
    }

    // Insert into database
    progress.progress = "Storing in database...";
    await insertChunksBatch(pipelineId, chunksWithEmbeddings);

    progress.status = "complete";
    progress.chunksCreated = chunksWithEmbeddings.length;
    progress.progress = `Indexed ${pages.length} pages, created ${chunksWithEmbeddings.length} chunks`;

    // Schedule cleanup to prevent memory leak
    scheduleProgressCleanup(progressKey);

    // Auto-name pipeline if this is the first indexed URL and name is default
    try {
      const pipeline = await getPipeline(pipelineId);
      const indexedUrls = await getIndexedUrls(pipelineId);
      // If this is the first/only URL and pipeline has default name, auto-rename
      if (pipeline && isDefaultPipelineName(pipeline.name) && indexedUrls.length === 1) {
        const newName = generatePipelineNameFromUrl(url);
        await updatePipeline(pipelineId, newName, pipeline.description);
      }
    } catch (error) {
      console.error("Error auto-naming pipeline:", error);
      // Non-fatal, continue
    }
  } catch (error) {
    progress.status = "error";
    progress.message = error instanceof Error ? error.message : "Unknown error";
    scheduleProgressCleanup(progressKey);
    throw error;
  }
}

// Export for progress checking
export function getProgress(pipelineId: string, url: string) {
  return indexingProgress.get(`${pipelineId}:${url}`);
}

// DELETE handler for removing indexed URLs
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const url = request.nextUrl.searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const deletedCount = await deleteByUrl(id, url);

    return NextResponse.json({
      status: "deleted",
      chunks_deleted: deletedCount,
    });
  } catch (error) {
    console.error("Error deleting indexed URL:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
