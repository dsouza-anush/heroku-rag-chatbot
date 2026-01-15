'use client';

import { use, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2Icon,
  AlertCircleIcon,
  Trash2Icon,
  ChevronDownIcon,
  CheckIcon,
  XIcon,
  PencilIcon,
  InfoIcon,
  Settings2Icon,
} from 'lucide-react';
import {
  getPipeline,
  Pipeline,
  PipelineSettings,
  DEFAULT_PIPELINE_SETTINGS,
  indexUrlForPipeline,
  getPipelineStatus,
  getPipelineIndexProgress,
  deletePipelineIndexedUrl,
  deletePipeline,
  updatePipeline,
  updatePipelineSettings,
  IndexedUrl,
  IndexProgress,
} from '@/lib/api';
import { toast } from 'sonner';
import {
  estimatePipelineStages,
  PipelineRunState,
} from '@/lib/pipeline-status-adapter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, stringToGradient, isValidHttpUrl } from '@/lib/utils';
import {
  IndexedSourcesList,
  EmbedInstructions,
  ChatWidgetPreview,
  ApiReferenceCard,
  PipelineRunCard,
  DATA_SOURCES,
  type DataSourceType,
} from '@/components/pipeline';
import {
  POLL_INTERVAL_INDEXING_MS,
  POLL_INTERVAL_IDLE_MS,
  POLL_MAX_INTERVAL_MS,
  MAX_POLL_ERRORS,
  MAX_NOT_FOUND_RETRIES,
  PROGRESS_CLEAR_DELAY_MS,
  ERROR_CLEAR_DELAY_MS,
} from '@/lib/constants/polling';

interface DataSourcesPageProps {
  params: Promise<{ id: string }>;
}

export default function DataSourcesPage({ params }: DataSourcesPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Data sources state
  const [sourceType, setSourceType] = useState<DataSourceType>('url');
  const selectedSource = DATA_SOURCES.find(s => s.value === sourceType) ?? DATA_SOURCES[0];
  const [url, setUrl] = useState('');
  const [indexedUrls, setIndexedUrls] = useState<IndexedUrl[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingUrl, setIndexingUrl] = useState<string | null>(null);
  const [indexingProgress, setIndexingProgress] = useState<IndexProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showChatWidget, setShowChatWidget] = useState(false);
  const [widgetActivated, setWidgetActivated] = useState(false);
  const [pollErrorCount, setPollErrorCount] = useState(0);

  // Settings with defaults
  const settings = pipeline?.settings || {};
  const chunkSize = settings.chunkSize ?? DEFAULT_PIPELINE_SETTINGS.chunkSize;
  const maxPages = settings.maxPages ?? DEFAULT_PIPELINE_SETTINGS.maxPages;

  const handleSettingsChange = async (newSettings: Partial<PipelineSettings>) => {
    if (!pipeline) return;
    try {
      const updated = await updatePipelineSettings(id, newSettings);
      setPipeline(updated);
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  // Name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  const startEditingName = () => {
    if (pipeline) {
      setEditingName(pipeline.name);
      setIsEditingName(true);
    }
  };

  const cancelEditingName = () => {
    setIsEditingName(false);
    setEditingName('');
  };

  const saveNameEdit = async () => {
    if (!pipeline || !editingName.trim()) return;
    if (editingName.trim() === pipeline.name) {
      cancelEditingName();
      return;
    }

    setIsSavingName(true);
    try {
      const updated = await updatePipeline(id, editingName.trim(), pipeline.description);
      setPipeline(updated);
      setIsEditingName(false);
      // Trigger sidebar refresh
      window.dispatchEvent(new CustomEvent('pipeline-updated'));
    } catch (err) {
      console.error('Failed to update name:', err);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveNameEdit();
    } else if (e.key === 'Escape') {
      cancelEditingName();
    }
  };

  const openWidget = () => {
    setShowChatWidget(true);
    setWidgetActivated(true);
  };

  const closeWidget = () => {
    setShowChatWidget(false);
    // widgetActivated stays true so the bubble shows
  };

  // Pipeline stages - dynamically calculated from real progress
  const pipelineState = useMemo<PipelineRunState | null>(() => {
    if (!isIndexing) return null;
    return estimatePipelineStages(indexingProgress, isIndexing);
  }, [isIndexing, indexingProgress]);

  useEffect(() => {
    const fetchPipeline = async () => {
      try {
        const data = await getPipeline(id);
        if (!data) {
          router.push('/pipelines');
          return;
        }
        setPipeline(data);
      } catch (error) {
        console.error('Failed to fetch pipeline:', error);
        router.push('/pipelines');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPipeline();
  }, [id, router]);

  const fetchStatus = useCallback(async () => {
    if (!id || pollErrorCount >= MAX_POLL_ERRORS) return;
    try {
      const status = await getPipelineStatus(id);
      setIndexedUrls(status.indexed_urls || []);
      setPollErrorCount(0); // Reset on success
    } catch (err) {
      console.error('Failed to fetch status:', err);
      setPollErrorCount(prev => prev + 1);
    }
  }, [id, pollErrorCount]);

  // Use ref to avoid stale closure in polling interval
  const fetchStatusRef = useRef(fetchStatus);
  useEffect(() => { fetchStatusRef.current = fetchStatus; }, [fetchStatus]);

  // Poll status more frequently during indexing, check for completion
  useEffect(() => {
    const poll = () => fetchStatusRef.current();
    poll();
    // Base interval with exponential backoff on errors
    const baseInterval = isIndexing ? POLL_INTERVAL_INDEXING_MS : POLL_INTERVAL_IDLE_MS;
    const interval = Math.min(baseInterval * Math.pow(2, pollErrorCount), POLL_MAX_INTERVAL_MS);
    const timer = setInterval(poll, interval);
    return () => clearInterval(timer);
  }, [isIndexing, pollErrorCount]);

  // Poll progress API to detect completion or errors
  useEffect(() => {
    if (!isIndexing || !indexingUrl || !id) return;

    let notFoundCount = 0;

    const pollProgress = async () => {
      try {
        const progress = await getPipelineIndexProgress(id, indexingUrl);
        setIndexingProgress(progress);

        if (progress.status === 'complete') {
          setIsIndexing(false);
          setIndexingUrl(null);
          fetchStatusRef.current();
          const updatedPipeline = await getPipeline(id);
          if (updatedPipeline) {
            setPipeline(updatedPipeline);
            window.dispatchEvent(new CustomEvent('pipeline-updated'));
          }
          setTimeout(() => setIndexingProgress(null), PROGRESS_CLEAR_DELAY_MS);
        } else if (progress.status === 'error') {
          setIsIndexing(false);
          setIndexingUrl(null);
          setError(progress.message || 'Indexing failed');
          setTimeout(() => setIndexingProgress(null), ERROR_CLEAR_DELAY_MS);
        } else if (progress.status === 'not_found') {
          notFoundCount++;
          if (notFoundCount >= MAX_NOT_FOUND_RETRIES) {
            setIsIndexing(false);
            setIndexingUrl(null);
            setIndexingProgress(null);
            fetchStatusRef.current();
          }
        } else {
          notFoundCount = 0;
        }
      } catch (err) {
        console.error('Failed to fetch progress:', err);
      }
    };

    pollProgress();
    const interval = setInterval(pollProgress, POLL_INTERVAL_INDEXING_MS);
    return () => clearInterval(interval);
  }, [isIndexing, indexingUrl, id]); // Removed fetchStatus - using ref instead

  const handleDeletePipeline = async () => {
    if (!pipeline) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${pipeline.name}"? This will remove all indexed data and cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deletePipeline(id);
      toast.success(`Deleted "${pipeline.name}"`);
      window.dispatchEvent(new CustomEvent('pipeline-updated'));
      router.push('/pipelines');
    } catch (err) {
      console.error('Failed to delete pipeline:', err);
      toast.error('Failed to delete pipeline');
    }
  };

  const handleIndex = async () => {
    if (!url.trim() || !id) return;

    // Validate URL format and protocol
    if (!isValidHttpUrl(url.trim())) {
      setError('Please enter a valid HTTP or HTTPS URL');
      return;
    }

    setError(null);
    setIsIndexing(true);
    setIndexingUrl(url);

    try {
      // Sync mode - waits for completion
      const result = await indexUrlForPipeline(id, url.trim());

      if (result.status === 'error') {
        setError(result.message || 'Indexing failed');
      } else if (result.status === 'complete') {
        // Success - refresh status and pipeline data
        await fetchStatusRef.current();
        const updatedPipeline = await getPipeline(id);
        if (updatedPipeline) {
          setPipeline(updatedPipeline);
          window.dispatchEvent(new CustomEvent('pipeline-updated'));
        }
      }

      setUrl('');
    } catch {
      setError('Failed to index URL');
    } finally {
      setIsIndexing(false);
      setIndexingUrl(null);
      setIndexingProgress(null);
    }
  };

  const handleDelete = async (urlToDelete: string) => {
    if (!id) return;
    try {
      await deletePipelineIndexedUrl(id, urlToDelete);
      fetchStatusRef.current();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  // Generate dynamic suggestions based on indexed URLs
  const getWidgetSuggestions = () => {
    if (indexedUrls.length === 0) return undefined;

    // Extract domain/topic from first indexed URL
    try {
      const firstUrl = indexedUrls[0].url;
      const parsed = new URL(firstUrl);
      const hostname = parsed.hostname.replace(/^www\./, '');
      const parts = hostname.split('.');
      const topic = parts.length > 2 ? parts[parts.length - 2] : parts[0];
      const capitalizedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);

      return [
        { label: `What is ${capitalizedTopic}?`, query: `What is ${capitalizedTopic} and what does it do?` },
        { label: 'How do I get started?', query: 'How do I get started? Give me a quick overview.' },
        { label: 'Show me examples', query: 'Show me some examples and code snippets' },
      ];
    } catch {
      return undefined;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="size-2 rounded-full bg-foreground/30 animate-pulse" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!pipeline) {
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header - no border, glass effect */}
      <div className="bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
        <div className="px-4 py-3">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={handleNameKeyDown}
                autoFocus
                className="h-8 text-sm font-medium max-w-xs"
                disabled={isSavingName}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={saveNameEdit}
                disabled={isSavingName}
                className="size-7"
              >
                {isSavingName ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <CheckIcon className="size-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={cancelEditingName}
                disabled={isSavingName}
                className="size-7"
              >
                <XIcon className="size-4" />
              </Button>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-accent rounded-md px-2 py-1.5 transition-colors outline-none w-fit">
                {/* Colored avatar */}
                <div
                  className="size-6 rounded-md shrink-0"
                  style={{ background: stringToGradient(pipeline.id) }}
                />
                {/* Title */}
                <span className="text-sm font-medium text-foreground truncate max-w-[140px] sm:max-w-[200px]">
                  {pipeline.name}
                </span>
                {/* Chevron */}
                <ChevronDownIcon className="size-4 text-muted-foreground shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem onClick={startEditingName} className="cursor-pointer gap-2">
                  <PencilIcon className="size-4" />
                  <span>Edit title</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDeletePipeline}
                  className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2Icon className="size-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Main Content - Two-Column Grid */}
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 lg:p-8">
            {/* Step 1: Index Documentation */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-sm font-bold text-muted-foreground">1</span>
                  </div>
                  <CardTitle className="text-base font-semibold tracking-tight">Index Documentation</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Row 1: Source type dropdown + Input */}
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Dropdown - full width on mobile, fixed on desktop */}
                  <Select value={sourceType} onValueChange={(v) => setSourceType(v as DataSourceType)}>
                    <SelectTrigger className="w-full sm:w-[140px] shrink-0">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <selectedSource.icon className="size-4" />
                          <span>{selectedSource.label}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {DATA_SOURCES.map((source) => (
                        <SelectItem key={source.value} value={source.value}>
                          <div className="flex items-center gap-2">
                            <source.icon className="size-4" />
                            <span>{source.label}</span>
                            {!source.available && (
                              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">Soon</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Input - flex grow with higher contrast */}
                  <Input
                    type="url"
                    placeholder={selectedSource.placeholder}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && selectedSource.available && handleIndex()}
                    disabled={isIndexing || !selectedSource.available}
                    className="flex-1 bg-background border-border"
                  />
                </div>

                {/* Coming soon message for unavailable sources */}
                {!selectedSource.available && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <InfoIcon className="size-4" />
                    {selectedSource.label} integration coming soon
                  </p>
                )}

                {/* Row 2: Submit button */}
                <Button
                  onClick={handleIndex}
                  disabled={isIndexing || !url.trim() || !selectedSource.available}
                  variant="secondary"
                  className="w-full"
                >
                  {isIndexing ? (
                    <span className="flex items-center gap-2">
                      <Loader2Icon className="size-4 animate-spin" />
                      Indexing...
                    </span>
                  ) : (
                    `Index ${selectedSource.label}`
                  )}
                </Button>

                {/* Error message */}
                {error && (
                  <p className="text-sm text-destructive flex items-center gap-1.5">
                    <AlertCircleIcon className="size-4" />
                    {error}
                  </p>
                )}

                {/* Indexing Settings - collapsible inside the card */}
                <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2 border-t border-border/50">
                    <Settings2Icon className="size-4" />
                    <span>Indexing settings</span>
                    <ChevronDownIcon className={cn("size-4 ml-auto transition-transform", settingsOpen && "rotate-180")} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-4">
                    {/* Chunk Size */}
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Chunk size</label>
                      <Select
                        value={String(chunkSize)}
                        onValueChange={(v) => handleSettingsChange({ chunkSize: Number(v) })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="500">Small (500 chars)</SelectItem>
                          <SelectItem value="1000">Medium (1000 chars)</SelectItem>
                          <SelectItem value="2000">Large (2000 chars)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground/70">Smaller chunks = more precise, larger = more context</p>
                    </div>

                    {/* Max Pages */}
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Max pages to crawl</label>
                      <Select
                        value={String(maxPages)}
                        onValueChange={(v) => handleSettingsChange({ maxPages: Number(v) })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 pages</SelectItem>
                          <SelectItem value="20">20 pages</SelectItem>
                          <SelectItem value="50">50 pages</SelectItem>
                          <SelectItem value="100">100 pages</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground/70">Limit how many pages are crawled from a URL</p>
                    </div>

                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <InfoIcon className="size-3" />
                      Settings apply to new indexing jobs
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

          {/* Step 2: Chatbot Widget Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-sm font-bold text-muted-foreground">2</span>
                  </div>
                  <CardTitle className="text-base font-semibold tracking-tight">Chatbot Widget</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => showChatWidget ? closeWidget() : openWidget()}
                  variant="outline"
                  disabled={indexedUrls.length === 0}
                >
                  {showChatWidget ? 'Hide Widget' : 'Test Widget'}
                </Button>

                {/* Embed instructions */}
                <EmbedInstructions pipelineId={id} />
              </CardContent>
            </Card>

          {/* Row 2: Indexed Sources */}
          <IndexedSourcesList
            indexedUrls={indexedUrls}
            onDelete={handleDelete}
          />

          {/* Row 2: API Reference Card */}
          <ApiReferenceCard pipelineId={id} />

          {/* Pipeline Run - spans full width when indexing */}
          {isIndexing && indexingUrl && pipelineState && (
            <div className="lg:col-span-2">
              <PipelineRunCard url={indexingUrl} state={pipelineState} />
            </div>
          )}
        </div>
      </div>

      {/* Floating Chat Widget */}
      <ChatWidgetPreview
        pipelineId={id}
        pipelineName={pipeline.name}
        isOpen={showChatWidget}
        isActivated={widgetActivated}
        suggestions={getWidgetSuggestions()}
        onOpen={openWidget}
        onClose={closeWidget}
      />
    </div>
  );
}
