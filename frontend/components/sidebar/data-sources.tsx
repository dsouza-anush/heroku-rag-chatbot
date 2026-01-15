'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, AlertCircle, Database, ChevronDown, X } from 'lucide-react';
import {
  indexUrlForPipeline,
  getPipelineStatus,
  getPipelineIndexProgress,
  deletePipelineIndexedUrl,
  IndexedUrl,
  IndexProgress,
} from '@/lib/api';
import { cn, getDomain, isValidHttpUrl } from '@/lib/utils';
import { POLL_INTERVAL_INDEXING_MS, POLL_INTERVAL_IDLE_MS } from '@/lib/constants/polling';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface DataSourcesProps {
  pipelineId: string;
  /** Optional: receive data from parent to avoid duplicate polling */
  indexedUrls?: IndexedUrl[];
  totalChunks?: number;
  /** Callback to trigger parent refresh after indexing/delete */
  onRefresh?: () => void;
  onStatusChange?: () => void;
}

export function DataSources({
  pipelineId,
  indexedUrls: propsIndexedUrls,
  totalChunks: propsTotalChunks,
  onRefresh,
  onStatusChange
}: DataSourcesProps) {
  const [url, setUrl] = useState('');
  // Use props if provided, otherwise maintain local state with polling
  const [localIndexedUrls, setLocalIndexedUrls] = useState<IndexedUrl[]>([]);
  const [localTotalChunks, setLocalTotalChunks] = useState(0);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingUrl, setIndexingUrl] = useState<string | null>(null);
  const [indexingProgress, setIndexingProgress] = useState<IndexProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine which data to use
  const indexedUrls = propsIndexedUrls ?? localIndexedUrls;
  const totalChunks = propsTotalChunks ?? localTotalChunks;
  const isPropsMode = propsIndexedUrls !== undefined;

  const fetchStatus = useCallback(async () => {
    // Skip if parent provides data via props
    if (isPropsMode || !pipelineId) return;
    try {
      const status = await getPipelineStatus(pipelineId);
      setLocalIndexedUrls(status.indexed_urls || []);
      setLocalTotalChunks(status.total_chunks || 0);
      onStatusChange?.();
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  }, [pipelineId, onStatusChange, isPropsMode]);

  // Use ref to avoid stale closure
  const fetchStatusRef = useRef(fetchStatus);
  useEffect(() => { fetchStatusRef.current = fetchStatus; }, [fetchStatus]);

  // Only poll if NOT in props mode
  useEffect(() => {
    if (isPropsMode) return;
    fetchStatusRef.current();
    const interval = setInterval(() => fetchStatusRef.current(), POLL_INTERVAL_IDLE_MS);
    return () => clearInterval(interval);
  }, [isPropsMode]);

  useEffect(() => {
    if (!indexingUrl || !pipelineId) return;

    const checkProgress = async () => {
      try {
        const progress = await getPipelineIndexProgress(pipelineId, indexingUrl);
        setIndexingProgress(progress);

        if (progress.status === 'complete' || progress.status === 'error') {
          setIsIndexing(false);
          setIndexingUrl(null);
          setIndexingProgress(null);
          // Trigger refresh - either parent or local
          if (onRefresh) {
            onRefresh();
          } else {
            fetchStatusRef.current();
          }
        }
      } catch (err) {
        console.error('Failed to check progress:', err);
      }
    };

    const interval = setInterval(checkProgress, POLL_INTERVAL_INDEXING_MS);
    return () => clearInterval(interval);
  }, [indexingUrl, pipelineId, onRefresh]);

  const handleIndex = async () => {
    if (!url.trim() || !pipelineId) return;

    // Validate URL format and protocol
    if (!isValidHttpUrl(url.trim())) {
      setError('Please enter a valid HTTP or HTTPS URL');
      return;
    }

    setError(null);
    setIsIndexing(true);
    setIndexingUrl(url);

    try {
      const result = await indexUrlForPipeline(pipelineId, url.trim());
      if (result.status === 'error') {
        setError(result.message);
        setIsIndexing(false);
        setIndexingUrl(null);
      }
      setUrl('');
    } catch {
      setError('Failed to start indexing');
      setIsIndexing(false);
      setIndexingUrl(null);
    }
  };

  const handleDelete = async (urlToDelete: string) => {
    if (!pipelineId) return;
    try {
      await deletePipelineIndexedUrl(pipelineId, urlToDelete);
      // Trigger refresh - either parent or local
      if (onRefresh) {
        onRefresh();
      } else {
        fetchStatusRef.current();
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">Indexed Sources</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Index documentation URLs</p>
      </div>

      {/* URL Input */}
      <div className="p-4 space-y-3 border-b border-border">
        <Input
          type="url"
          placeholder="https://docs.example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleIndex()}
          disabled={isIndexing}
        />
        <Button
          onClick={handleIndex}
          disabled={isIndexing || !url.trim()}
          className="w-full"
        >
          {isIndexing ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Indexing...
            </>
          ) : (
            'Index URL'
          )}
        </Button>
        {error && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="size-3.5" />
            {error}
          </p>
        )}
      </div>

      {/* Indexing Progress */}
      {isIndexing && indexingProgress && (
        <div className="p-4 border-b border-border animate-fade-in">
          <div className="p-3 rounded-lg bg-muted border border-border">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium text-foreground">Indexing in progress</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 truncate">{indexingUrl}</p>
            {indexingProgress.pages_indexed !== undefined && (
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span><span className="font-medium text-foreground">{indexingProgress.pages_indexed}</span> pages</span>
                <span className="text-border">•</span>
                <span><span className="font-medium text-foreground">{indexingProgress.chunks_created || 0}</span> chunks</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Indexed Sources - Collapsible */}
      <div className="overflow-y-auto">
        <div className="p-4">
          {indexedUrls.length === 0 ? (
            <div className="text-center py-8">
              <div className="size-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Database className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No sources indexed</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Add a URL above to get started</p>
            </div>
          ) : (
            <div>
              {/* Collapsible header */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Database className="size-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">
                      {indexedUrls.length} source{indexedUrls.length > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">{totalChunks} chunks indexed</p>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    'size-4 text-muted-foreground transition-transform duration-200',
                    isExpanded && 'rotate-180'
                  )}
                />
              </button>

              {/* Expanded list */}
              {isExpanded && (
                <div className="mt-2 space-y-2 animate-fade-in">
                  {indexedUrls.map((item) => (
                    <div
                      key={item.url}
                      className="group p-3 rounded-lg bg-muted hover:bg-accent border border-border transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {getDomain(item.url)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{item.chunk_count} chunks</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(item.url)}
                          className="opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          title="Remove source"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* RAG Pipeline - inside collapsible */}
                  <div className="pt-3 mt-3 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">RAG Pipeline</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="muted">Cohere Embed</Badge>
                      <Badge variant="muted">pgvector</Badge>
                      <Badge variant="muted">Rerank</Badge>
                      <Badge variant="muted">Claude</Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
