'use client';

import {
  Loader2Icon,
  AlertCircleIcon,
  ChevronDownIcon,
  InfoIcon,
  Settings2Icon,
} from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { DATA_SOURCES, type DataSourceType } from '@/components/pipeline/constants';

interface IndexDocumentationCardProps {
  sourceType: DataSourceType;
  onSourceTypeChange: (value: DataSourceType) => void;
  url: string;
  onUrlChange: (value: string) => void;
  onSubmit: () => void;
  isIndexing: boolean;
  error?: string | null;
  settingsOpen: boolean;
  onSettingsOpenChange: (open: boolean) => void;
  chunkSize: number;
  maxPages: number;
  onChunkSizeChange: (value: number) => void;
  onMaxPagesChange: (value: number) => void;
}

export function IndexDocumentationCard({
  sourceType,
  onSourceTypeChange,
  url,
  onUrlChange,
  onSubmit,
  isIndexing,
  error,
  settingsOpen,
  onSettingsOpenChange,
  chunkSize,
  maxPages,
  onChunkSizeChange,
  onMaxPagesChange,
}: IndexDocumentationCardProps) {
  const selectedSource = DATA_SOURCES.find(s => s.value === sourceType) ?? DATA_SOURCES[0];

  return (
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
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={sourceType} onValueChange={(v) => onSourceTypeChange(v as DataSourceType)}>
            <SelectTrigger className="w-full sm:w-36 shrink-0">
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
                      <Badge variant="secondary" className="ml-1 text-2xs px-1.5 py-0">Soon</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="url"
            placeholder={selectedSource.placeholder}
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && selectedSource.available && onSubmit()}
            disabled={isIndexing || !selectedSource.available}
            className="flex-1 bg-background border-border"
          />
        </div>

        {!selectedSource.available && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <InfoIcon className="size-4" />
            {selectedSource.label} integration coming soon
          </p>
        )}

        <Button
          onClick={onSubmit}
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

        {error && (
          <p className="text-sm text-destructive flex items-center gap-1.5">
            <AlertCircleIcon className="size-4" />
            {error}
          </p>
        )}

        <Collapsible open={settingsOpen} onOpenChange={onSettingsOpenChange}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2 border-t border-border/50">
            <Settings2Icon className="size-4" />
            <span>Indexing settings</span>
            <ChevronDownIcon className={cn("size-4 ml-auto transition-transform", settingsOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Chunk size</label>
              <Select
                value={String(chunkSize)}
                onValueChange={(v) => onChunkSizeChange(Number(v))}
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

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Max pages to crawl</label>
              <Select
                value={String(maxPages)}
                onValueChange={(v) => onMaxPagesChange(Number(v))}
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
  );
}
