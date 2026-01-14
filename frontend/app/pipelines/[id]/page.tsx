'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, Settings2Icon } from 'lucide-react';
import { getPipeline, Pipeline, PipelineSettings, DEFAULT_PIPELINE_SETTINGS, updatePipelineSettings, Source } from '@/lib/api';
import { ChatContainer } from '@/components/chat/chat-container';
import { DataSources } from '@/components/sidebar/data-sources';
import { CitationsPanel } from '@/components/citations/citations-panel';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const RIGHT_SIDEBAR_STORAGE_KEY = 'heroku-ai-search-right-sidebar';

interface PipelinePageProps {
  params: Promise<{ id: string }>;
}

export default function PipelinePage({ params }: PipelinePageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sources, setSources] = useState<Source[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<'idle' | 'embedding' | 'searching' | 'reranking' | 'generating'>('idle');
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Retrieval settings with defaults
  const settings = pipeline?.settings || {};
  const topN = settings.topN ?? DEFAULT_PIPELINE_SETTINGS.topN;
  const useReranking = settings.useReranking ?? DEFAULT_PIPELINE_SETTINGS.useReranking;

  const handleSettingsChange = async (newSettings: Partial<PipelineSettings>) => {
    if (!pipeline) return;
    try {
      const updated = await updatePipelineSettings(id, newSettings);
      setPipeline(updated);
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(RIGHT_SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      setIsRightSidebarCollapsed(stored === 'collapsed');
    }
  }, []);

  // Save sidebar state to localStorage
  const toggleRightSidebar = () => {
    const newState = !isRightSidebarCollapsed;
    setIsRightSidebarCollapsed(newState);
    if (typeof window !== 'undefined') {
      localStorage.setItem(RIGHT_SIDEBAR_STORAGE_KEY, newState ? 'collapsed' : 'expanded');
    }
  };

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

  const handleSourcesChange = (newSources: Source[]) => {
    setSources(newSources);
  };

  const handleLoadingChange = (loading: boolean, step?: 'embedding' | 'searching' | 'reranking' | 'generating') => {
    setIsChatLoading(loading);
    setPipelineStep(loading && step ? step : 'idle');
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="size-2 rounded-full bg-primary animate-pulse" />
          <span>Loading pipeline...</span>
        </div>
      </div>
    );
  }

  if (!pipeline) {
    return null;
  }

  return (
    <div className="flex h-full relative">
      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <ChatContainer
          pipelineId={id}
          onSourcesChange={handleSourcesChange}
          onLoadingChange={handleLoadingChange}
        />
      </main>

      {/* Right Sidebar - Data Sources & Citations */}
      <aside
        className={cn(
          'border-l border-border shrink-0 overflow-hidden flex flex-col transition-all duration-300 ease-in-out bg-card',
          isRightSidebarCollapsed ? 'w-0' : 'hidden sm:block sm:w-80'
        )}
      >
        {!isRightSidebarCollapsed && (
          <>
            {/* Retrieval Settings Section - Top */}
            <div className="border-b border-border px-4 py-3">
              <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
                  <Settings2Icon className="size-4" />
                  <span>Retrieval</span>
                  <ChevronDownIcon className={cn("size-4 ml-auto transition-transform", settingsOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  {/* Sources per answer */}
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Sources per answer</label>
                    <Select
                      value={String(topN)}
                      onValueChange={(v) => handleSettingsChange({ topN: Number(v) })}
                    >
                      <SelectTrigger className="w-full h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 sources</SelectItem>
                        <SelectItem value="5">5 sources</SelectItem>
                        <SelectItem value="10">10 sources</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Reranking toggle */}
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">Use reranking</label>
                    <Switch
                      checked={useReranking}
                      onCheckedChange={(checked) => handleSettingsChange({ useReranking: checked })}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Data Sources Section */}
            <div className="overflow-hidden shrink-0">
              <DataSources pipelineId={id} />
            </div>

            {/* Citations Section */}
            <div className="border-t border-border flex-1 min-h-[200px] overflow-hidden">
              <CitationsPanel
                sources={sources}
                isLoading={isChatLoading}
                pipelineStep={pipelineStep}
              />
            </div>
          </>
        )}
      </aside>

      {/* Toggle Button - Fixed position */}
      <button
        type="button"
        onClick={toggleRightSidebar}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-12 sm:w-5 sm:h-10 bg-muted/50 border border-border border-r-0 rounded-l-md hover:bg-muted transition-colors"
        aria-label={isRightSidebarCollapsed ? 'Show citations sidebar' : 'Hide citations sidebar'}
        aria-expanded={!isRightSidebarCollapsed}
      >
        {isRightSidebarCollapsed ? (
          <ChevronLeftIcon className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRightIcon className="size-4 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}
