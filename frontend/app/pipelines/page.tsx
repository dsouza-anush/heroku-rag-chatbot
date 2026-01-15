'use client';

import { DatabaseIcon } from 'lucide-react';
import { MiaLogo } from '@/components/icons/mia-logo';

export default function PipelinesPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 lg:px-6 py-8">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-secondary/15 text-secondary mx-auto">
          <MiaLogo iconOnly className="size-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Welcome to RAG Chat</h1>
          <p className="text-muted-foreground">
            Create a pipeline to index documentation and chat with your data. Each pipeline is an isolated RAG instance with its own data sources.
          </p>
        </div>
        <div className="flex flex-col gap-3 pt-4">
          <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card text-left min-h-[76px]">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <DatabaseIcon className="size-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-card-foreground">Index Documentation</p>
              <p className="text-sm text-muted-foreground">Add URLs to crawl and index into vector storage</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card text-left min-h-[76px]">
            <div className="size-10 rounded-lg bg-secondary/15 flex items-center justify-center shrink-0">
              <MiaLogo iconOnly className="size-5 text-secondary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-card-foreground">Chat with Your Data</p>
              <p className="text-sm text-muted-foreground">Ask questions and get answers with source citations</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground pt-2">
          Click <strong>&quot;New Pipeline&quot;</strong> in the sidebar to get started
        </p>
      </div>
    </div>
  );
}
