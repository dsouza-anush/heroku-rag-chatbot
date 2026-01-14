import { NextRequest, NextResponse } from "next/server";
import { getPipeline, deleteByUrl } from "@/lib/db";
import { NotFoundError, jsonResponse } from "@/lib/errors";

interface RouteContext {
  params: Promise<{ id: string; docId: string }>;
}

// DELETE /api/v1/knowledge-bases/:id/documents/:docId - Delete a document
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id, docId } = await context.params;

  const pipeline = await getPipeline(id);
  if (!pipeline) {
    throw new NotFoundError("Knowledge Base", id);
  }

  // Decode the docId back to URL
  const url = Buffer.from(docId, "base64url").toString();

  const deletedCount = await deleteByUrl(id, url);

  return jsonResponse({
    status: "deleted",
    chunksDeleted: deletedCount,
  });
}
