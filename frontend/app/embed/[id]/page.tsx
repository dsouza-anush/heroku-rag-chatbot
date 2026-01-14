'use client';

import { use } from 'react';
import { ChatContainer } from '@/components/chat/chat-container';

interface EmbedPageProps {
  params: Promise<{ id: string }>;
}

export default function EmbedPage({ params }: EmbedPageProps) {
  const { id } = use(params);

  return (
    <div className="h-screen w-full">
      <ChatContainer pipelineId={id} />
    </div>
  );
}
