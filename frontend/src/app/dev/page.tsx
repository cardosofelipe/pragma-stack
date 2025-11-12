/**
 * Design System Hub
 * Central landing page for all interactive design system demonstrations
 * Access: /dev
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Palette, Layout, Ruler, FileText, BookOpen, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export const metadata: Metadata = {
  title: 'Design System Hub | FastNext Template',
  description: 'Interactive design system demonstrations with live examples - explore components, layouts, spacing, and forms built with shadcn/ui and Tailwind CSS',
};

const demoPages = [
  {
    title: 'Components',
    description: 'Explore all shadcn/ui components with live examples and copy-paste code',
    href: '/dev/components',
    icon: Palette,
    status: 'enhanced' as const,
    highlights: ['All variants', 'Interactive demos', 'Copy-paste code'],
  },
  {
    title: 'Layouts',
    description: 'Essential layout patterns for pages, dashboards, forms, and content',
    href: '/dev/layouts',
    icon: Layout,
    status: 'new' as const,
    highlights: ['Grid vs Flex', 'Responsive patterns', 'Before/after examples'],
  },
  {
    title: 'Spacing',
    description: 'Visual demonstrations of spacing philosophy and best practices',
    href: '/dev/spacing',
    icon: Ruler,
    status: 'new' as const,
    highlights: ['Parent-controlled', 'Gap vs Space-y', 'Anti-patterns'],
  },
  {
    title: 'Forms',
    description: 'Complete form implementations with validation and error handling',
    href: '/dev/forms',
    icon: FileText,
    status: 'new' as const,
    highlights: ['react-hook-form', 'Zod validation', 'Loading states'],
  },
];

const documentationLinks = [
  {
    title: 'Quick Start',
    description: '5-minute crash course',
    href: '/dev/docs/design-system/00-quick-start',
  },
  {
    title: 'Complete Documentation',
    description: 'Full design system guide',
    href: '/dev/docs',
  },
  {
    title: 'AI Guidelines',
    description: 'Rules for AI code generation',
    href: '/dev/docs/design-system/08-ai-guidelines',
  },
  {
    title: 'Quick Reference',
    description: 'Cheat sheet for lookups',
    href: '/dev/docs/design-system/99-reference',
  },
];

export default function DesignSystemHub() {
  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="border-b bg-gradient-to-b from-background to-muted/20 py-12">
        <div className="container mx-auto px-4">
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold tracking-tight">Design System Hub</h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Interactive demonstrations, live examples, and comprehensive documentation for the
              FastNext design system. Built with shadcn/ui + Tailwind CSS 4.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="space-y-12">
          {/* Demo Pages Grid */}
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Interactive Demonstrations</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Explore live examples with copy-paste code snippets
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {demoPages.map((page) => {
                const Icon = page.icon;
                return (
                  <Card
                    key={page.href}
                    className="group relative overflow-hidden transition-all hover:border-primary/50"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        {page.status === 'new' && (
                          <Badge variant="default" className="gap-1">
                            <Sparkles className="h-3 w-3" />
                            New
                          </Badge>
                        )}
                        {page.status === 'enhanced' && <Badge variant="secondary">Enhanced</Badge>}
                      </div>
                      <CardTitle className="mt-4">{page.title}</CardTitle>
                      <CardDescription>{page.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Highlights */}
                      <div className="flex flex-wrap gap-2">
                        {page.highlights.map((highlight) => (
                          <Badge key={highlight} variant="outline" className="text-xs">
                            {highlight}
                          </Badge>
                        ))}
                      </div>

                      {/* CTA */}
                      <Link href={page.href} className="block">
                        <Button className="w-full gap-2 group-hover:bg-primary/90">
                          Explore {page.title}
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <Separator />

          {/* Documentation Links */}
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                <BookOpen className="h-6 w-6" />
                Documentation
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                Comprehensive guides and reference materials
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {documentationLinks.map((link) => (
                <Link key={link.href} href={link.href} className="group">
                  <Card className="h-full transition-all hover:border-primary/50 hover:bg-accent/50">
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-base group-hover:text-primary transition-colors">
                        {link.title}
                      </CardTitle>
                      <CardDescription className="text-xs">{link.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          <Separator />

          {/* Key Features */}
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold tracking-tight">Key Features</h2>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">🎨 OKLCH Color System</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Perceptually uniform colors with semantic tokens for consistent theming
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">📏 Parent-Controlled Spacing</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Consistent spacing philosophy using gap and space-y utilities
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">♿ WCAG AA Compliant</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Full accessibility support with keyboard navigation and screen readers
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">📱 Mobile-First Responsive</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Tailwind breakpoints with progressive enhancement
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">🤖 AI-Optimized</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Dedicated guidelines for Claude Code, Cursor, and GitHub Copilot
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">🚀 Production-Ready</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Battle-tested patterns with real-world examples
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
