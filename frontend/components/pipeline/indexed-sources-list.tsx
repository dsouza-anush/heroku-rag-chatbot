'use client';

import { useState } from 'react';
import { ChevronDownIcon, DatabaseIcon, Trash2Icon } from 'lucide-react';
import { IndexedUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';

interface IndexedSourcesListProps {
  indexedUrls: IndexedUrl[];
  totalChunks: number;
  onDelete: (url: string) => void;
}

/**
 * Collapsible list of indexed data sources with delete functionality.
 */
export function IndexedSourcesList({
  indexedUrls,
  totalChunks,
  onDelete,
}: IndexedSourcesListProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getUrlPath = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.pathname + parsed.search;
    } catch {
      return url;
    }
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-muted flex items-center justify-center">
                  <DatabaseIcon className="size-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-base font-semibold tracking-tight">
                  Indexed Sources
                  {indexedUrls.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({indexedUrls.length})
                    </span>
                  )}
                </CardTitle>
              </div>
              <ChevronDownIcon
                className={cn(
                  'size-4 text-muted-foreground transition-transform',
                  isOpen && 'rotate-180'
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {indexedUrls.length === 0 ? (
              <div className="py-6 text-center">
                <div className="size-10 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
                  <DatabaseIcon className="size-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No sources indexed yet
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Add a URL above to get started
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border rounded-md border">
                {indexedUrls.map((item) => (
                  <div
                    key={item.url}
                    className="group flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50 transition-colors"
                  >
                    <p className="text-sm text-foreground truncate flex-1 min-w-0">
                      {getUrlPath(item.url)}
                    </p>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {item.chunk_count} chunks
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.url);
                      }}
                      className="size-9 sm:size-7 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
