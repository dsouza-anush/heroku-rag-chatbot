'use client';

import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatContainer } from '@/components/chat/chat-container';
import { MiaLogo } from '@/components/icons/mia-logo';
import { cn } from '@/lib/utils';
import type { ChatSuggestion } from '@/components/chat/types';

interface ChatWidgetPreviewProps {
  pipelineId: string;
  pipelineName: string;
  isOpen: boolean;
  isActivated: boolean;
  suggestions?: ChatSuggestion[];
  onOpen: () => void;
  onClose: () => void;
}

/**
 * Floating chat widget preview with minimized bubble state.
 */
export function ChatWidgetPreview({
  pipelineId,
  pipelineName,
  isOpen,
  isActivated,
  suggestions,
  onOpen,
  onClose,
}: ChatWidgetPreviewProps) {
  return (
    <>
      {/* Expanded Widget */}
      {isOpen && (
        <div
          className={cn(
            'fixed z-50',
            // Mobile: full screen with padding, Desktop: fixed size
            'inset-4 sm:inset-auto sm:bottom-6 sm:right-6',
            'sm:w-[400px] sm:h-[560px]',
            'flex flex-col overflow-hidden',
            'rounded-2xl border-2 border-border',
            'bg-card shadow-2xl',
            'animate-scale-in'
          )}
        >
          {/* Widget Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <MiaLogo className="size-9 rounded-lg" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {pipelineName}
                </p>
                <p className="text-xs text-muted-foreground">Widget preview</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="size-8 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
          {/* Chat Container */}
          <div className="flex-1 overflow-hidden bg-card">
            <ChatContainer
              pipelineId={pipelineId}
              compact
              suggestions={suggestions}
            />
          </div>
        </div>
      )}

      {/* Minimized Floating Bubble */}
      {isActivated && !isOpen && (
        <button
          onClick={onOpen}
          className={cn(
            'fixed bottom-6 right-6 z-50',
            'flex size-14 items-center justify-center',
            'rounded-full bg-primary text-primary-foreground',
            'shadow-lg hover:shadow-xl',
            'hover:scale-105 active:scale-95',
            'transition-all duration-200 animate-scale-in'
          )}
        >
          <MiaLogo iconOnly className="size-6" />
        </button>
      )}
    </>
  );
}
