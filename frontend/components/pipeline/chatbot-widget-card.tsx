'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { EmbedInstructions } from '@/components/pipeline/embed-instructions';

interface ChatbotWidgetCardProps {
  pipelineId: string;
  canTest: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

export function ChatbotWidgetCard({
  pipelineId,
  canTest,
  isOpen,
  onToggle,
}: ChatbotWidgetCardProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-muted flex items-center justify-center">
            <span className="text-sm font-bold text-muted-foreground">2</span>
          </div>
          <CardTitle className="text-base font-semibold tracking-tight">Chatbot Widget</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={onToggle} variant="outline" disabled={!canTest}>
          {isOpen ? 'Hide Widget' : 'Test Widget'}
        </Button>

        <EmbedInstructions pipelineId={pipelineId} />
      </CardContent>
    </Card>
  );
}
