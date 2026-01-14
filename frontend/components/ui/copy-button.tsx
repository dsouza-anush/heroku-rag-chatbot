'use client';

import { useState, useCallback } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface CopyButtonProps {
  content: string;
  className?: string;
  /** Show text label alongside icon */
  showLabel?: boolean;
  /** Variant style */
  variant?: 'ghost' | 'outline';
}

/**
 * Reusable copy-to-clipboard button with success feedback.
 * Used in chat messages, code blocks, and embed URLs.
 */
export function CopyButton({
  content,
  className,
  showLabel = false,
  variant = 'ghost',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [content]);

  if (showLabel) {
    return (
      <Button
        variant={variant}
        size="sm"
        onClick={handleCopy}
        className={cn('gap-1.5', className)}
        aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
      >
        {copied ? (
          <>
            <CheckIcon className="size-3.5 text-success" />
            <span>Copied</span>
          </>
        ) : (
          <>
            <CopyIcon className="size-3.5" />
            <span>Copy</span>
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size="icon-sm"
      onClick={handleCopy}
      className={cn(
        'text-muted-foreground hover:text-foreground',
        className
      )}
      aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
    >
      {copied ? (
        <CheckIcon className="size-4 text-success" />
      ) : (
        <CopyIcon className="size-4" />
      )}
    </Button>
  );
}
