import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deletePipelineIndexedUrl,
  getPipelineIndexProgress,
  getPipelineStatus,
  indexUrlForPipeline,
  type IndexedUrl,
  type IndexProgress,
} from '@/lib/api';
import {
  ERROR_CLEAR_DELAY_MS,
  MAX_NOT_FOUND_RETRIES,
  MAX_POLL_ERRORS,
  POLL_INTERVAL_IDLE_MS,
  POLL_INTERVAL_INDEXING_MS,
  POLL_MAX_INTERVAL_MS,
  PROGRESS_CLEAR_DELAY_MS,
} from '@/lib/constants';

type StatusPollingOptions = {
  enabled?: boolean;
  idleIntervalMs?: number;
  indexingIntervalMs?: number;
  useBackoff?: boolean;
  maxIntervalMs?: number;
  maxErrors?: number;
};

type ProgressPollingOptions = {
  enabled?: boolean;
  intervalMs?: number;
  maxNotFoundRetries?: number;
  progressClearDelayMs?: number;
  errorClearDelayMs?: number;
};

type UsePipelineIndexingOptions = {
  pipelineId: string;
  clearIndexingOnResponse?: boolean;
  statusPolling?: StatusPollingOptions;
  progressPolling?: ProgressPollingOptions;
  onStatusChange?: (indexedUrls: IndexedUrl[], totalChunks: number) => void;
};

type StartIndexingOptions = {
  maxPages?: number;
  refreshStatus?: boolean;
};

type DeleteUrlOptions = {
  refreshStatus?: boolean;
};

export function usePipelineIndexing({
  pipelineId,
  clearIndexingOnResponse = true,
  statusPolling,
  progressPolling,
  onStatusChange,
}: UsePipelineIndexingOptions) {
  const [indexedUrls, setIndexedUrls] = useState<IndexedUrl[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingUrl, setIndexingUrl] = useState<string | null>(null);
  const [indexingProgress, setIndexingProgress] = useState<IndexProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollErrorCount, setPollErrorCount] = useState(0);

  const statusConfig: Required<StatusPollingOptions> = {
    enabled: true,
    idleIntervalMs: POLL_INTERVAL_IDLE_MS,
    indexingIntervalMs: POLL_INTERVAL_INDEXING_MS,
    useBackoff: true,
    maxIntervalMs: POLL_MAX_INTERVAL_MS,
    maxErrors: MAX_POLL_ERRORS,
    ...statusPolling,
  };

  const progressConfig: Required<ProgressPollingOptions> = {
    enabled: true,
    intervalMs: POLL_INTERVAL_INDEXING_MS,
    maxNotFoundRetries: MAX_NOT_FOUND_RETRIES,
    progressClearDelayMs: PROGRESS_CLEAR_DELAY_MS,
    errorClearDelayMs: ERROR_CLEAR_DELAY_MS,
    ...progressPolling,
  };

  const fetchStatus = useCallback(async () => {
    if (!pipelineId) return;
    try {
      const status = await getPipelineStatus(pipelineId);
      setIndexedUrls(status.indexed_urls || []);
      setTotalChunks(status.total_chunks || 0);
      if (statusConfig.useBackoff) {
        setPollErrorCount(0);
      }
      onStatusChange?.(status.indexed_urls || [], status.total_chunks || 0);
    } catch (err) {
      console.error('Failed to fetch status:', err);
      if (statusConfig.useBackoff) {
        setPollErrorCount((prev) => prev + 1);
      }
    }
  }, [pipelineId, onStatusChange, statusConfig.useBackoff]);

  const fetchStatusRef = useRef(fetchStatus);
  useEffect(() => {
    fetchStatusRef.current = fetchStatus;
  }, [fetchStatus]);

  useEffect(() => {
    if (!statusConfig.enabled || !pipelineId) return;
    if (statusConfig.useBackoff && pollErrorCount >= statusConfig.maxErrors) return;

    const poll = () => fetchStatusRef.current();
    poll();

    const baseInterval = isIndexing ? statusConfig.indexingIntervalMs : statusConfig.idleIntervalMs;
    const interval = statusConfig.useBackoff
      ? Math.min(baseInterval * Math.pow(2, pollErrorCount), statusConfig.maxIntervalMs)
      : baseInterval;

    const timer = setInterval(poll, interval);
    return () => clearInterval(timer);
  }, [
    pipelineId,
    statusConfig.enabled,
    statusConfig.idleIntervalMs,
    statusConfig.indexingIntervalMs,
    statusConfig.maxErrors,
    statusConfig.maxIntervalMs,
    statusConfig.useBackoff,
    isIndexing,
    pollErrorCount,
  ]);

  useEffect(() => {
    if (!progressConfig.enabled || !isIndexing || !indexingUrl || !pipelineId) return;

    let notFoundCount = 0;

    const pollProgress = async () => {
      try {
        const progress = await getPipelineIndexProgress(pipelineId, indexingUrl);
        setIndexingProgress(progress);

        if (progress.status === 'complete') {
          setIsIndexing(false);
          setIndexingUrl(null);
          if (statusConfig.enabled) {
            fetchStatusRef.current();
          }
          setTimeout(() => setIndexingProgress(null), progressConfig.progressClearDelayMs);
        } else if (progress.status === 'error') {
          setIsIndexing(false);
          setIndexingUrl(null);
          setError(progress.message || 'Indexing failed');
          setTimeout(() => setIndexingProgress(null), progressConfig.errorClearDelayMs);
        } else if (progress.status === 'not_found') {
          notFoundCount += 1;
          if (notFoundCount >= progressConfig.maxNotFoundRetries) {
            setIsIndexing(false);
            setIndexingUrl(null);
            setIndexingProgress(null);
            if (statusConfig.enabled) {
              fetchStatusRef.current();
            }
          }
        } else {
          notFoundCount = 0;
        }
      } catch (err) {
        console.error('Failed to fetch progress:', err);
      }
    };

    pollProgress();
    const timer = setInterval(pollProgress, progressConfig.intervalMs);
    return () => clearInterval(timer);
  }, [
    pipelineId,
    indexingUrl,
    isIndexing,
    progressConfig.enabled,
    progressConfig.intervalMs,
    progressConfig.maxNotFoundRetries,
    progressConfig.progressClearDelayMs,
    progressConfig.errorClearDelayMs,
    statusConfig.enabled,
  ]);

  const startIndexing = useCallback(
    async (url: string, options: StartIndexingOptions = {}) => {
      if (!pipelineId) return null;

      setError(null);
      setIsIndexing(true);
      setIndexingUrl(url);
      setIndexingProgress(null);

      try {
        const result = await indexUrlForPipeline(pipelineId, url, options.maxPages);

        if (result.status === 'error') {
          setError(result.message || 'Indexing failed');
          setIsIndexing(false);
          setIndexingUrl(null);
          return result;
        }

        if (options.refreshStatus !== false) {
          await fetchStatusRef.current();
        }

        if (clearIndexingOnResponse) {
          setIsIndexing(false);
          setIndexingUrl(null);
          setIndexingProgress(null);
        }

        return result;
      } catch {
        setError('Failed to index URL');
        setIsIndexing(false);
        setIndexingUrl(null);
        setIndexingProgress(null);
        return null;
      }
    },
    [pipelineId, clearIndexingOnResponse]
  );

  const deleteUrl = useCallback(
    async (url: string, options: DeleteUrlOptions = {}) => {
      if (!pipelineId) return;
      try {
        await deletePipelineIndexedUrl(pipelineId, url);
        if (options.refreshStatus !== false) {
          fetchStatusRef.current();
        }
      } catch (err) {
        console.error('Failed to delete:', err);
      }
    },
    [pipelineId]
  );

  return {
    indexedUrls,
    totalChunks,
    isIndexing,
    indexingUrl,
    indexingProgress,
    error,
    setError,
    startIndexing,
    deleteUrl,
    fetchStatus,
  };
}
