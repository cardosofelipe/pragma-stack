/* istanbul ignore file */

/**
 * MarkdownContent Component
 * Renders markdown content with syntax highlighting and design system styling
 * This file is excluded from coverage as it's a documentation component
 */

import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { CodeBlock } from './CodeBlock';
import { cn } from '@/lib/utils';
import 'highlight.js/styles/atom-one-dark.css';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn('prose prose-neutral dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeHighlight,
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: 'wrap' }],
        ]}
        components={{
          // Headings - improved spacing and visual hierarchy
          h1: ({ children, ...props }) => (
            <h1
              className="scroll-mt-20 text-4xl font-bold tracking-tight mb-8 mt-12 first:mt-0 border-b-2 border-primary/20 pb-4 text-foreground"
              {...props}
            >
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2
              className="scroll-mt-20 text-3xl font-semibold tracking-tight mb-6 mt-12 first:mt-0 border-b border-border pb-3 text-foreground"
              {...props}
            >
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3
              className="scroll-mt-20 text-2xl font-semibold tracking-tight mb-4 mt-10 first:mt-0 text-foreground"
              {...props}
            >
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4
              className="scroll-mt-20 text-xl font-semibold tracking-tight mb-3 mt-8 first:mt-0 text-foreground"
              {...props}
            >
              {children}
            </h4>
          ),

          // Paragraphs and text - improved readability
          p: ({ children, ...props }) => (
            <p className="leading-relaxed mb-6 text-foreground/90 text-base" {...props}>
              {children}
            </p>
          ),
          strong: ({ children, ...props }) => (
            <strong className="font-semibold text-foreground" {...props}>
              {children}
            </strong>
          ),
          em: ({ children, ...props }) => (
            <em className="italic text-foreground/80" {...props}>
              {children}
            </em>
          ),

          // Links - more prominent with better hover state
          a: ({ children, href, ...props }) => (
            <a
              href={href}
              className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary/60 hover:text-primary/90 transition-all"
              {...props}
            >
              {children}
            </a>
          ),

          // Lists - improved spacing and hierarchy
          ul: ({ children, ...props }) => (
            <ul className="my-6 ml-6 list-disc space-y-3 marker:text-primary/60" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="my-6 ml-6 list-decimal space-y-3 marker:text-primary/60 marker:font-semibold" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="leading-relaxed text-foreground/90 pl-2" {...props}>
              {children}
            </li>
          ),

          // Code blocks - enhanced with copy button and better styling
          code: ({ inline, className, children, ...props }: {
            inline?: boolean;
            className?: string;
            children?: React.ReactNode;
          }) => {
            if (inline) {
              return (
                <code
                  className="relative rounded-md bg-primary/10 border border-primary/20 px-1.5 py-0.5 font-mono text-sm font-medium text-primary"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className={cn(
                  'block font-mono text-sm leading-relaxed',
                  className
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children, ...props }) => (
            <CodeBlock {...props}>
              {children}
            </CodeBlock>
          ),

          // Blockquotes - enhanced callout styling
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="my-8 border-l-4 border-primary/50 bg-primary/5 pl-6 pr-4 py-4 italic text-foreground/80 rounded-r-lg"
              {...props}
            >
              {children}
            </blockquote>
          ),

          // Tables - improved styling with better borders and hover states
          table: ({ children, ...props }) => (
            <div className="my-8 w-full overflow-x-auto rounded-lg border">
              <table
                className="w-full border-collapse text-sm"
                {...props}
              >
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-muted/80 border-b-2 border-border" {...props}>
              {children}
            </thead>
          ),
          tbody: ({ children, ...props }) => (
            <tbody className="divide-y divide-border" {...props}>{children}</tbody>
          ),
          tr: ({ children, ...props }) => (
            <tr className="transition-colors hover:bg-muted/40" {...props}>
              {children}
            </tr>
          ),
          th: ({ children, ...props }) => (
            <th
              className="px-5 py-3.5 text-left font-semibold text-foreground [&[align=center]]:text-center [&[align=right]]:text-right"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td
              className="px-5 py-3.5 text-foreground/80 [&[align=center]]:text-center [&[align=right]]:text-right"
              {...props}
            >
              {children}
            </td>
          ),

          // Horizontal rule - more prominent
          hr: ({ ...props }) => (
            <hr className="my-12 border-t-2 border-border/50" {...props} />
          ),

          // Images - optimized with Next.js Image component
          img: ({ src, alt }) => {
            if (!src || typeof src !== 'string') return null;

            return (
              <div className="my-8 relative w-full overflow-hidden rounded-lg border shadow-md">
                <Image
                  src={src}
                  alt={alt || ''}
                  width={1200}
                  height={675}
                  className="w-full h-auto"
                  style={{ objectFit: 'contain' }}
                />
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
