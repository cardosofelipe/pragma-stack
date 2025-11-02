/**
 * Spacing Patterns Demo
 * Interactive demonstrations of spacing philosophy and best practices
 * Access: /dev/spacing
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Ruler } from 'lucide-react';
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
  title: 'Spacing Patterns | Dev',
  description: 'Parent-controlled spacing philosophy and visual demonstrations',
};

export default function SpacingPage() {
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
            <h1 className="text-xl font-bold">Spacing Patterns</h1>
            <p className="text-sm text-muted-foreground">
              Parent-controlled spacing philosophy
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
              The Golden Rule: <strong>Parents control spacing, not children.</strong>{' '}
              Use gap, space-y, and space-x utilities on the parent container. Avoid
              margins on children except for exceptions.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">gap</Badge>
              <Badge variant="outline">space-y</Badge>
              <Badge variant="outline">space-x</Badge>
              <Badge variant="destructive">avoid margin</Badge>
            </div>
          </div>

          {/* Spacing Scale */}
          <ExampleSection
            id="spacing-scale"
            title="Spacing Scale"
            description="Multiples of 4px (Tailwind's base unit)"
          >
            <Card>
              <CardHeader>
                <CardTitle>Common Spacing Values</CardTitle>
                <CardDescription>
                  Use consistent spacing values from the scale
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { class: '2', px: '8px', rem: '0.5rem', use: 'Tight (label → input)' },
                    { class: '4', px: '16px', rem: '1rem', use: 'Standard (form fields)' },
                    { class: '6', px: '24px', rem: '1.5rem', use: 'Section spacing' },
                    { class: '8', px: '32px', rem: '2rem', use: 'Large gaps' },
                    { class: '12', px: '48px', rem: '3rem', use: 'Section dividers' },
                  ].map((item) => (
                    <div
                      key={item.class}
                      className="grid grid-cols-[80px_80px_100px_1fr] items-center gap-4"
                    >
                      <code className="text-sm font-mono">gap-{item.class}</code>
                      <span className="text-sm text-muted-foreground">{item.px}</span>
                      <span className="text-sm text-muted-foreground">{item.rem}</span>
                      <span className="text-sm">{item.use}</span>
                      <div className="col-span-4">
                        <div
                          className="h-2 rounded bg-primary"
                          style={{ width: item.px }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </ExampleSection>

          {/* Gap for Flex/Grid */}
          <ExampleSection
            id="gap"
            title="Gap: For Flex and Grid"
            description="Preferred method for spacing flex and grid children"
          >
            <Example
              title="Gap with Flex"
              description="Horizontal and vertical spacing"
              code={`{/* Horizontal */}
<div className="flex gap-4">
  <Button>Cancel</Button>
  <Button>Save</Button>
</div>

{/* Vertical */}
<div className="flex flex-col gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

{/* Grid */}
<div className="grid grid-cols-3 gap-6">
  {/* Cards */}
</div>`}
            >
              <div className="space-y-6">
                {/* Horizontal */}
                <div>
                  <p className="text-sm font-medium mb-2">Horizontal (gap-4)</p>
                  <div className="flex gap-4">
                    <Button variant="outline">Cancel</Button>
                    <Button>Save</Button>
                  </div>
                </div>

                {/* Vertical */}
                <div>
                  <p className="text-sm font-medium mb-2">Vertical (gap-4)</p>
                  <div className="flex flex-col gap-4">
                    <div className="rounded-lg border bg-muted p-3 text-sm">Item 1</div>
                    <div className="rounded-lg border bg-muted p-3 text-sm">Item 2</div>
                    <div className="rounded-lg border bg-muted p-3 text-sm">Item 3</div>
                  </div>
                </div>

                {/* Grid */}
                <div>
                  <p className="text-sm font-medium mb-2">Grid (gap-6)</p>
                  <div className="grid grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="rounded-lg border bg-muted p-3 text-center text-sm"
                      >
                        Card {i}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Example>
          </ExampleSection>

          {/* Space-y for Stacks */}
          <ExampleSection
            id="space-y"
            title="Space-y: For Vertical Stacks"
            description="Simple vertical spacing without flex/grid"
          >
            <Example
              title="Space-y Pattern"
              description="Adds margin-top to all children except first"
              code={`<div className="space-y-4">
  <div>First item (no margin)</div>
  <div>Second item (mt-4)</div>
  <div>Third item (mt-4)</div>
</div>

{/* Form example */}
<form className="space-y-4">
  <div className="space-y-2">
    <Label>Email</Label>
    <Input />
  </div>
  <div className="space-y-2">
    <Label>Password</Label>
    <Input />
  </div>
  <Button>Submit</Button>
</form>`}
            >
              <div className="max-w-md space-y-6">
                {/* Visual demo */}
                <div>
                  <p className="text-sm font-medium mb-4">Visual Demo (space-y-4)</p>
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-muted p-3 text-sm">
                      First item (no margin)
                    </div>
                    <div className="rounded-lg border bg-muted p-3 text-sm">
                      Second item (mt-4)
                    </div>
                    <div className="rounded-lg border bg-muted p-3 text-sm">
                      Third item (mt-4)
                    </div>
                  </div>
                </div>

                {/* Form example */}
                <div>
                  <p className="text-sm font-medium mb-4">Form Example (space-y-4)</p>
                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Email</div>
                      <div className="h-10 rounded-md border bg-background"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Password</div>
                      <div className="h-10 rounded-md border bg-background"></div>
                    </div>
                    <Button className="w-full">Submit</Button>
                  </div>
                </div>
              </div>
            </Example>
          </ExampleSection>

          {/* Anti-pattern: Child Margins */}
          <ExampleSection
            id="anti-patterns"
            title="Anti-patterns to Avoid"
            description="Common spacing mistakes"
          >
            <BeforeAfter
              title="Don't Let Children Control Spacing"
              description="Parent should control spacing, not children"
              before={{
                caption: "Children control their own spacing with mt-4",
                content: (
                  <div className="space-y-2 rounded-lg border p-4">
                    <div className="rounded bg-muted p-2 text-xs">
                      <div>Child 1</div>
                      <code className="text-[10px] text-destructive">no margin</code>
                    </div>
                    <div className="rounded bg-muted p-2 text-xs">
                      <div>Child 2</div>
                      <code className="text-[10px] text-destructive">mt-4</code>
                    </div>
                    <div className="rounded bg-muted p-2 text-xs">
                      <div>Child 3</div>
                      <code className="text-[10px] text-destructive">mt-4</code>
                    </div>
                  </div>
                ),
              }}
              after={{
                caption: "Parent controls spacing with space-y-4",
                content: (
                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="rounded bg-muted p-2 text-xs">
                      <div>Child 1</div>
                      <code className="text-[10px] text-green-600">
                        parent uses space-y-4
                      </code>
                    </div>
                    <div className="rounded bg-muted p-2 text-xs">
                      <div>Child 2</div>
                      <code className="text-[10px] text-green-600">clean, no margin</code>
                    </div>
                    <div className="rounded bg-muted p-2 text-xs">
                      <div>Child 3</div>
                      <code className="text-[10px] text-green-600">clean, no margin</code>
                    </div>
                  </div>
                ),
              }}
            />

            <BeforeAfter
              title="Use Gap, Not Margin for Buttons"
              description="Button groups should use gap, not margins"
              before={{
                caption: "Margin on children - harder to maintain",
                content: (
                  <div className="flex rounded-lg border p-4">
                    <Button variant="outline" size="sm">
                      Cancel
                    </Button>
                    <Button size="sm" className="ml-4">
                      Save
                    </Button>
                  </div>
                ),
              }}
              after={{
                caption: "Gap on parent - clean and flexible",
                content: (
                  <div className="flex gap-4 rounded-lg border p-4">
                    <Button variant="outline" size="sm">
                      Cancel
                    </Button>
                    <Button size="sm">Save</Button>
                  </div>
                ),
              }}
            />
          </ExampleSection>

          {/* Decision Tree */}
          <ExampleSection
            id="decision-tree"
            title="Decision Tree: Which Spacing Method?"
            description="Choose the right spacing utility"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Ruler className="h-5 w-5 text-primary" />
                  <CardTitle>Spacing Decision Tree</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {/* Gap */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Use gap</Badge>
                      <span className="text-sm font-medium">When...</span>
                    </div>
                    <ul className="ml-6 space-y-1 text-sm text-muted-foreground list-disc">
                      <li>Parent is flex or grid</li>
                      <li>All children need equal spacing</li>
                      <li>Responsive spacing (gap-4 md:gap-6)</li>
                    </ul>
                    <div className="rounded-lg border bg-muted/30 p-3 font-mono text-xs">
                      flex gap-4
                      <br />
                      grid grid-cols-3 gap-6
                    </div>
                  </div>

                  {/* Space-y */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Use space-y</Badge>
                      <span className="text-sm font-medium">When...</span>
                    </div>
                    <ul className="ml-6 space-y-1 text-sm text-muted-foreground list-disc">
                      <li>Vertical stack without flex/grid</li>
                      <li>Form fields</li>
                      <li>Content sections</li>
                    </ul>
                    <div className="rounded-lg border bg-muted/30 p-3 font-mono text-xs">
                      space-y-4
                      <br />
                      space-y-6
                    </div>
                  </div>

                  {/* Margin */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Use margin</Badge>
                      <span className="text-sm font-medium">Only when...</span>
                    </div>
                    <ul className="ml-6 space-y-1 text-sm text-muted-foreground list-disc">
                      <li>Exception case (one child needs different spacing)</li>
                      <li>Negative margin for overlap effects</li>
                      <li>Can't modify parent (external component)</li>
                    </ul>
                    <div className="rounded-lg border bg-muted/30 p-3 font-mono text-xs">
                      mt-8 {/* exception */}
                      <br />
                      -mt-4 {/* overlap */}
                    </div>
                  </div>

                  {/* Padding */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Use padding</Badge>
                      <span className="text-sm font-medium">When...</span>
                    </div>
                    <ul className="ml-6 space-y-1 text-sm text-muted-foreground list-disc">
                      <li>Internal spacing within a component</li>
                      <li>Card/container padding</li>
                      <li>Button padding</li>
                    </ul>
                    <div className="rounded-lg border bg-muted/30 p-3 font-mono text-xs">
                      p-4 {/* all sides */}
                      <br />
                      px-4 py-2 {/* horizontal & vertical */}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ExampleSection>

          {/* Common Patterns */}
          <ExampleSection
            id="common-patterns"
            title="Common Patterns"
            description="Real-world spacing examples"
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Form Fields</CardTitle>
                  <CardDescription>Parent: space-y-4, Field: space-y-2</CardDescription>
                </CardHeader>
                <CardContent>
                  <code className="text-xs block mb-3">
                    {`<form className="space-y-4">
  <div className="space-y-2">
    <Label>Email</Label>
    <Input />
  </div>
</form>`}
                  </code>
                  <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                    <div className="space-y-2">
                      <div className="text-xs font-medium">Email</div>
                      <div className="h-8 rounded border bg-background"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-medium">Password</div>
                      <div className="h-8 rounded border bg-background"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Button Group</CardTitle>
                  <CardDescription>Use flex gap-4</CardDescription>
                </CardHeader>
                <CardContent>
                  <code className="text-xs block mb-3">
                    {`<div className="flex gap-4">
  <Button variant="outline">Cancel</Button>
  <Button>Save</Button>
</div>`}
                  </code>
                  <div className="flex gap-4 rounded-lg border bg-muted/30 p-4">
                    <Button variant="outline" size="sm">
                      Cancel
                    </Button>
                    <Button size="sm">Save</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Card Grid</CardTitle>
                  <CardDescription>Use grid with gap-6</CardDescription>
                </CardHeader>
                <CardContent>
                  <code className="text-xs block mb-3">
                    {`<div className="grid grid-cols-2 gap-6">
  <Card>...</Card>
</div>`}
                  </code>
                  <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-4">
                    <div className="h-16 rounded border bg-background"></div>
                    <div className="h-16 rounded border bg-background"></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Content Stack</CardTitle>
                  <CardDescription>Use space-y-6 for sections</CardDescription>
                </CardHeader>
                <CardContent>
                  <code className="text-xs block mb-3">
                    {`<div className="space-y-6">
  <section>...</section>
  <section>...</section>
</div>`}
                  </code>
                  <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                    <div className="h-12 rounded border bg-background"></div>
                    <div className="h-12 rounded border bg-background"></div>
                  </div>
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
              href="/docs/design-system/04-spacing-philosophy.md"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:text-foreground"
            >
              Spacing Philosophy Documentation
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
