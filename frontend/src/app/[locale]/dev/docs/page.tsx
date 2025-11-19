/* istanbul ignore file - Design system demo page covered by e2e tests */
/**
 * Documentation Hub
 * Central hub for all design system documentation
 * Access: /dev/docs
 */

import { Link } from '@/lib/i18n/routing';
import {
  BookOpen,
  Sparkles,
  Layout,
  Palette,
  Code2,
  FileCode,
  Accessibility,
  Lightbulb,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DevBreadcrumbs } from '@/components/dev/DevBreadcrumbs';

interface DocItem {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

const gettingStartedDocs: DocItem[] = [
  {
    title: 'Quick Start',
    description: '5-minute crash course to get up and running with the design system',
    href: '/dev/docs/design-system/00-quick-start',
    icon: <Sparkles className="h-5 w-5" />,
    badge: 'Start Here',
  },
  {
    title: 'README',
    description: 'Complete overview and learning paths for the design system',
    href: '/dev/docs/design-system/README',
    icon: <BookOpen className="h-5 w-5" />,
  },
];

const coreConceptsDocs: DocItem[] = [
  {
    title: 'Foundations',
    description: 'Colors (OKLCH), typography, spacing, and shadows',
    href: '/dev/docs/design-system/01-foundations',
    icon: <Palette className="h-5 w-5" />,
  },
  {
    title: 'Components',
    description: 'shadcn/ui component library guide and usage patterns',
    href: '/dev/docs/design-system/02-components',
    icon: <Code2 className="h-5 w-5" />,
  },
  {
    title: 'Layouts',
    description: 'Layout patterns with Grid vs Flex decision trees',
    href: '/dev/docs/design-system/03-layouts',
    icon: <Layout className="h-5 w-5" />,
  },
  {
    title: 'Spacing Philosophy',
    description: 'Parent-controlled spacing strategy and best practices',
    href: '/dev/docs/design-system/04-spacing-philosophy',
    icon: <FileCode className="h-5 w-5" />,
  },
  {
    title: 'Component Creation',
    description: 'When to create vs compose components',
    href: '/dev/docs/design-system/05-component-creation',
    icon: <Code2 className="h-5 w-5" />,
  },
  {
    title: 'Forms',
    description: 'Form patterns with react-hook-form and Zod validation',
    href: '/dev/docs/design-system/06-forms',
    icon: <FileCode className="h-5 w-5" />,
  },
  {
    title: 'Accessibility',
    description: 'WCAG AA compliance, keyboard navigation, and screen readers',
    href: '/dev/docs/design-system/07-accessibility',
    icon: <Accessibility className="h-5 w-5" />,
  },
];

const referencesDocs: DocItem[] = [
  {
    title: 'AI Guidelines',
    description: 'Rules and best practices for AI code generation',
    href: '/dev/docs/design-system/08-ai-guidelines',
    icon: <Lightbulb className="h-5 w-5" />,
    badge: 'AI',
  },
  {
    title: 'Quick Reference',
    description: 'Cheat sheet for quick lookups and common patterns',
    href: '/dev/docs/design-system/99-reference',
    icon: <Search className="h-5 w-5" />,
  },
];

export default function DocsHub() {
  return (
    <div className="bg-background">
      {/* Breadcrumbs */}
      <DevBreadcrumbs items={[{ label: 'Documentation' }]} />

      {/* Hero Section */}
      <section className="border-b bg-gradient-to-b from-background to-muted/20 py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-bold tracking-tight mb-4">Design System Documentation</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Comprehensive guides, best practices, and references for building consistent,
              accessible, and maintainable user interfaces with the FastNext design system.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/dev/docs/design-system/00-quick-start">
                <Button size="lg" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Get Started
                </Button>
              </Link>
              <Link href="/dev/docs/design-system/README">
                <Button variant="outline" size="lg" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Full Documentation
                </Button>
              </Link>
              <Link href="/dev/components">
                <Button variant="outline" size="lg" className="gap-2">
                  <Code2 className="h-4 w-4" />
                  View Examples
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-6xl space-y-16">
          {/* Getting Started Section */}
          <section>
            <div className="mb-6">
              <h3 className="text-2xl font-semibold tracking-tight mb-2">Getting Started</h3>
              <p className="text-muted-foreground">
                New to the design system? Start here for a quick introduction.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {gettingStartedDocs.map((doc) => (
                <Link key={doc.href} href={doc.href} className="group">
                  <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2.5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            {doc.icon}
                          </div>
                          <div>
                            <CardTitle className="text-xl">{doc.title}</CardTitle>
                            {doc.badge && (
                              <Badge variant="secondary" className="mt-1">
                                {doc.badge}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base">{doc.description}</CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          {/* Core Concepts Section */}
          <section>
            <div className="mb-6">
              <h3 className="text-2xl font-semibold tracking-tight mb-2">Core Concepts</h3>
              <p className="text-muted-foreground">
                Deep dive into the fundamental concepts and patterns of the design system.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {coreConceptsDocs.map((doc) => (
                <Link key={doc.href} href={doc.href} className="group">
                  <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-primary/10 p-2.5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          {doc.icon}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{doc.title}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{doc.description}</CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          {/* References Section */}
          <section>
            <div className="mb-6">
              <h3 className="text-2xl font-semibold tracking-tight mb-2">References</h3>
              <p className="text-muted-foreground">
                Quick references and specialized guides for specific use cases.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {referencesDocs.map((doc) => (
                <Link key={doc.href} href={doc.href} className="group">
                  <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2.5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            {doc.icon}
                          </div>
                          <div>
                            <CardTitle className="text-xl">{doc.title}</CardTitle>
                            {doc.badge && (
                              <Badge variant="secondary" className="mt-1">
                                {doc.badge}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base">{doc.description}</CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
