'use client';

import { useMemo, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { highlight } from 'sugar-high';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';
import { CopyButton } from '@/components/ui/copy-button';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Heading styles - static classes for Tailwind JIT compatibility
const HEADING_CLASSES = {
  h1: 'text-[18px] md:text-[22px] font-semibold my-5 tracking-tight text-foreground',
  h2: 'text-[16px] md:text-[18px] font-semibold my-4 tracking-tight text-foreground',
  h3: 'text-[15px] md:text-[16px] font-semibold my-3.5 tracking-tight text-foreground',
  h4: 'text-[14px] md:text-[15px] font-medium my-3 text-foreground',
  h5: 'text-[13px] md:text-[14px] font-medium my-3 text-foreground',
  h6: 'text-[12px] md:text-[13px] font-medium my-3 text-foreground',
} as const;

type HeadingLevel = keyof typeof HEADING_CLASSES;

function createHeading(level: HeadingLevel) {
  const classes = HEADING_CLASSES[level];
  const Tag = level;
  return function Heading({ children }: { children?: React.ReactNode }) {
    return <Tag className={classes}>{children}</Tag>;
  };
}

/**
 * Custom markdown renderer with:
 * - Responsive heading sizes
 * - Custom list styling with colored markers
 * - Code blocks with syntax highlighting, language badge, copy button
 * - Inline code with hover states
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        'prose prose-neutral dark:prose-invert max-w-none',
        'prose-p:my-0 prose-pre:my-0',
        'prose-strong:text-foreground prose-strong:font-semibold',
        'prose-code:before:hidden prose-code:after:hidden',
        'font-sans font-normal text-foreground',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: createHeading('h1'),
          h2: createHeading('h2'),
          h3: createHeading('h3'),
          h4: createHeading('h4'),
          h5: createHeading('h5'),
          h6: createHeading('h6'),

          // Paragraph
          p: ({ children }) => (
            <p className="text-[15px] leading-relaxed text-foreground/90 my-3">
              {children}
            </p>
          ),

          // Lists with custom spacing
          ul: ({ children }) => (
            <ul className="my-6 space-y-3 pl-4 sm:pl-8 list-disc marker:text-primary/70">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-6 space-y-3 pl-4 sm:pl-8 list-decimal marker:font-semibold marker:text-primary/80">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="pl-2 text-[15px] leading-relaxed text-foreground/90">
              {children}
            </li>
          ),

          // Code blocks with syntax highlighting
          pre: ({ children }) => {
            return <>{children}</>;
          },
          code: CodeRenderer,

          // Blockquote styling
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-border/40 pl-3 text-[14px] leading-relaxed text-muted-foreground">
              {children}
            </blockquote>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 decoration-primary/50 hover:decoration-primary transition-colors"
            >
              {children}
            </a>
          ),

          // Tables
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-md border border-border">
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-accent/50 border-b border-border">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border/50">{children}</tbody>
          ),
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => (
            <th className="px-2 sm:px-3 py-2 text-left text-[10px] sm:text-xs font-semibold text-foreground uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-foreground">{children}</td>
          ),

          // Horizontal rule
          hr: () => (
            <hr className="my-8 border-none border-t border-border/50" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Code renderer - handles both inline and block code
 */
function CodeRenderer({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const isBlock = className?.startsWith('language-');
  const language = className?.replace('language-', '') || '';
  const code = String(children).replace(/\n$/, '');

  if (isBlock) {
    return <CodeBlock code={code} language={language} />;
  }

  return <InlineCode code={code} />;
}

/**
 * Code block with header, syntax highlighting, and copy button
 * Uses DOMPurify to sanitize highlighted HTML
 */
const CodeBlock = memo(function CodeBlock({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const lineCount = useMemo(() => code.split('\n').length, [code]);

  // Sanitize highlighted code with DOMPurify
  const sanitizedHtml = useMemo(() => {
    try {
      // Only highlight reasonably sized code blocks
      const highlighted = code.length < 10000 ? highlight(code) : escapeHtml(code);
      // Sanitize HTML - only allow span tags with class attributes (what sugar-high produces)
      return DOMPurify.sanitize(highlighted, {
        ALLOWED_TAGS: ['span'],
        ALLOWED_ATTR: ['class'],
      });
    } catch {
      return escapeHtml(code);
    }
  }, [code]);

  return (
    <div className="group relative my-5 rounded-md border border-border bg-accent overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-accent border-b border-border">
        <div className="flex items-center gap-2">
          {language && (
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {language}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </span>
        </div>
        <CopyButton content={code} showLabel variant="ghost" />
      </div>

      {/* Code content - sanitized with DOMPurify */}
      <SanitizedCodeContent html={sanitizedHtml} />
    </div>
  );
});

/**
 * Renders sanitized HTML code content
 */
function SanitizedCodeContent({ html }: { html: string }) {
  return (
    <pre className="font-mono text-sm leading-relaxed p-4 overflow-x-auto whitespace-pre">
      <code dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
}

/**
 * Inline code with hover state
 */
const InlineCode = memo(function InlineCode({ code }: { code: string }) {
  return (
    <code
      className={cn(
        'inline rounded px-1 py-0.5 mx-[0.1em] font-mono text-[0.85em]',
        'bg-muted/50 text-foreground/85',
        'hover:bg-muted/70 transition-colors duration-150'
      )}
    >
      {code}
    </code>
  );
});

/**
 * Escape HTML for fallback rendering
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Get dynamic font size class based on content length
 */
export function getMessageFontSizeClass(content: string): string {
  const lines = content.split('\n').length;
  const length = content.length;

  // Very short messages (≤20 chars, 1 line) - larger text
  if (length <= 20 && lines === 1) {
    return '[&>*]:!text-lg sm:[&>*]:!text-xl';
  }
  // Short messages (≤120 chars, 1 line)
  if (length <= 120 && lines === 1) {
    return '[&>*]:!text-base sm:[&>*]:!text-lg';
  }
  // Default for longer content
  return '';
}
