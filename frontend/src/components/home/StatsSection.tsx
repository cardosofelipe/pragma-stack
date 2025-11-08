/**
 * Stats Section
 * Animated statistics with counters
 */

'use client';

import { useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { CheckCircle2, TestTube, Zap, FileCode } from 'lucide-react';

interface Stat {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  suffix: string;
  label: string;
  description: string;
}

const stats: Stat[] = [
  {
    icon: Zap,
    value: 97,
    suffix: '%',
    label: 'Test Coverage',
    description: 'Comprehensive testing across backend and frontend',
  },
  {
    icon: TestTube,
    value: 743,
    suffix: '',
    label: 'Passing Tests',
    description: 'Backend, frontend unit, and E2E tests',
  },
  {
    icon: CheckCircle2,
    value: 0,
    suffix: '',
    label: 'Flaky Tests',
    description: 'Production-stable test suite',
  },
  {
    icon: FileCode,
    value: 30,
    suffix: '+',
    label: 'API Endpoints',
    description: 'Fully documented with OpenAPI',
  },
];

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  useEffect(() => {
    if (!isInView) return;

    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isInView, value]);

  return (
    <div ref={ref} className="text-5xl md:text-6xl font-bold">
      {count}
      {suffix}
    </div>
  );
}

export function StatsSection() {
  return (
    <section className="container mx-auto px-6 py-16 md:py-24">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Built with Quality in Mind</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Not just another template. Comprehensive testing, documentation, and production-ready patterns.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            className="text-center space-y-4"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            {/* Icon */}
            <div className="flex justify-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <stat.icon className="h-8 w-8 text-primary" aria-hidden="true" />
              </div>
            </div>

            {/* Animated Counter */}
            <div className="bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
              <AnimatedCounter value={stat.value} suffix={stat.suffix} />
            </div>

            {/* Label */}
            <div>
              <div className="font-semibold text-lg mb-1">{stat.label}</div>
              <div className="text-sm text-muted-foreground">{stat.description}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
