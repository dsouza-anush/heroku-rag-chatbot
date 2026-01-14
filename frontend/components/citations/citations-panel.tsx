'use client';

import { useState } from 'react';
import { FileText, ChevronDown, ExternalLink } from 'lucide-react';
import { Source } from '@/lib/api';
import { cn, getDomain } from '@/lib/utils';

interface CitationsPanelProps {
  sources: Source[];
  isLoading?: boolean;
  pipelineStep?: 'idle' | 'embedding' | 'searching' | 'reranking' | 'generating';
}

export function CitationsPanel({ sources, isLoading, pipelineStep = 'idle' }: CitationsPanelProps) {
  const [expandedSource, setExpandedSource] = useState<number | null>(null);

  const getStepLabel = (step: string) => {
    const labels: Record<string, string> = {
      embedding: 'Embedding query...',
      searching: 'Searching documents...',
      reranking: 'Reranking results...',
      generating: 'Generating response...',
    };
    return labels[step] || '';
  };

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">Citations</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Citations from indexed content</p>
      </div>

      {/* Pipeline Progress - Minimal */}
      {isLoading && pipelineStep !== 'idle' && (
        <div className="p-4 border-b border-border animate-fade-in">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border">
            <div className="size-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-foreground">{getStepLabel(pipelineStep)}</span>
          </div>
        </div>
      )}

      {/* Sources List - Collapsible */}
      <div className="flex-1 overflow-y-auto p-4">
        {sources.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="size-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              <FileText className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No sources yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Ask a question to see citations</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sources.map((source, index) => {
              const isExpanded = expandedSource === index;
              return (
                <div
                  key={`${source.url}-${index}`}
                  className="rounded-lg bg-muted border border-border transition-all animate-fade-in overflow-hidden"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Collapsed header - always visible */}
                  <button
                    onClick={() => setExpandedSource(isExpanded ? null : index)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left"
                  >
                    <div className="size-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{index + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {source.title || 'Untitled'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {getDomain(source.url)}
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        'size-4 text-muted-foreground transition-transform duration-200 shrink-0',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-3 pb-3 animate-fade-in">
                      <div className="pl-10">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {source.snippet}
                        </p>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2 font-medium"
                        >
                          View source
                          <ExternalLink className="size-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
