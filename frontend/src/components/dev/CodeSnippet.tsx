/* istanbul ignore file */

/**
 * CodeSnippet Component
 * Displays syntax-highlighted code with copy-to-clipboard functionality
 * This file is excluded from coverage as it's a demo/showcase component
 */

'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CodeSnippetProps {
  code: string;
  language?: 'tsx' | 'typescript' | 'javascript' | 'css' | 'bash' | 'json';
  title?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  className?: string;
}

/**
 * CodeSnippet - Syntax-highlighted code block with copy button
 *
 * @example
 * <CodeSnippet
 *   title="Button Component"
 *   language="tsx"
 *   code={`<Button variant="default">Click me</Button>`}
 *   showLineNumbers
 * />
 */
export function CodeSnippet({
  code,
  language = 'tsx',
  title,
  showLineNumbers = false,
  highlightLines = [],
  className,
}: CodeSnippetProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const lines = code.split('\n');

  return (
    <div className={cn('relative group', className)}>
      {/* Header */}
      {(title || language) && (
        <div className="flex items-center justify-between rounded-t-lg border border-b-0 bg-muted/50 px-4 py-2">
          <div className="flex items-center gap-2">
            {title && <span className="text-sm font-medium text-foreground">{title}</span>}
            {language && <span className="text-xs text-muted-foreground">({language})</span>}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 gap-1 px-2 opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="Copy code"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                <span className="text-xs">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span className="text-xs">Copy</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Code Block */}
      <div
        className={cn(
          'relative overflow-x-auto rounded-lg border bg-muted/30',
          title || language ? 'rounded-t-none' : ''
        )}
      >
        {/* Copy button (when no header) */}
        {!title && !language && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="absolute right-2 top-2 z-10 h-7 gap-1 px-2 opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="Copy code"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                <span className="text-xs">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span className="text-xs">Copy</span>
              </>
            )}
          </Button>
        )}

        <pre className="p-4 text-sm">
          <code className={cn('font-mono', `language-${language}`)}>
            {showLineNumbers ? (
              <div className="flex">
                {/* Line numbers */}
                <div className="mr-4 select-none border-r pr-4 text-right text-muted-foreground">
                  {lines.map((_, idx) => (
                    <div key={idx} className="leading-6">
                      {idx + 1}
                    </div>
                  ))}
                </div>
                {/* Code lines */}
                <div className="flex-1">
                  {lines.map((line, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'leading-6',
                        highlightLines.includes(idx + 1) && 'bg-accent/20 -mx-4 px-4'
                      )}
                    >
                      {line || ' '}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              code
            )}
          </code>
        </pre>
      </div>
    </div>
  );
}

/**
 * CodeGroup - Group multiple related code snippets
 *
 * @example
 * <CodeGroup>
 *   <CodeSnippet title="Component" code="..." />
 *   <CodeSnippet title="Usage" code="..." />
 * </CodeGroup>
 */
export function CodeGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('space-y-4', className)}>{children}</div>;
}
