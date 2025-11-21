/**
 * Tech Stack Section
 * Displays technology logos/badges with tooltips
 */

'use client';

import { motion } from 'framer-motion';

interface Tech {
  name: string;
  description: string;
  color: string;
}

const technologies: Tech[] = [
  {
    name: 'FastAPI',
    description: 'Async Python web framework, auto-docs, type hints',
    color: 'from-teal-500 to-green-600',
  },
  {
    name: 'Next.js 15',
    description: 'React 19, App Router, Server Components',
    color: 'from-slate-900 to-slate-700',
  },
  {
    name: 'PostgreSQL',
    description: 'Reliable, scalable SQL database',
    color: 'from-blue-600 to-blue-800',
  },
  {
    name: 'TypeScript',
    description: 'End-to-end type safety',
    color: 'from-blue-500 to-blue-700',
  },
  {
    name: 'Docker',
    description: 'Containerized deployment',
    color: 'from-blue-400 to-blue-600',
  },
  {
    name: 'TailwindCSS',
    description: 'Utility-first styling with OKLCH colors',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    name: 'shadcn/ui',
    description: 'Accessible component library (New York variant)',
    color: 'from-slate-800 to-slate-600',
  },
  {
    name: 'Playwright',
    description: 'Reliable E2E testing (zero flaky tests)',
    color: 'from-green-600 to-emerald-700',
  },
];

export function TechStackSection() {
  return (
    <section className="container mx-auto px-6 py-16 md:py-24 bg-muted/30">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">A Stack You Can Trust</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          We chose these tools because they are boring, reliable, and standard. No hype, just
          results. Async architecture, type safety, and developer experience.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {technologies.map((tech, index) => (
          <motion.div
            key={tech.name}
            className="group relative h-full"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            whileHover={{ scale: 1.05 }}
          >
            <div className="h-full flex flex-col items-center justify-center rounded-lg border bg-card p-6 text-center hover:shadow-lg transition-all">
              {/* Tech Badge */}
              <div
                className={`inline-block rounded-full bg-gradient-to-r ${tech.color} px-4 py-2 text-white font-semibold text-sm mb-2`}
              >
                {tech.name}
              </div>

              {/* Hover Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-muted-foreground mt-2">{tech.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
