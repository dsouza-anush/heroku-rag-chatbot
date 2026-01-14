'use client';

import { useState, useSyncExternalStore } from 'react';
import { ChevronDownIcon, TerminalIcon } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
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
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { cn, getOrigin } from '@/lib/utils';

// SSR-safe origin hook using useSyncExternalStore
const emptySubscribe = () => () => {};
const getOriginSnapshot = () => getOrigin();
const getOriginServerSnapshot = () => '';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  description: string;
  example?: string;
}

interface ApiReferenceCardProps {
  pipelineId: string;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

/**
 * Card displaying API endpoints for programmatic access to the knowledge base.
 */
export function ApiReferenceCard({ pipelineId }: ApiReferenceCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const baseUrl = useSyncExternalStore(emptySubscribe, getOriginSnapshot, getOriginServerSnapshot);
  const apiBase = `/api/v1/knowledge-bases/${pipelineId}`;

  const endpoints: ApiEndpoint[] = [
    {
      method: 'POST',
      path: '/chat',
      description: 'Chat with your indexed documents using RAG',
      example: `curl -X POST ${baseUrl}${apiBase}/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [
      { "role": "user", "content": "How do I get started?" }
    ],
    "stream": true
  }'`,
    },
    {
      method: 'POST',
      path: '/search',
      description: 'Semantic search across indexed documents',
      example: `curl -X POST ${baseUrl}${apiBase}/search \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "authentication",
    "topK": 5,
    "rerank": true
  }'`,
    },
    {
      method: 'GET',
      path: '/documents',
      description: 'List all indexed documents',
      example: `curl ${baseUrl}${apiBase}/documents`,
    },
    {
      method: 'POST',
      path: '/documents',
      description: 'Index a new URL',
      example: `curl -X POST ${baseUrl}${apiBase}/documents \\
  -H "Content-Type: application/json" \\
  -d '{ "url": "https://docs.example.com" }'`,
    },
  ];

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-muted flex items-center justify-center">
                  <TerminalIcon className="size-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-base font-semibold tracking-tight">
                  API Reference
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
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground mb-4">
              Use these endpoints to integrate with your own applications.
            </p>

            <Accordion type="single" collapsible className="rounded-md border">
              {endpoints.map((endpoint) => (
                <AccordionItem
                  key={`${endpoint.method}-${endpoint.path}`}
                  value={`${endpoint.method}-${endpoint.path}`}
                  className="border-b last:border-b-0"
                >
                  <AccordionTrigger className="hover:no-underline hover:bg-accent/50 px-3 py-2.5 text-left">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="secondary"
                        className={cn(
                          'font-mono text-[10px] px-1.5 py-0 shrink-0',
                          METHOD_COLORS[endpoint.method]
                        )}
                      >
                        {endpoint.method}
                      </Badge>
                      <code className="text-sm font-mono text-foreground">
                        {apiBase}{endpoint.path}
                      </code>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <p className="text-xs text-muted-foreground mb-2">
                      {endpoint.description}
                    </p>
                    {endpoint.example && (
                      <div className="relative">
                        <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre font-mono">
                          {endpoint.example}
                        </pre>
                        <div className="absolute top-2 right-2">
                          <CopyButton content={endpoint.example} variant="ghost" />
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
