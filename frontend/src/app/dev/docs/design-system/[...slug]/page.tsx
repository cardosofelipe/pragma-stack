/**
 * Dynamic Documentation Route
 * Renders markdown files from docs/ directory
 * Access: /dev/docs/design-system/01-foundations, etc.
 */

import { notFound } from 'next/navigation';
import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
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
      slug: [file.replace(/\.md$/, '')],
    }));
  } catch {
    return [];
  }
}

// Get markdown file content
async function getDocContent(slug: string[]) {
  const filePath = path.join(process.cwd(), 'docs', 'design-system', ...slug) + '.md';

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <MarkdownContent content={doc.content} />
      </div>
    </div>
  );
}
