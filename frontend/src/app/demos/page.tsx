/**
 * Demo Tour Page
 * Comprehensive guide to all template features and demos
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Palette,
  ShieldCheck,
  UserCircle,
  Play,
  CheckCircle2,
  ArrowRight,
  Home,
  LogIn,
  Settings,
  Users,
  Lock,
  Activity,
  UserCog,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export const metadata: Metadata = {
  title: 'Demo Tour | FastNext Template',
  description: 'Try all features with demo credentials - comprehensive guide to the FastNext template',
};

const demoCategories = [
  {
    icon: Palette,
    title: 'Design System Hub',
    description: 'Browse components, layouts, spacing, and forms with live examples',
    href: '/dev',
    features: ['All UI components', 'Layout patterns', 'Spacing philosophy', 'Form implementations'],
    credentials: null,
  },
  {
    icon: ShieldCheck,
    title: 'Authentication System',
    description: 'Test login, registration, password reset, and session management',
    href: '/login',
    features: ['Login & logout', 'Registration', 'Password reset', 'Session tokens'],
    credentials: {
      email: 'demo@example.com',
      password: 'Demo123!',
      role: 'Regular User',
    },
  },
  {
    icon: UserCircle,
    title: 'User Features',
    description: 'Experience user settings, profile management, and session monitoring',
    href: '/settings',
    features: ['Profile editing', 'Password changes', 'Active sessions', 'Preferences'],
    credentials: {
      email: 'demo@example.com',
      password: 'Demo123!',
      role: 'Regular User',
    },
  },
  {
    icon: Play,
    title: 'Admin Dashboard',
    description: 'Explore admin panel with user management and analytics',
    href: '/admin',
    features: ['User management', 'Analytics charts', 'Bulk operations', 'Organization control'],
    credentials: {
      email: 'admin@example.com',
      password: 'Admin123!',
      role: 'Admin',
    },
  },
];

const explorationPaths = [
  {
    title: 'Quick Tour (5 min)',
    steps: [
      { icon: Home, text: 'Browse Design System components', href: '/dev' },
      { icon: LogIn, text: 'Test login flow', href: '/login' },
      { icon: Settings, text: 'View user settings', href: '/settings' },
    ],
  },
  {
    title: 'Full Experience (15 min)',
    steps: [
      { icon: Palette, text: 'Explore all design system pages', href: '/dev' },
      { icon: ShieldCheck, text: 'Try complete auth flow', href: '/login' },
      { icon: UserCog, text: 'Update profile and password', href: '/settings/profile' },
      { icon: Activity, text: 'Check active sessions', href: '/settings/sessions' },
      { icon: Users, text: 'Login as admin and manage users', href: '/admin/users' },
      { icon: BarChart3, text: 'View analytics dashboard', href: '/admin' },
    ],
  },
];

const checklist = [
  { label: 'Browse design system components', completed: false },
  { label: 'Test login/logout flow', completed: false },
  { label: 'Register a new account', completed: false },
  { label: 'Reset password', completed: false },
  { label: 'Update user profile', completed: false },
  { label: 'Change password', completed: false },
  { label: 'View active sessions', completed: false },
  { label: 'Login as admin', completed: false },
  { label: 'Manage users (admin)', completed: false },
  { label: 'View analytics (admin)', completed: false },
  { label: 'Perform bulk operations (admin)', completed: false },
  { label: 'Explore organizations (admin)', completed: false },
];

export default function DemoTourPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/" className="gap-2">
                  <Home className="h-4 w-4" />
                  Home
                </Link>
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <h1 className="text-lg font-semibold">Demo Tour</h1>
            </div>
            <Button asChild variant="default" size="sm">
              <Link href="/login">Start Exploring →</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="space-y-12 max-w-6xl mx-auto">
          {/* Hero Section */}
          <section className="text-center space-y-4">
            <Badge variant="secondary" className="mb-2">
              Interactive Demo
            </Badge>
            <h2 className="text-4xl font-bold tracking-tight">Explore All Features</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Try everything with our pre-configured demo accounts. All changes are safe to test and
              reset automatically.
            </p>
          </section>

          <Separator />

          {/* Quick Start Guide */}
          <section className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-semibold mb-2">Quick Start Guide</h3>
              <p className="text-muted-foreground">Follow these simple steps to get started</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                      1
                    </div>
                    <CardTitle className="text-lg">Choose a Demo</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Browse the demo categories below and pick what interests you most
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                      2
                    </div>
                    <CardTitle className="text-lg">Use Credentials</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Copy the demo credentials and login to explore authenticated features
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                      3
                    </div>
                    <CardTitle className="text-lg">Explore Freely</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Test all features - everything resets automatically, so experiment away!
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator />

          {/* Demo Categories */}
          <section className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-semibold mb-2">Demo Categories</h3>
              <p className="text-muted-foreground">Explore different areas of the template</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {demoCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <Card key={category.title} className="relative">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        {category.credentials && (
                          <Badge variant="outline" className="text-xs">
                            Login Required
                          </Badge>
                        )}
                      </div>
                      <CardTitle>{category.title}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Features List */}
                      <div className="space-y-2">
                        {category.features.map((feature) => (
                          <div key={feature} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="text-muted-foreground">{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* Credentials */}
                      {category.credentials && (
                        <div className="rounded-md bg-muted p-3 space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground">
                            {category.credentials.role} Credentials:
                          </p>
                          <p className="font-mono text-sm">{category.credentials.email}</p>
                          <p className="font-mono text-sm">{category.credentials.password}</p>
                        </div>
                      )}

                      {/* CTA */}
                      <Button asChild className="w-full gap-2">
                        <Link href={category.href}>
                          {category.credentials ? 'Try Now' : 'Explore'} <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <Separator />

          {/* Suggested Exploration Paths */}
          <section className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-semibold mb-2">Suggested Exploration Paths</h3>
              <p className="text-muted-foreground">Choose your adventure based on available time</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {explorationPaths.map((path) => (
                <Card key={path.title}>
                  <CardHeader>
                    <CardTitle>{path.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {path.steps.map((step, index) => {
                        const StepIcon = step.icon;
                        return (
                          <Link
                            key={index}
                            href={step.href}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors group"
                          >
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                              {index + 1}
                            </div>
                            <StepIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm flex-1 group-hover:text-primary transition-colors">
                              {step.text}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <Separator />

          {/* What to Try Checklist */}
          <section className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-semibold mb-2">What to Try</h3>
              <p className="text-muted-foreground">
                Complete checklist of features to explore (for your reference)
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Feature Checklist</CardTitle>
                <CardDescription>
                  Try these features to experience the full power of the template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {checklist.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm">
                      <div className="flex-shrink-0 w-5 h-5 rounded border border-muted-foreground/30 flex items-center justify-center">
                        {item.completed && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                      <span className={item.completed ? 'text-muted-foreground line-through' : ''}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* CTA Section */}
          <section className="text-center space-y-6 py-8">
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold">Ready to Start?</h3>
              <p className="text-muted-foreground">
                Pick a demo category above or jump right into the action
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/login">Try Authentication Flow →</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/dev">Browse Design System</Link>
              </Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
