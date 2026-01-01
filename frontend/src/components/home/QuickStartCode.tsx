/**
 * Quick Start Code Block
 * Code snippet showing quick start commands with copy functionality
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';

const codeString = `# Clone and start with Docker
git clone https://github.com/cardosofelipe/pragma-stack.git.git
cd fast-next-template
docker-compose up

# Or set up locally
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cd ../frontend && npm install`;

export function QuickStartCode() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <section className="container mx-auto px-6 py-16 md:py-24">
      <motion.div
        className="mx-auto max-w-4xl"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">5-Minute Setup</h2>
          <p className="text-lg text-muted-foreground">
            Clone, run, and start building. It&apos;s that simple.
          </p>
        </div>

        <div className="relative rounded-lg border bg-card shadow-lg overflow-hidden">
          {/* Header with Copy Button */}
          <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
              <span className="inline-block h-2 w-2 rounded-full bg-success" aria-hidden="true" />
              <span>bash</span>
            </div>
            <Button variant="ghost" size="sm" onClick={copyToClipboard} className="gap-2">
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-success" aria-hidden="true" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>

          {/* Code Block */}
          <div className="overflow-x-auto">
            <SyntaxHighlighter
              language="bash"
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: '1.5rem',
                background: 'transparent',
                fontSize: '0.875rem',
              }}
              wrapLines
            >
              {codeString}
            </SyntaxHighlighter>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
