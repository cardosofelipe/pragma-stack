/* istanbul ignore file */

/**
 * CodeBlock Component
 * Syntax-highlighted code block with copy functionality
 * This file is excluded from coverage as it's a documentation component
 */

'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function CodeBlock({ children, className, title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const code = extractTextFromChildren(children);
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative my-6 rounded-lg border bg-[#282c34] text-slate-50">
      {title && (
        <div className="flex items-center justify-between rounded-t-lg border-b bg-muted/10 px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
        </div>
      )}
      <div className={cn('relative', title && 'rounded-t-none')}>
        <pre
          className={cn(
            'overflow-x-auto p-4 font-mono text-sm leading-relaxed',
            // Force transparent background for hljs to avoid double background
            '[&_.hljs]:!bg-transparent [&_code]:!bg-transparent',
            title && 'rounded-t-none',
            className
          )}
        >
          {children}
        </pre>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-8 w-8 text-muted-foreground opacity-0 transition-all hover:bg-muted/20 hover:text-foreground group-hover:opacity-100"
          onClick={handleCopy}
          aria-label="Copy code"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string') {
    return children;
  }

  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join('');
  }

  if (children && typeof children === 'object' && 'props' in children) {
    return extractTextFromChildren(
      (children as { props: { children: React.ReactNode } }).props.children
    );
  }

  return '';
}
