/**
 * Form Patterns Demo
 * Interactive demonstrations of form patterns with validation
 * Access: /dev/forms
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DevBreadcrumbs } from '@/components/dev/DevBreadcrumbs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Example, ExampleSection } from '@/components/dev/Example';
import { BeforeAfter } from '@/components/dev/BeforeAfter';

// Example schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  category: z.string().min(1, 'Please select a category'),
});

type LoginForm = z.infer<typeof loginSchema>;
type ContactForm = z.infer<typeof contactSchema>;

export default function FormsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Login form
  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    formState: { errors: errorsLogin },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  // Contact form
  const {
    register: registerContact,
    handleSubmit: handleSubmitContact,
    formState: { errors: errorsContact },
    setValue: setValueContact,
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmitLogin = async (data: LoginForm) => {
    setIsSubmitting(true);
    setSubmitSuccess(false);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log('Login form data:', data);
    setIsSubmitting(false);
    setSubmitSuccess(true);
  };

  const onSubmitContact = async (data: ContactForm) => {
    setIsSubmitting(true);
    setSubmitSuccess(false);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log('Contact form data:', data);
    setIsSubmitting(false);
    setSubmitSuccess(true);
  };

  return (
    <div className="bg-background">
      {/* Breadcrumbs */}
      <DevBreadcrumbs items={[{ label: 'Forms' }]} />

      {/* Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="space-y-12">
          {/* Introduction */}
          <div className="max-w-3xl space-y-4">
            <p className="text-muted-foreground">
              Complete form implementations using react-hook-form for state management
              and Zod for validation. Includes error handling, loading states, and
              accessibility features.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">react-hook-form</Badge>
              <Badge variant="outline">Zod</Badge>
              <Badge variant="outline">Validation</Badge>
              <Badge variant="outline">ARIA</Badge>
            </div>
          </div>

          {/* Basic Form */}
          <ExampleSection
            id="basic-form"
            title="Basic Form with Validation"
            description="Login form with email and password validation"
          >
            <Example
              title="Login Form"
              description="Validates on submit, shows field-level errors"
              code={`const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 chars'),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});

<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input
      id="email"
      type="email"
      {...register('email')}
      aria-invalid={!!errors.email}
    />
    {errors.email && (
      <p className="text-sm text-destructive">
        {errors.email.message}
      </p>
    )}
  </div>
  <Button type="submit" disabled={isSubmitting}>
    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Submit'}
  </Button>
</form>`}
            >
              <div className="max-w-md mx-auto">
                <form onSubmit={handleSubmitLogin(onSubmitLogin)} className="space-y-4">
                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      {...registerLogin('email')}
                      aria-invalid={!!errorsLogin.email}
                      aria-describedby={
                        errorsLogin.email ? 'login-email-error' : undefined
                      }
                    />
                    {errorsLogin.email && (
                      <p
                        id="login-email-error"
                        className="text-sm text-destructive"
                        role="alert"
                      >
                        {errorsLogin.email.message}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      {...registerLogin('password')}
                      aria-invalid={!!errorsLogin.password}
                      aria-describedby={
                        errorsLogin.password ? 'login-password-error' : undefined
                      }
                    />
                    {errorsLogin.password && (
                      <p
                        id="login-password-error"
                        className="text-sm text-destructive"
                        role="alert"
                      >
                        {errorsLogin.password.message}
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Signing In...' : 'Sign In'}
                  </Button>

                  {/* Success Message */}
                  {submitSuccess && (
                    <Alert className="border-green-500 text-green-600 dark:border-green-400 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>Success!</AlertTitle>
                      <AlertDescription>Form submitted successfully.</AlertDescription>
                    </Alert>
                  )}
                </form>
              </div>
            </Example>
          </ExampleSection>

          {/* Complete Form */}
          <ExampleSection
            id="complete-form"
            title="Complete Form Example"
            description="Contact form with multiple field types"
          >
            <Example
              title="Contact Form"
              description="Text, textarea, select, and validation"
              code={`const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  message: z.string().min(10, 'Min 10 characters'),
  category: z.string().min(1, 'Select a category'),
});

<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
  {/* Input field */}
  <div className="space-y-2">
    <Label htmlFor="name">Name</Label>
    <Input {...register('name')} />
    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
  </div>

  {/* Textarea field */}
  <div className="space-y-2">
    <Label htmlFor="message">Message</Label>
    <Textarea {...register('message')} rows={4} />
    {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
  </div>

  {/* Select field */}
  <div className="space-y-2">
    <Label htmlFor="category">Category</Label>
    <Select onValueChange={(value) => setValue('category', value)}>
      <SelectTrigger>
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="support">Support</SelectItem>
        <SelectItem value="sales">Sales</SelectItem>
      </SelectContent>
    </Select>
  </div>

  <Button type="submit">Submit</Button>
</form>`}
            >
              <div className="max-w-md mx-auto">
                <form
                  onSubmit={handleSubmitContact(onSubmitContact)}
                  className="space-y-4"
                >
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">Name</Label>
                    <Input
                      id="contact-name"
                      placeholder="John Doe"
                      {...registerContact('name')}
                      aria-invalid={!!errorsContact.name}
                    />
                    {errorsContact.name && (
                      <p className="text-sm text-destructive" role="alert">
                        {errorsContact.name.message}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      placeholder="you@example.com"
                      {...registerContact('email')}
                      aria-invalid={!!errorsContact.email}
                    />
                    {errorsContact.email && (
                      <p className="text-sm text-destructive" role="alert">
                        {errorsContact.email.message}
                      </p>
                    )}
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label htmlFor="contact-category">Category</Label>
                    <Select
                      onValueChange={(value) => setValueContact('category', value)}
                    >
                      <SelectTrigger id="contact-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="support">Support</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="feedback">Feedback</SelectItem>
                      </SelectContent>
                    </Select>
                    {errorsContact.category && (
                      <p className="text-sm text-destructive" role="alert">
                        {errorsContact.category.message}
                      </p>
                    )}
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <Label htmlFor="contact-message">Message</Label>
                    <Textarea
                      id="contact-message"
                      placeholder="Type your message here..."
                      rows={4}
                      {...registerContact('message')}
                      aria-invalid={!!errorsContact.message}
                    />
                    {errorsContact.message && (
                      <p className="text-sm text-destructive" role="alert">
                        {errorsContact.message.message}
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </Button>

                  {/* Success Message */}
                  {submitSuccess && (
                    <Alert className="border-green-500 text-green-600 dark:border-green-400 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>Success!</AlertTitle>
                      <AlertDescription>
                        Your message has been sent successfully.
                      </AlertDescription>
                    </Alert>
                  )}
                </form>
              </div>
            </Example>
          </ExampleSection>

          {/* Error States */}
          <ExampleSection
            id="error-states"
            title="Error State Handling"
            description="Proper ARIA attributes and visual feedback"
          >
            <BeforeAfter
              title="Error State Best Practices"
              description="Use aria-invalid and aria-describedby for accessibility"
              before={{
                caption: "No ARIA attributes, poor accessibility",
                content: (
                  <div className="space-y-2 rounded-lg border p-4">
                    <div className="text-sm font-medium">Email</div>
                    <div className="h-10 rounded-md border border-destructive bg-background"></div>
                    <p className="text-sm text-destructive">Invalid email address</p>
                  </div>
                ),
              }}
              after={{
                caption: "With ARIA, screen reader accessible",
                content: (
                  <div className="space-y-2 rounded-lg border p-4">
                    <div className="text-sm font-medium">Email</div>
                    <div
                      className="h-10 rounded-md border border-destructive bg-background"
                      role="textbox"
                      aria-invalid="true"
                      aria-describedby="email-error"
                    >
                      <span className="sr-only">Email input with error</span>
                    </div>
                    <p id="email-error" className="text-sm text-destructive" role="alert">
                      Invalid email address
                    </p>
                  </div>
                ),
              }}
            />

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Error Handling Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Add <code className="text-xs">aria-invalid=true</code> to invalid inputs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Link errors with <code className="text-xs">aria-describedby</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Add <code className="text-xs">role=&quot;alert&quot;</code> to error messages</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Visual indicator (red border, icon)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Clear error message text</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </ExampleSection>

          {/* Loading States */}
          <ExampleSection
            id="loading-states"
            title="Loading States"
            description="Proper feedback during async operations"
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Button Loading State</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <code className="text-xs block">
                    {`<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isLoading ? 'Saving...' : 'Save'}
</Button>`}
                  </code>
                  <div className="flex gap-2">
                    <Button size="sm">Save</Button>
                    <Button size="sm" disabled>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Form Disabled State</CardTitle>
                </CardHeader>
                <CardContent>
                  <code className="text-xs block mb-3">
                    {`<fieldset disabled={isLoading}>
  <Input />
  <Button type="submit" />
</fieldset>`}
                  </code>
                  <div className="space-y-2 opacity-60">
                    <Input placeholder="Disabled input" disabled />
                    <Button size="sm" disabled className="w-full">
                      Disabled Button
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ExampleSection>

          {/* Zod Patterns */}
          <ExampleSection
            id="zod-patterns"
            title="Common Zod Validation Patterns"
            description="Reusable validation schemas"
          >
            <Card>
              <CardHeader>
                <CardTitle>Validation Pattern Library</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="font-medium text-sm">Required String</div>
                  <code className="block rounded bg-muted p-2 text-xs">
                    z.string().min(1, &quot;Required&quot;)
                  </code>
                </div>

                <div className="space-y-2">
                  <div className="font-medium text-sm">Email</div>
                  <code className="block rounded bg-muted p-2 text-xs">
                    z.string().email(&quot;Invalid email&quot;)
                  </code>
                </div>

                <div className="space-y-2">
                  <div className="font-medium text-sm">Password (min length)</div>
                  <code className="block rounded bg-muted p-2 text-xs">
                    z.string().min(8, &quot;Min 8 characters&quot;)
                  </code>
                </div>

                <div className="space-y-2">
                  <div className="font-medium text-sm">Number Range</div>
                  <code className="block rounded bg-muted p-2 text-xs">
                    z.coerce.number().min(0).max(100)
                  </code>
                </div>

                <div className="space-y-2">
                  <div className="font-medium text-sm">Optional Field</div>
                  <code className="block rounded bg-muted p-2 text-xs">
                    z.string().optional()
                  </code>
                </div>

                <div className="space-y-2">
                  <div className="font-medium text-sm">Password Confirmation</div>
                  <code className="block rounded bg-muted p-2 text-xs">
                    {`z.object({
  password: z.string().min(8),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})`}
                  </code>
                </div>
              </CardContent>
            </Card>
          </ExampleSection>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Learn more:{' '}
            <Link
              href="/dev/docs/design-system/06-forms"
              className="font-medium hover:text-foreground"
            >
              Forms Documentation
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
