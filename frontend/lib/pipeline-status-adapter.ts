/**
 * Pipeline Status Adapter
 *
 * Estimates pipeline stages from limited IndexProgress API data.
 * The backend only provides status, pages_indexed, and chunks_created.
 * This adapter infers which stage the pipeline is in based on these metrics.
 */

import { IndexProgress } from '@/lib/api';

// Stage status enum
export type StageStatus = 'idle' | 'queued' | 'running' | 'success' | 'failed';

// Individual pipeline stage
export interface PipelineStage {
  id: string;
  label: string;
  description: string;
  status: StageStatus;
  order: number;
}

// Complete pipeline run state
export interface PipelineRunState {
  stages: PipelineStage[];
  currentStageIndex: number;
  overallStatus: 'idle' | 'running' | 'complete' | 'error';
  metrics: {
    pagesIndexed: number;
    chunksCreated: number;
  };
}

// Stage definitions
const PIPELINE_STAGE_DEFS = [
  { id: 'accepted', label: 'Source Accepted', description: 'URL validated and accepted' },
  { id: 'fetch', label: 'Fetch / Crawl', description: 'Crawling pages from source' },
  { id: 'parse', label: 'Parse & Clean', description: 'Extracting and cleaning content' },
  { id: 'chunk', label: 'Chunk', description: 'Splitting into semantic chunks' },
  { id: 'embed', label: 'Embed', description: 'Generating vector embeddings' },
  { id: 'store', label: 'Store (pgvector)', description: 'Storing in vector database' },
  { id: 'ready', label: 'Ready', description: 'Indexed and ready for queries' },
] as const;

export const PIPELINE_STAGES = PIPELINE_STAGE_DEFS;

/**
 * Estimates the current pipeline stage based on available metrics.
 *
 * Heuristics:
 * - pages=0, chunks=0: Still in fetch/crawl phase (stage 1)
 * - pages>0, chunks=0: Parsing in progress (stage 2)
 * - chunks < pages*10: Chunking in progress (stage 3)
 * - chunks growing: Embedding (stage 4)
 * - chunks stable & >0: Storing (stage 5)
 */
export function estimatePipelineStages(
  progress: IndexProgress | null,
  isActivelyIndexing: boolean = false
): PipelineRunState {
  // Default idle state
  if (!progress) {
    // If we're actively indexing but have no progress yet, show early stage
    if (isActivelyIndexing) {
      return estimateRunningState(0, 0);
    }
    return createIdleState();
  }

  const { status, pages_indexed = 0, chunks_created = 0 } = progress;

  // Handle terminal states
  if (status === 'error') {
    return createErrorState(pages_indexed, chunks_created);
  }

  if (status === 'complete') {
    return createCompleteState(pages_indexed, chunks_created);
  }

  // 'not_found' during active indexing means progress API doesn't exist
  // but indexing is happening - show running state
  if (status === 'not_found') {
    if (isActivelyIndexing) {
      return estimateRunningState(pages_indexed, chunks_created);
    }
    return createIdleState();
  }

  // status === 'indexing' - estimate current stage based on metrics
  return estimateRunningState(pages_indexed, chunks_created);
}

function estimateRunningState(pagesIndexed: number, chunksCreated: number): PipelineRunState {
  let currentStageIndex: number;

  // Stage estimation based on metrics
  if (pagesIndexed === 0 && chunksCreated === 0) {
    // Just started - source accepted, now fetching
    currentStageIndex = 1; // Fetch/Crawl
  } else if (pagesIndexed > 0 && chunksCreated === 0) {
    // Pages found but no chunks yet - parsing
    currentStageIndex = 2; // Parse & Clean
  } else if (chunksCreated > 0 && chunksCreated < pagesIndexed * 5) {
    // Some chunks created but still growing - chunking phase
    currentStageIndex = 3; // Chunk
  } else if (chunksCreated >= pagesIndexed * 5 && chunksCreated < pagesIndexed * 15) {
    // Significant chunks, likely embedding
    currentStageIndex = 4; // Embed
  } else {
    // Lots of chunks - storing phase
    currentStageIndex = 5; // Store
  }

  return {
    stages: PIPELINE_STAGE_DEFS.map((stage, index) => ({
      ...stage,
      order: index,
      status: getStageStatus(index, currentStageIndex),
    })),
    currentStageIndex,
    overallStatus: 'running',
    metrics: { pagesIndexed, chunksCreated },
  };
}

function getStageStatus(stageIndex: number, currentIndex: number): StageStatus {
  if (stageIndex < currentIndex) return 'success';
  if (stageIndex === currentIndex) return 'running';
  if (stageIndex === currentIndex + 1) return 'queued';
  return 'idle';
}

function createIdleState(): PipelineRunState {
  return {
    stages: PIPELINE_STAGE_DEFS.map((stage, index) => ({
      ...stage,
      order: index,
      status: index === 0 ? 'queued' : 'idle',
    })),
    currentStageIndex: -1,
    overallStatus: 'idle',
    metrics: { pagesIndexed: 0, chunksCreated: 0 },
  };
}

function createCompleteState(pagesIndexed: number, chunksCreated: number): PipelineRunState {
  return {
    stages: PIPELINE_STAGE_DEFS.map((stage, index) => ({
      ...stage,
      order: index,
      status: 'success',
    })),
    currentStageIndex: PIPELINE_STAGE_DEFS.length - 1,
    overallStatus: 'complete',
    metrics: { pagesIndexed, chunksCreated },
  };
}

function createErrorState(pagesIndexed: number, chunksCreated: number): PipelineRunState {
  // Determine which stage likely failed based on metrics
  let failedIndex = 1; // Default to fetch stage
  if (pagesIndexed > 0) {
    failedIndex = chunksCreated > 0 ? 4 : 2; // Failed at embed or parse
  }

  return {
    stages: PIPELINE_STAGE_DEFS.map((stage, index) => ({
      ...stage,
      order: index,
      status: index < failedIndex ? 'success' : index === failedIndex ? 'failed' : 'idle',
    })),
    currentStageIndex: failedIndex,
    overallStatus: 'error',
    metrics: { pagesIndexed, chunksCreated },
  };
}
