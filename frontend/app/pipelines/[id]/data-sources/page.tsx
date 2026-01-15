'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  getPipeline,
  Pipeline,
  PipelineSettings,
  DEFAULT_PIPELINE_SETTINGS,
  deletePipeline,
  updatePipeline,
  updatePipelineSettings,
} from '@/lib/api';
import { toast } from 'sonner';
import {
  estimatePipelineStages,
  PipelineRunState,
} from '@/lib/pipeline-status-adapter';
import { usePipelineIndexing } from '@/hooks/use-pipeline-indexing';
import { isValidHttpUrl } from '@/lib/utils';
import {
  IndexedSourcesList,
  IndexDocumentationCard,
  ChatbotWidgetCard,
  ChatWidgetPreview,
  ApiReferenceCard,
  PipelineRunCard,
  PipelineHeader,
  type DataSourceType,
} from '@/components/pipeline';

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
  const [url, setUrl] = useState('');
  const {
    indexedUrls,
    isIndexing,
    indexingUrl,
    indexingProgress,
    error,
    setError,
    startIndexing,
    deleteUrl,
  } = usePipelineIndexing({ pipelineId: id });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showChatWidget, setShowChatWidget] = useState(false);
  const [widgetActivated, setWidgetActivated] = useState(false);

  // Settings with defaults
  const settings = pipeline?.settings || {};
  const chunkSize = settings.chunkSize ?? DEFAULT_PIPELINE_SETTINGS.chunkSize ?? 1000;
  const maxPages = settings.maxPages ?? DEFAULT_PIPELINE_SETTINGS.maxPages ?? 20;

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

    const result = await startIndexing(url.trim(), { maxPages });

    if (result?.status === 'complete') {
      const updatedPipeline = await getPipeline(id);
      if (updatedPipeline) {
        setPipeline(updatedPipeline);
        window.dispatchEvent(new CustomEvent('pipeline-updated'));
      }
    }

    if (result) {
      setUrl('');
    }
  };

  const handleDelete = async (urlToDelete: string) => {
    await deleteUrl(urlToDelete);
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
      <PipelineHeader
        pipeline={pipeline}
        isEditingName={isEditingName}
        editingName={editingName}
        isSavingName={isSavingName}
        onNameChange={setEditingName}
        onNameKeyDown={handleNameKeyDown}
        onSaveName={saveNameEdit}
        onCancelEdit={cancelEditingName}
        onStartEdit={startEditingName}
        onDeletePipeline={handleDeletePipeline}
      />

      {/* Main Content - Two-Column Grid */}
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 lg:p-8">
          <IndexDocumentationCard
            sourceType={sourceType}
            onSourceTypeChange={setSourceType}
            url={url}
            onUrlChange={setUrl}
            onSubmit={handleIndex}
            isIndexing={isIndexing}
            error={error}
            settingsOpen={settingsOpen}
            onSettingsOpenChange={setSettingsOpen}
            chunkSize={chunkSize}
            maxPages={maxPages}
            onChunkSizeChange={(value) => handleSettingsChange({ chunkSize: value })}
            onMaxPagesChange={(value) => handleSettingsChange({ maxPages: value })}
          />

          <ChatbotWidgetCard
            pipelineId={id}
            canTest={indexedUrls.length > 0}
            isOpen={showChatWidget}
            onToggle={() => showChatWidget ? closeWidget() : openWidget()}
          />

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
