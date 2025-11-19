/**
 * Homepage Header
 * Navigation header for the landing page with demo credentials modal
 */

'use client';

import { useState } from 'react';
import { Link } from '@/lib/i18n/routing';
import { Menu, X, Github, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LocaleSwitcher } from '@/components/i18n';

interface HeaderProps {
  onOpenDemoModal: () => void;
}

export function Header({ onOpenDemoModal }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/dev', label: 'Design System' },
    { href: '/admin', label: 'Admin Demo' },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          {/* Logo */}
          <Link href="/" className="font-bold text-xl hover:opacity-80 transition-opacity">
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              FastNext
            </span>{' '}
            <span className="text-foreground">Template</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}

            {/* GitHub Link with Star */}
            <a
              href="https://github.com/your-org/fast-next-template"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              <span>GitHub</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                <span aria-label="GitHub stars">Star</span>
              </span>
            </a>

            {/* Locale Switcher */}
            <LocaleSwitcher />

            {/* CTAs */}
            <Button onClick={onOpenDemoModal} variant="default" size="sm">
              Try Demo
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Login</Link>
            </Button>
          </nav>

          {/* Mobile Menu Toggle */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" aria-label="Toggle menu">
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Menu className="h-5 w-5" aria-hidden="true" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4 mt-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-lg font-medium hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}

                {/* GitHub Link */}
                <a
                  href="https://github.com/your-org/fast-next-template"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-lg font-medium hover:text-primary transition-colors"
                >
                  <Github className="h-5 w-5" aria-hidden="true" />
                  <span>GitHub</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs ml-auto">
                    <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                    Star
                  </span>
                </a>

                <div className="border-t pt-4 mt-4 space-y-3">
                  {/* Locale Switcher */}
                  <div className="flex justify-center">
                    <LocaleSwitcher />
                  </div>

                  <Button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenDemoModal();
                    }}
                    variant="default"
                    className="w-full"
                  >
                    Try Demo
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      Login
                    </Link>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </>
  );
}
