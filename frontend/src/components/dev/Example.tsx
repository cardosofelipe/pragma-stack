/* istanbul ignore file */

/**
 * Example Component
 * Container for live component demonstrations with optional code display
 * This file is excluded from coverage as it's a demo/showcase component
 */

'use client';

import { useState } from 'react';
import { Code2, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CodeSnippet } from './CodeSnippet';
import { cn } from '@/lib/utils';

interface ExampleProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  code?: string;
  variant?: 'default' | 'compact';
  className?: string;
  centered?: boolean;
  tags?: string[];
}

/**
 * Example - Live component demonstration container
 *
 * @example
 * <Example
 *   title="Primary Button"
 *   description="Default button variant for primary actions"
 *   code={`<Button variant="default">Click me</Button>`}
 * >
 *   <Button variant="default">Click me</Button>
 * </Example>
 */
export function Example({
  title,
  description,
  children,
  code,
  variant = 'default',
  className,
  centered = false,
  tags,
}: ExampleProps) {
  const [showCode, setShowCode] = useState(false);

  // Compact variant - no card wrapper
  if (variant === 'compact') {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Header */}
        {(title || description || tags) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {title && <h3 className="text-lg font-semibold">{title}</h3>}
              {tags && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}

        {/* Demo */}
        <div
          className={cn(
            'rounded-lg border bg-card p-6',
            centered && 'flex items-center justify-center'
          )}
        >
          {children}
        </div>

        {/* Code */}
        {code && <CodeSnippet code={code} language="tsx" />}
      </div>
    );
  }

  // Default variant - full card with tabs
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              {title && <CardTitle>{title}</CardTitle>}
              {tags && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {code ? (
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full max-w-[240px] grid-cols-2">
              <TabsTrigger value="preview" className="gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="code" className="gap-1.5">
                <Code2 className="h-3.5 w-3.5" />
                Code
              </TabsTrigger>
            </TabsList>
            <TabsContent value="preview" className="mt-4">
              <div
                className={cn(
                  'rounded-lg border bg-muted/30 p-6',
                  centered && 'flex items-center justify-center'
                )}
              >
                {children}
              </div>
            </TabsContent>
            <TabsContent value="code" className="mt-4">
              <CodeSnippet code={code} language="tsx" />
            </TabsContent>
          </Tabs>
        ) : (
          <div
            className={cn(
              'rounded-lg border bg-muted/30 p-6',
              centered && 'flex items-center justify-center'
            )}
          >
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * ExampleGrid - Grid layout for multiple examples
 *
 * @example
 * <ExampleGrid>
 *   <Example title="Example 1">...</Example>
 *   <Example title="Example 2">...</Example>
 * </ExampleGrid>
 */
export function ExampleGrid({
  children,
  cols = 2,
  className,
}: {
  children: React.ReactNode;
  cols?: 1 | 2 | 3;
  className?: string;
}) {
  const colsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  }[cols];

  return (
    <div className={cn('grid gap-6', colsClass, className)}>{children}</div>
  );
}

/**
 * ExampleSection - Section wrapper with title
 *
 * @example
 * <ExampleSection title="Button Variants" description="All available button styles">
 *   <ExampleGrid>...</ExampleGrid>
 * </ExampleSection>
 */
export function ExampleSection({
  title,
  description,
  children,
  id,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={cn('space-y-6', className)}>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
