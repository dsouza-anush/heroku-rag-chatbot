import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

export const sql = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: "require",
});

// Pipeline operations
export async function createPipeline(name: string, description?: string) {
  const [row] = await sql`
    INSERT INTO pipelines (name, description)
    VALUES (${name}, ${description ?? null})
    RETURNING id, name, description, created_at, updated_at
  `;
  return row;
}

export async function getPipelines() {
  return sql`
    SELECT p.id, p.name, p.description, p.settings, p.created_at, p.updated_at,
           COUNT(c.id)::int as chunk_count
    FROM pipelines p
    LEFT JOIN chunks c ON c.pipeline_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `;
}

export async function getPipeline(pipelineId: string) {
  const [row] = await sql`
    SELECT p.id, p.name, p.description, p.settings, p.created_at, p.updated_at,
           COUNT(c.id)::int as chunk_count
    FROM pipelines p
    LEFT JOIN chunks c ON c.pipeline_id = p.id
    WHERE p.id = ${pipelineId}::uuid
    GROUP BY p.id
  `;
  return row ?? null;
}

export async function deletePipeline(pipelineId: string) {
  const result = await sql`
    DELETE FROM pipelines WHERE id = ${pipelineId}::uuid
  `;
  return result.count > 0;
}

export interface PipelineSettings {
  chunkSize?: number;      // default: 1000
  maxPages?: number;       // default: 20
  topN?: number;           // default: 5
  useReranking?: boolean;  // default: true
}

export async function updatePipeline(
  pipelineId: string,
  name: string,
  description?: string,
  settings?: PipelineSettings
) {
  const [row] = await sql`
    UPDATE pipelines
    SET name = ${name},
        description = ${description ?? null},
        settings = COALESCE(settings, '{}')::jsonb || ${JSON.stringify(settings ?? {})}::jsonb,
        updated_at = NOW()
    WHERE id = ${pipelineId}::uuid
    RETURNING id, name, description, settings, created_at, updated_at
  `;
  return row ?? null;
}

export async function updatePipelineSettings(pipelineId: string, settings: PipelineSettings) {
  const [row] = await sql`
    UPDATE pipelines
    SET settings = COALESCE(settings, '{}')::jsonb || ${JSON.stringify(settings)}::jsonb,
        updated_at = NOW()
    WHERE id = ${pipelineId}::uuid
    RETURNING id, name, description, settings, created_at, updated_at
  `;
  return row ?? null;
}

// Chunk operations
export async function insertChunksBatch(
  pipelineId: string,
  chunks: Array<{ url: string; title: string; content: string; embedding: number[] }>
) {
  if (chunks.length === 0) return;

  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    await sql`
      INSERT INTO chunks (pipeline_id, url, title, content, embedding)
      SELECT
        ${pipelineId}::uuid,
        unnest(${sql.array(batch.map((c) => c.url))}::text[]),
        unnest(${sql.array(batch.map((c) => c.title))}::text[]),
        unnest(${sql.array(batch.map((c) => c.content))}::text[]),
        unnest(${sql.array(batch.map((c) => `[${c.embedding.join(",")}]`))}::vector[])
    `;
  }
}

export async function searchChunks(
  pipelineId: string,
  queryEmbedding: number[],
  limit: number = 20
) {
  // Format the embedding as a vector string for pgvector
  const vectorStr = `[${queryEmbedding.join(",")}]`;
  return sql`
    SELECT id, url, title, content,
           1 - (embedding <=> ${vectorStr}::vector) as similarity
    FROM chunks
    WHERE pipeline_id = ${pipelineId}::uuid
    ORDER BY embedding <=> ${vectorStr}::vector
    LIMIT ${limit}
  `;
}

export async function getIndexedUrls(pipelineId: string) {
  return sql`
    SELECT url, COUNT(*)::int as chunk_count, MAX(created_at) as last_indexed
    FROM chunks
    WHERE pipeline_id = ${pipelineId}::uuid
    GROUP BY url
    ORDER BY last_indexed DESC
  `;
}

export async function getTotalChunks(pipelineId: string) {
  const [row] = await sql`
    SELECT COUNT(*)::int as count FROM chunks WHERE pipeline_id = ${pipelineId}::uuid
  `;
  return row?.count ?? 0;
}

export async function deleteByUrl(pipelineId: string, url: string) {
  // Escape LIKE special characters to prevent unintended pattern matching
  const escapedUrl = url.replace(/[%_\\]/g, '\\$&');
  const result = await sql`
    DELETE FROM chunks
    WHERE pipeline_id = ${pipelineId}::uuid AND url LIKE ${escapedUrl + "%"}
  `;
  return result.count;
}
