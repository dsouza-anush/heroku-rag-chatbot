'use client';

import { cn } from '@/lib/utils';

interface LoadingDotsProps {
  className?: string;
  /** Size of dots */
  size?: 'sm' | 'default';
}

/**
 * Animated loading dots indicator.
 * Used during chat response generation and async operations.
 */
export function LoadingDots({ className, size = 'default' }: LoadingDotsProps) {
  const dotSize = size === 'sm' ? 'size-1' : 'size-1.5';

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div
        className={cn(
          dotSize,
          'rounded-full bg-muted-foreground/70 animate-bounce-dot'
        )}
        style={{ animationDelay: '0ms' }}
      />
      <div
        className={cn(
          dotSize,
          'rounded-full bg-muted-foreground/70 animate-bounce-dot'
        )}
        style={{ animationDelay: '150ms' }}
      />
      <div
        className={cn(
          dotSize,
          'rounded-full bg-muted-foreground/70 animate-bounce-dot'
        )}
        style={{ animationDelay: '300ms' }}
      />
    </div>
  );
}
