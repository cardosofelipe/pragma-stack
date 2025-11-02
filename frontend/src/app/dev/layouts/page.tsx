/**
 * Layout Patterns Demo
 * Interactive demonstrations of essential layout patterns
 * Access: /dev/layouts
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Grid3x3, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Example, ExampleSection } from '@/components/dev/Example';
import { BeforeAfter } from '@/components/dev/BeforeAfter';

export const metadata: Metadata = {
  title: 'Layout Patterns | Dev',
  description: 'Essential layout patterns with before/after examples',
};

export default function LayoutsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center gap-4 px-4">
          <Link href="/dev">
            <Button variant="ghost" size="icon" aria-label="Back to hub">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Layout Patterns</h1>
            <p className="text-sm text-muted-foreground">
              Essential patterns for pages, dashboards, and forms
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-12">
          {/* Introduction */}
          <div className="max-w-3xl space-y-4">
            <p className="text-muted-foreground">
              These 5 essential layout patterns cover 80% of interface needs. Each
              pattern includes live examples, before/after comparisons, and copy-paste
              code.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Grid vs Flex</Badge>
              <Badge variant="outline">Responsive</Badge>
              <Badge variant="outline">Mobile-first</Badge>
              <Badge variant="outline">Best practices</Badge>
            </div>
          </div>

          {/* 1. Page Container */}
          <ExampleSection
            id="page-container"
            title="1. Page Container"
            description="Standard page layout with constrained width"
          >
            <Example
              title="Page Container Pattern"
              description="Responsive container with padding and max-width"
              code={`<div className="container mx-auto px-4 py-8">
  <div className="max-w-4xl mx-auto space-y-6">
    <h1 className="text-3xl font-bold">Page Title</h1>
    <Card>
      <CardHeader>
        <CardTitle>Content Card</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Your main content goes here.</p>
      </CardContent>
    </Card>
  </div>
</div>`}
            >
              <div className="rounded-lg border bg-muted/30 p-2">
                <div className="container mx-auto px-4 py-8 bg-background rounded">
                  <div className="max-w-4xl mx-auto space-y-6">
                    <h2 className="text-2xl font-bold">Page Title</h2>
                    <Card>
                      <CardHeader>
                        <CardTitle>Content Card</CardTitle>
                        <CardDescription>
                          Constrained to max-w-4xl for readability
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Your main content goes here. The max-w-4xl constraint
                          ensures comfortable reading width.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </Example>

            <BeforeAfter
              title="Common Mistake: No Width Constraint"
              description="Content should not span full viewport width"
              before={{
                caption: "No max-width, hard to read on wide screens",
                content: (
                  <div className="w-full space-y-4 bg-background p-4 rounded">
                    <h3 className="font-semibold">Full Width Content</h3>
                    <p className="text-sm text-muted-foreground">
                      This text spans the entire width, making it hard to read on
                      large screens. Lines become too long.
                    </p>
                  </div>
                ),
              }}
              after={{
                caption: "Constrained with max-w for better readability",
                content: (
                  <div className="max-w-2xl mx-auto space-y-4 bg-background p-4 rounded">
                    <h3 className="font-semibold">Constrained Content</h3>
                    <p className="text-sm text-muted-foreground">
                      This text has a max-width, creating comfortable line lengths
                      for reading.
                    </p>
                  </div>
                ),
              }}
            />
          </ExampleSection>

          {/* 2. Dashboard Grid */}
          <ExampleSection
            id="dashboard-grid"
            title="2. Dashboard Grid"
            description="Responsive card grid for metrics and data"
          >
            <Example
              title="Responsive Grid Pattern"
              description="1 → 2 → 3 columns progression with grid"
              code={`<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => (
    <Card key={item.id}>
      <CardHeader>
        <CardTitle>{item.title}</CardTitle>
      </CardHeader>
      <CardContent>{item.content}</CardContent>
    </Card>
  ))}
</div>`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Metric {i}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {(Math.random() * 1000).toFixed(0)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        +{(Math.random() * 20).toFixed(1)}% from last month
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </Example>

            <BeforeAfter
              title="Grid vs Flex for Equal Columns"
              description="Use Grid for equal-width columns, not Flex"
              before={{
                caption: "flex with flex-1 - uneven wrapping",
                content: (
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px] rounded border bg-background p-4">
                      <div className="text-xs">flex-1</div>
                    </div>
                    <div className="flex-1 min-w-[200px] rounded border bg-background p-4">
                      <div className="text-xs">flex-1</div>
                    </div>
                    <div className="flex-1 min-w-[200px] rounded border bg-background p-4">
                      <div className="text-xs">flex-1 (odd one out)</div>
                    </div>
                  </div>
                ),
              }}
              after={{
                caption: "grid with grid-cols - consistent sizing",
                content: (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded border bg-background p-4">
                      <div className="text-xs">grid-cols</div>
                    </div>
                    <div className="rounded border bg-background p-4">
                      <div className="text-xs">grid-cols</div>
                    </div>
                    <div className="rounded border bg-background p-4">
                      <div className="text-xs">grid-cols (perfect)</div>
                    </div>
                  </div>
                ),
              }}
            />
          </ExampleSection>

          {/* 3. Form Layout */}
          <ExampleSection
            id="form-layout"
            title="3. Form Layout"
            description="Centered form with appropriate max-width"
          >
            <Example
              title="Centered Form Pattern"
              description="Form constrained to max-w-md"
              code={`<div className="container mx-auto px-4 py-8">
  <Card className="max-w-md mx-auto">
    <CardHeader>
      <CardTitle>Login</CardTitle>
      <CardDescription>Enter your credentials</CardDescription>
    </CardHeader>
    <CardContent>
      <form className="space-y-4">
        {/* Form fields */}
      </form>
    </CardContent>
  </Card>
</div>`}
            >
              <div className="container mx-auto px-4 py-8">
                <Card className="max-w-md mx-auto">
                  <CardHeader>
                    <CardTitle>Login</CardTitle>
                    <CardDescription>
                      Enter your credentials to continue
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-4">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Email</div>
                        <div className="h-10 rounded-md border bg-background"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Password</div>
                        <div className="h-10 rounded-md border bg-background"></div>
                      </div>
                      <Button className="w-full">Sign In</Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </Example>
          </ExampleSection>

          {/* 4. Sidebar Layout */}
          <ExampleSection
            id="sidebar-layout"
            title="4. Sidebar Layout"
            description="Two-column layout with fixed sidebar"
          >
            <Example
              title="Sidebar + Main Content"
              description="Grid with fixed sidebar width"
              code={`<div className="grid lg:grid-cols-[240px_1fr] gap-6">
  {/* Sidebar */}
  <aside className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle>Navigation</CardTitle>
      </CardHeader>
      <CardContent>{/* Nav items */}</CardContent>
    </Card>
  </aside>

  {/* Main Content */}
  <main className="space-y-4">
    <Card>{/* Content */}</Card>
  </main>
</div>`}
            >
              <div className="grid lg:grid-cols-[240px_1fr] gap-6">
                {/* Sidebar */}
                <aside className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Navigation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {['Dashboard', 'Settings', 'Profile'].map((item) => (
                        <div
                          key={item}
                          className="rounded-md bg-muted px-3 py-2 text-sm"
                        >
                          {item}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </aside>

                {/* Main Content */}
                <main className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Main Content</CardTitle>
                      <CardDescription>
                        Fixed 240px sidebar, fluid main area
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        The sidebar remains 240px wide while the main content area
                        flexes to fill remaining space.
                      </p>
                    </CardContent>
                  </Card>
                </main>
              </div>
            </Example>
          </ExampleSection>

          {/* 5. Centered Content */}
          <ExampleSection
            id="centered-content"
            title="5. Centered Content"
            description="Vertically and horizontally centered layouts"
          >
            <Example
              title="Center with Flexbox"
              description="Full-height centered content"
              code={`<div className="flex min-h-screen items-center justify-center">
  <Card className="max-w-md w-full">
    <CardHeader>
      <CardTitle>Centered Card</CardTitle>
    </CardHeader>
    <CardContent>
      <p>Content perfectly centered on screen.</p>
    </CardContent>
  </Card>
</div>`}
            >
              <div className="flex min-h-[400px] items-center justify-center rounded-lg border bg-muted/30 p-4">
                <Card className="max-w-sm w-full">
                  <CardHeader>
                    <CardTitle>Centered Card</CardTitle>
                    <CardDescription>
                      Centered vertically and horizontally
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Perfect for login screens, error pages, and loading states.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </Example>
          </ExampleSection>

          {/* Decision Tree */}
          <ExampleSection
            id="decision-tree"
            title="Decision Tree: Grid vs Flex"
            description="When to use each layout method"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Grid3x3 className="h-5 w-5 text-primary" />
                  <CardTitle>Grid vs Flex Quick Guide</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Use Grid</Badge>
                      <span className="text-sm font-medium">When you need...</span>
                    </div>
                    <ul className="ml-6 space-y-1 text-sm text-muted-foreground list-disc">
                      <li>Equal-width columns (dashboard cards)</li>
                      <li>2D layout (rows AND columns)</li>
                      <li>Consistent grid structure</li>
                      <li>Auto-fill/auto-fit responsive grids</li>
                    </ul>
                    <div className="rounded-lg border bg-muted/30 p-3 font-mono text-xs">
                      grid grid-cols-3 gap-6
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Use Flex</Badge>
                      <span className="text-sm font-medium">When you need...</span>
                    </div>
                    <ul className="ml-6 space-y-1 text-sm text-muted-foreground list-disc">
                      <li>Variable-width items (buttons, tags)</li>
                      <li>1D layout (row OR column)</li>
                      <li>Center alignment</li>
                      <li>Space-between/around distribution</li>
                    </ul>
                    <div className="rounded-lg border bg-muted/30 p-3 font-mono text-xs">
                      flex gap-4 items-center
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ExampleSection>

          {/* Responsive Patterns */}
          <ExampleSection
            id="responsive"
            title="Responsive Patterns"
            description="Mobile-first breakpoint strategies"
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">1 → 2 → 3 Progression</CardTitle>
                  <CardDescription>Most common pattern</CardDescription>
                </CardHeader>
                <CardContent>
                  <code className="text-xs">
                    grid-cols-1 md:grid-cols-2 lg:grid-cols-3
                  </code>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Mobile: 1 column
                    <br />
                    Tablet: 2 columns
                    <br />
                    Desktop: 3 columns
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">1 → 2 → 4 Progression</CardTitle>
                  <CardDescription>For smaller cards</CardDescription>
                </CardHeader>
                <CardContent>
                  <code className="text-xs">
                    grid-cols-1 md:grid-cols-2 lg:grid-cols-4
                  </code>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Mobile: 1 column
                    <br />
                    Tablet: 2 columns
                    <br />
                    Desktop: 4 columns
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Stack → Row</CardTitle>
                  <CardDescription>Form buttons, toolbars</CardDescription>
                </CardHeader>
                <CardContent>
                  <code className="text-xs">flex flex-col sm:flex-row</code>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Mobile: Stacked vertically
                    <br />
                    Tablet+: Horizontal row
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Hide Sidebar</CardTitle>
                  <CardDescription>Mobile navigation</CardDescription>
                </CardHeader>
                <CardContent>
                  <code className="text-xs">
                    hidden lg:block
                  </code>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Mobile: Hidden (use menu)
                    <br />
                    Desktop: Visible sidebar
                  </p>
                </CardContent>
              </Card>
            </div>
          </ExampleSection>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Learn more:{' '}
            <a
              href="/docs/design-system/03-layouts.md"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:text-foreground"
            >
              Layout Documentation
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
