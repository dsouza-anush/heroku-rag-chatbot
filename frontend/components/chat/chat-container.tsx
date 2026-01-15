'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Source } from '@/lib/api';
import { cn } from '@/lib/utils';
import { MarkdownRenderer, getMessageFontSizeClass } from '@/components/markdown-renderer';
import { MiaLogo } from '@/components/icons/mia-logo';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { LoadingDots } from '@/components/ui/loading-dots';
import { SuggestionButton } from '@/components/ui/suggestion-button';
import type { ChatSuggestion } from './types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

interface ChatContainerProps {
  pipelineId: string;
  onSourcesChange?: (sources: Source[]) => void;
  onLoadingChange?: (loading: boolean, step?: 'embedding' | 'searching' | 'reranking' | 'generating') => void;
  /** Compact mode for widget embedding - constrains height and simplifies layout */
  compact?: boolean;
  /** Custom suggestions based on indexed content */
  suggestions?: ChatSuggestion[];
}

const defaultSuggestions: ChatSuggestion[] = [
  { label: 'How do I get started?', query: 'How do I get started?' },
  { label: 'What are the main features?', query: 'What are the main features?' },
  { label: 'Show me an example', query: 'Show me an example of how to use this' },
];

export function ChatContainer({ pipelineId, onSourcesChange, onLoadingChange, compact = false, suggestions }: ChatContainerProps) {
  const activeSuggestions = suggestions && suggestions.length > 0 ? suggestions : defaultSuggestions;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');
    onLoadingChange?.(true, 'embedding');

    let sources: Source[] = [];
    let fullContent = '';

    try {
      const response = await fetch(`/api/pipelines/${pipelineId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content, stream: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            continue;
          }
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.step) {
                onLoadingChange?.(true, data.step);
              } else if (data.sources) {
                sources = data.sources;
                onSourcesChange?.(data.sources);
              } else if (data.content !== undefined) {
                fullContent += data.content;
                setStreamingContent(fullContent);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      // Add the complete assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullContent,
        sources,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setStreamingContent('');
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
      setStreamingContent('');
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className={cn('mx-auto max-w-3xl px-3 sm:px-4 lg:px-6', compact ? 'py-4' : 'py-8')}>
          {messages.length === 0 && !streamingContent ? (
            <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'py-8' : 'min-h-[60vh]')}>
              <div className={compact ? 'space-y-4' : 'space-y-8'}>
                <div className={cn('flex items-center justify-center rounded-2xl bg-muted mx-auto', compact ? 'size-10' : 'size-14')}>
                  <MiaLogo iconOnly className={cn('text-primary', compact ? 'size-5' : 'size-7')} />
                </div>
                <div className="space-y-2">
                  <h1 className={cn('font-semibold text-foreground tracking-tight', compact ? 'text-lg' : 'text-2xl')}>
                    {compact ? 'Ask a question' : 'Chat with Your Docs'}
                  </h1>
                  {!compact && (
                    <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
                      Index any documentation site, then ask questions. Powered by Cohere embeddings, Heroku pgvector, and Claude.
                    </p>
                  )}
                </div>
                <div className={cn('flex flex-wrap justify-center gap-2', !compact && 'pt-4')}>
                  {activeSuggestions.map((suggestion, i) => (
                    <SuggestionButton
                      key={i}
                      onClick={() => setInput(suggestion.query)}
                      size={compact ? 'sm' : 'default'}
                    >
                      {suggestion.label}
                    </SuggestionButton>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-0">
              {messages.map((message, index) => {
                const needsSeparator = message.role === 'assistant' &&
                  index < messages.length - 1;

                return (
                  <div
                    key={message.id}
                    className={cn(needsSeparator && 'mb-6 pb-6 border-b border-border')}
                  >
                    <div
                      className={cn(
                        'flex w-full items-start gap-3 py-3 animate-fade-in',
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted">
                          <MiaLogo iconOnly className="size-4 text-primary" />
                        </div>
                      )}

                      <div
                        className={cn(
                          'group/message relative max-w-[85%] rounded-md px-4 py-2.5 shadow-sm',
                          message.role === 'user'
                            ? 'bg-accent/80 text-foreground'
                            : 'bg-transparent'
                        )}
                      >
                        {message.role === 'user' ? (
                          <div className={cn('prose prose-sm sm:prose-base prose-neutral dark:prose-invert max-w-none prose-p:my-0 font-sans font-normal', getMessageFontSizeClass(message.content))}>
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          </div>
                        ) : (
                          <MarkdownRenderer content={message.content} />
                        )}

                        {/* Action buttons for assistant messages */}
                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-0.5 mt-3 -ml-1.5 opacity-100 sm:opacity-0 sm:group-hover/message:opacity-100 transition-opacity duration-200">
                            <CopyButton content={message.content} className="size-9 sm:size-7" />
                          </div>
                        )}

                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs text-muted-foreground mb-2">
                              {message.sources.length} source{message.sources.length > 1 ? 's' : ''} cited
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {message.sources.map((source, i) => (
                                <a
                                  key={i}
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted hover:bg-muted-foreground/10 border border-border text-xs transition-colors"
                                >
                                  <span className="font-medium text-secondary">[{i + 1}]</span>
                                  <span className="truncate max-w-32 text-foreground">{source.title || 'Source'}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Streaming content */}
              {streamingContent && (
                <div className="flex w-full items-start gap-3 py-3 justify-start animate-fade-in">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <MiaLogo iconOnly className="size-4 text-primary" />
                  </div>
                  <div className="max-w-[85%]">
                    <MarkdownRenderer content={streamingContent} />
                  </div>
                </div>
              )}

              {/* Loading indicator (before streaming starts) */}
              {isLoading && !streamingContent && (
                <div className="flex w-full items-start gap-3 py-3 justify-start animate-fade-in">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <MiaLogo iconOnly className="size-4 text-primary" />
                  </div>
                  <div className="bg-secondary/80 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-sm">
                    <LoadingDots />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Input - Unified box with glass effect */}
      <div className="border-t border-border/50 bg-background/80 backdrop-blur-xl px-4 lg:px-6 py-4">
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
          <div className="relative rounded-2xl border border-input bg-muted/30 shadow-sm focus-within:ring-[3px] focus-within:ring-ring/50 focus-within:border-ring focus-within:bg-background/80 focus-within:shadow-md transition-all duration-200">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your indexed docs..."
              disabled={isLoading}
              rows={1}
              className="w-full resize-none bg-transparent px-4 pt-3 pb-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 min-h-16 max-h-52"
            />
            <div className="absolute bottom-2.5 right-2.5">
              <Button
                type="submit"
                size="icon-sm"
                disabled={isLoading || !input.trim()}
                aria-label={isLoading ? 'Sending message' : 'Send message'}
                className="rounded-xl"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
