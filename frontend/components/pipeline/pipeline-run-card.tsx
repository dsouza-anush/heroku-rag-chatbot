'use client';

import { CheckIcon, CircleIcon, Loader2Icon, XIcon } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, getDomain } from '@/lib/utils';
import {
  PipelineRunState,
  PipelineStage,
  StageStatus,
} from '@/lib/pipeline-status-adapter';

interface PipelineRunCardProps {
  url: string;
  state: PipelineRunState;
}

export function PipelineRunCard({ url, state }: PipelineRunCardProps) {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center gap-2">
          <StatusIndicator status={state.overallStatus} />
          <CardDescription>
            {state.overallStatus === 'running' && 'Pipeline running'}
            {state.overallStatus === 'complete' && 'Pipeline complete'}
            {state.overallStatus === 'error' && 'Pipeline failed'}
            {state.overallStatus === 'idle' && 'Ready to index'}
          </CardDescription>
        </div>
        <CardTitle className="text-sm font-medium truncate">
          {getDomain(url)}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <PipelineStepper stages={state.stages} />
      </CardContent>

      {(state.metrics.pagesIndexed > 0 || state.metrics.chunksCreated > 0) && (
        <CardFooter className="gap-3 text-sm text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">
              {state.metrics.pagesIndexed}
            </span>{' '}
            pages
          </span>
          <span>
            <span className="font-medium text-foreground">
              {state.metrics.chunksCreated}
            </span>{' '}
            chunks
          </span>
        </CardFooter>
      )}
    </Card>
  );
}

function StatusIndicator({
  status,
}: {
  status: PipelineRunState['overallStatus'];
}) {
  if (status === 'running') {
    return <div className="size-2 rounded-full bg-primary animate-pulse" />;
  }
  if (status === 'complete') {
    return <div className="size-2 rounded-full bg-success" />;
  }
  if (status === 'error') {
    return <div className="size-2 rounded-full bg-destructive" />;
  }
  return <div className="size-2 rounded-full bg-muted-foreground/30" />;
}

function PipelineStepper({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="relative">
      {/* Vertical connector line */}
      <div className="absolute left-[9px] top-2.5 bottom-2.5 w-px bg-border" />

      <div className="flex flex-col gap-1.5">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className="flex items-center gap-3 relative animate-fade-in"
          >
            <StageIcon status={stage.status} />
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-sm',
                  stage.status === 'idle' && 'text-muted-foreground/50',
                  stage.status === 'queued' && 'text-muted-foreground',
                  stage.status === 'running' && 'text-foreground font-medium',
                  stage.status === 'success' && 'text-foreground',
                  stage.status === 'failed' && 'text-destructive font-medium'
                )}
              >
                {stage.label}
              </p>
              {stage.status === 'running' && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stage.description}
                </p>
              )}
            </div>
            {stage.status === 'running' && (
              <Badge variant="shimmer" className="text-xs">
                In Progress
              </Badge>
            )}
            {stage.status === 'success' && (
              <Badge variant="success" className="text-xs">
                Done
              </Badge>
            )}
            {stage.status === 'failed' && (
              <Badge variant="destructive" className="text-xs">
                Failed
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StageIcon({ status }: { status: StageStatus }) {
  const baseClasses =
    'size-5 rounded-full flex items-center justify-center relative z-10';

  switch (status) {
    case 'success':
      return (
        <div className={cn(baseClasses, 'bg-success/10')}>
          <CheckIcon className="size-3 text-success" />
        </div>
      );
    case 'running':
      return (
        <div className={cn(baseClasses, 'bg-primary/10')}>
          <Loader2Icon className="size-3 text-primary animate-spin" />
        </div>
      );
    case 'failed':
      return (
        <div className={cn(baseClasses, 'bg-destructive/10')}>
          <XIcon className="size-3 text-destructive" />
        </div>
      );
    case 'queued':
      return (
        <div className={cn(baseClasses, 'bg-muted border border-border')}>
          <CircleIcon className="size-2 text-muted-foreground" />
        </div>
      );
    case 'idle':
    default:
      return (
        <div className={cn(baseClasses, 'bg-muted/50 border border-border/50')}>
          <CircleIcon className="size-2 text-muted-foreground/50" />
        </div>
      );
  }
}
