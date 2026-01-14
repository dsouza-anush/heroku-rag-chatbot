'use client';

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
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border border-border bg-card text-foreground',
        'transition-all duration-200',
        'hover:bg-accent hover:text-accent-foreground hover:scale-[1.02]',
        'active:scale-[0.98]',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm',
        className
      )}
    >
      {children}
    </button>
  );
}
