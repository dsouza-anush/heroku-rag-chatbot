// API client for Next.js API routes

const API_BASE = '';

export interface Source {
  url: string;
  title: string;
  snippet: string;
}

export interface ChatResponse {
  answer: string;
  sources: Source[];
}

export interface IndexedUrl {
  url: string;
  chunk_count: number;
}

export interface IndexStatus {
  indexed_urls: IndexedUrl[];
  total_chunks: number;
}

export interface IndexProgress {
  status: 'indexing' | 'complete' | 'error' | 'not_found';
  progress?: string;
  pages_indexed?: number;
  chunks_created?: number;
  message?: string;
}

// Pipeline settings
export interface PipelineSettings {
  chunkSize?: number;      // default: 1000
  maxPages?: number;       // default: 20
  topN?: number;           // default: 5
  useReranking?: boolean;  // default: true
}

export const DEFAULT_PIPELINE_SETTINGS: PipelineSettings = {
  chunkSize: 1000,
  maxPages: 20,
  topN: 5,
  useReranking: true,
};

// Pipeline types
export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  settings?: PipelineSettings;
  created_at?: string;
  updated_at?: string;
}

// Pipeline API functions

export async function getPipelines(): Promise<Pipeline[]> {
  const response = await fetch(`${API_BASE}/api/pipelines`);
  if (!response.ok) {
    throw new Error('Failed to fetch pipelines');
  }
  return response.json();
}

export async function createPipeline(name: string, description?: string): Promise<Pipeline> {
  const response = await fetch(`${API_BASE}/api/pipelines`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  });
  if (!response.ok) {
    throw new Error('Failed to create pipeline');
  }
  return response.json();
}

export async function getPipeline(id: string): Promise<Pipeline | null> {
  const response = await fetch(`${API_BASE}/api/pipelines/${id}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error('Failed to fetch pipeline');
  }
  return response.json();
}

export async function deletePipeline(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/pipelines/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete pipeline');
  }
}

export async function updatePipeline(
  id: string,
  name: string,
  description?: string,
  settings?: PipelineSettings
): Promise<Pipeline> {
  const response = await fetch(`${API_BASE}/api/pipelines/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, settings }),
  });
  if (!response.ok) {
    throw new Error('Failed to update pipeline');
  }
  return response.json();
}

export async function updatePipelineSettings(
  id: string,
  settings: PipelineSettings
): Promise<Pipeline> {
  const response = await fetch(`${API_BASE}/api/pipelines/${id}/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!response.ok) {
    throw new Error('Failed to update pipeline settings');
  }
  return response.json();
}

// Pipeline-scoped index/chat functions
export async function indexUrlForPipeline(
  pipelineId: string,
  url: string,
  maxPages: number = 5
): Promise<{ status: string; message: string; pagesIndexed?: number; chunksCreated?: number }> {
  // Use sync mode to wait for completion
  const response = await fetch(`${API_BASE}/api/pipelines/${pipelineId}/index`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, max_pages: maxPages, sync: true }),
  });
  if (!response.ok) {
    throw new Error('Failed to index URL');
  }
  return response.json();
}

export async function getPipelineStatus(pipelineId: string): Promise<IndexStatus> {
  const response = await fetch(`${API_BASE}/api/pipelines/${pipelineId}/status`);
  if (!response.ok) {
    throw new Error('Failed to fetch pipeline status');
  }
  return response.json();
}

export async function getPipelineIndexProgress(pipelineId: string, url: string): Promise<IndexProgress> {
  const response = await fetch(`${API_BASE}/api/pipelines/${pipelineId}/index/progress/${encodeURIComponent(url)}`);

  // Handle 404 - progress endpoint may not exist or URL not found
  if (response.status === 404) {
    return { status: 'not_found' };
  }

  if (!response.ok) {
    return { status: 'error', message: `HTTP ${response.status}` };
  }

  return response.json();
}

export async function deletePipelineIndexedUrl(pipelineId: string, url: string): Promise<{ status: string; chunks_deleted: number }> {
  const response = await fetch(`${API_BASE}/api/pipelines/${pipelineId}/index?url=${encodeURIComponent(url)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete indexed URL');
  }
  return response.json();
}

export async function chatWithPipeline(pipelineId: string, message: string): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/api/pipelines/${pipelineId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) {
    throw new Error('Failed to send chat message');
  }
  return response.json();
}

