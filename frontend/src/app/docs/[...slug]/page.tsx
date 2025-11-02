/**
 * Dynamic Documentation Route
 * Renders markdown files from docs/ directory
 * Access: /docs/design-system/01-foundations, etc.
 */

import { notFound } from 'next/navigation';
import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MarkdownContent } from '@/components/docs/MarkdownContent';

interface DocPageProps {
  params: Promise<{ slug: string[] }>;
}

// Generate static params for all documentation files
export async function generateStaticParams() {
  const docsDir = path.join(process.cwd(), 'docs', 'design-system');

  try {
    const files = await fs.readdir(docsDir);
    const mdFiles = files.filter(file => file.endsWith('.md'));

    return mdFiles.map(file => ({
      slug: ['design-system', file.replace(/\.md$/, '')],
    }));
  } catch {
    return [];
  }
}

// Get markdown file content
async function getDocContent(slug: string[]) {
  const filePath = path.join(process.cwd(), 'docs', ...slug) + '.md';

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const { data, content } = matter(fileContent);

    return {
      frontmatter: data,
      content,
      filePath: slug.join('/'),
    };
  } catch {
    return null;
  }
}

export default async function DocPage({ params }: DocPageProps) {
  const { slug } = await params;
  const doc = await getDocContent(slug);

  if (!doc) {
    notFound();
  }

  // Extract title from first heading or use filename
  const title = doc.content.match(/^#\s+(.+)$/m)?.[1] || slug[slug.length - 1];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center gap-4 px-4">
          <Link href="/dev">
            <Button variant="ghost" size="icon" aria-label="Back to design system">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <h1 className="text-lg font-semibold">{title}</h1>
              <p className="text-xs text-muted-foreground">
                {doc.filePath}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <MarkdownContent content={doc.content} />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t py-6">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <Separator className="mb-6" />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                FastNext Design System Documentation
              </p>
              <div className="flex gap-2">
                <Link href="/dev">
                  <Button variant="outline" size="sm">
                    View Interactive Demos
                  </Button>
                </Link>
                <Link href="/docs/design-system/README">
                  <Button variant="outline" size="sm">
                    Documentation Home
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
