'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SuggestionButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  /** Compact size for widget embedding */
  size?: 'default' | 'sm';
  className?: string;
}

/**
 * A pill-style button for chat suggestions.
 * Provides consistent styling for suggestion prompts across the app.
 */
export function SuggestionButton({
  children,
  onClick,
  size = 'default',
  className,
}: SuggestionButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="outline"
      size={size === 'sm' ? 'sm' : 'default'}
      className={cn(
        'rounded-lg bg-card shadow-none',
        'hover:bg-accent hover:text-accent-foreground',
        'active:scale-[0.98]',
        size === 'sm' ? 'px-3 text-xs' : 'px-4 text-sm',
        className
      )}
    >
      {children}
    </Button>
  );
}
