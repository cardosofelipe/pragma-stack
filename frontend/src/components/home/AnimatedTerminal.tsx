/* istanbul ignore file -- @preserve Animation-heavy component with intersection observer, tested via E2E */
/**
 * Animated Terminal
 * Terminal with typing animation showing installation/setup commands
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/lib/i18n/routing';

const commands = [
  { text: '# Clone the repository', delay: 0 },
  { text: '$ git clone https://github.com/cardosofelipe/pragma-stack.git.git', delay: 800 },
  { text: '$ cd fast-next-template', delay: 1600 },
  { text: '', delay: 2200 },
  { text: '# Start with Docker (one command)', delay: 2400 },
  { text: '$ docker-compose up', delay: 3200 },
  { text: '', delay: 4000 },
  { text: '✓ Backend running at http://localhost:8000', delay: 4200, isSuccess: true },
  { text: '✓ Frontend running at http://localhost:3000', delay: 4400, isSuccess: true },
  { text: '✓ Admin panel at http://localhost:3000/admin', delay: 4600, isSuccess: true },
  { text: '✓ API docs at http://localhost:8000/docs', delay: 4800, isSuccess: true },
];

export function AnimatedTerminal() {
  const [displayedLines, setDisplayedLines] = useState<typeof commands>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    // Only animate once when component enters viewport
    if (hasAnimated.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          setIsAnimating(true);
          animateCommands();
        }
      },
      { threshold: 0.3 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const animateCommands = () => {
    commands.forEach((cmd) => {
      setTimeout(() => {
        setDisplayedLines((prev) => [...prev, cmd]);
      }, cmd.delay);
    });
  };

  return (
    <section className="container mx-auto px-6 py-16 md:py-24" ref={containerRef}>
      <motion.div
        className="mx-auto max-w-4xl"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
      >
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Get Started in Seconds</h2>
          <p className="text-lg text-muted-foreground">
            Clone, run, and start building. No complex setup required.
          </p>
        </div>

        {/* Terminal Window */}
        <div className="rounded-lg border bg-card shadow-lg overflow-hidden">
          {/* Terminal Header */}
          <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-destructive" aria-hidden="true" />
              <div className="h-3 w-3 rounded-full bg-warning" aria-hidden="true" />
              <div className="h-3 w-3 rounded-full bg-success" aria-hidden="true" />
            </div>
            <div className="flex items-center gap-2 ml-4 text-sm text-muted-foreground">
              <Terminal className="h-4 w-4" aria-hidden="true" />
              <span className="font-mono">bash</span>
            </div>
          </div>

          {/* Terminal Content */}
          <div
            className="bg-slate-950 p-6 font-mono text-sm overflow-x-auto"
            style={{ minHeight: '400px' }}
          >
            <div className="space-y-2">
              {/* istanbul ignore next - Animation render tested via visual E2E */}
              {displayedLines.map((line, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`${
                    line.isSuccess
                      ? 'text-success'
                      : line.text.startsWith('#')
                        ? 'text-slate-500'
                        : line.text.startsWith('$')
                          ? 'text-primary'
                          : 'text-slate-300'
                  }`}
                >
                  {line.text || '\u00A0'}
                  {index === displayedLines.length - 1 && isAnimating && !line.isSuccess && (
                    <span
                      className="inline-block w-2 h-4 ml-1 bg-slate-400 animate-pulse"
                      aria-hidden="true"
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Below Terminal */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground mb-4">
            Or try the live demo without installing anything
          </p>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link href="/login">
              <Play className="h-5 w-5" aria-hidden="true" />
              Try Live Demo
            </Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
