'use client';

import { useState, useSyncExternalStore } from 'react';
import { ChevronDownIcon, CodeIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CopyButton } from '@/components/ui/copy-button';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { cn, getOrigin } from '@/lib/utils';

// SSR-safe origin hook using useSyncExternalStore
const emptySubscribe = () => () => {};
const getOriginSnapshot = () => getOrigin();
const getOriginServerSnapshot = () => '';

interface EmbedInstructionsProps {
  pipelineId: string;
}

/**
 * Collapsible embed instructions with URL and iframe code snippet.
 */
export function EmbedInstructions({ pipelineId }: EmbedInstructionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const origin = useSyncExternalStore(emptySubscribe, getOriginSnapshot, getOriginServerSnapshot);

  const embedUrl = `${origin}/embed/${pipelineId}`;

  const iframeCode = `<iframe
  src="${embedUrl}"
  width="400"
  height="600"
  frameborder="0"
/>`;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2">
        <CodeIcon className="size-4" />
        <span>Embed instructions</span>
        <ChevronDownIcon
          className={cn('size-4 transition-transform', isOpen && 'rotate-180')}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Widget URL</p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={embedUrl}
              className="h-8 font-mono text-xs"
            />
            <CopyButton content={embedUrl} variant="outline" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Iframe embed</p>
          <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap break-all">
            {iframeCode}
          </pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
