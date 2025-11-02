/* istanbul ignore file */

/**
 * Component Showcase
 * Comprehensive display of all design system components with copy-paste code
 * This file is excluded from coverage as it's a demo/showcase page
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Moon, Sun, Mail, User,
  Settings, LogOut, Shield, AlertCircle, Info,
  CheckCircle2, AlertTriangle, Trash2, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Example, ExampleGrid, ExampleSection } from './Example';

/**
 * Component showcase
 */
export function ComponentShowcase() {
  const [isDark, setIsDark] = useState(false);
  const [checked, setChecked] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/dev">
              <Button variant="ghost" size="icon" aria-label="Back to hub">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Component Showcase</h1>
              <p className="text-sm text-muted-foreground">All shadcn/ui components with code</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-12">
          {/* Colors */}
          <ExampleSection
            id="colors"
            title="Colors"
            description="Semantic color tokens using OKLCH color space"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <div className="h-20 rounded-lg bg-background border"></div>
                <p className="text-sm font-medium">bg-background</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 rounded-lg bg-foreground"></div>
                <p className="text-sm font-medium">bg-foreground</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 rounded-lg bg-card border"></div>
                <p className="text-sm font-medium">bg-card</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 rounded-lg bg-primary"></div>
                <p className="text-sm font-medium">bg-primary</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 rounded-lg bg-secondary"></div>
                <p className="text-sm font-medium">bg-secondary</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 rounded-lg bg-muted"></div>
                <p className="text-sm font-medium">bg-muted</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 rounded-lg bg-accent"></div>
                <p className="text-sm font-medium">bg-accent</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 rounded-lg bg-destructive"></div>
                <p className="text-sm font-medium">bg-destructive</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 rounded-lg border-2 border-border"></div>
                <p className="text-sm font-medium">border-border</p>
              </div>
            </div>
          </ExampleSection>

          {/* Buttons */}
          <ExampleSection
            id="buttons"
            title="Buttons"
            description="All button variants and sizes with states"
          >
            <ExampleGrid>
              <Example
                title="Button Variants"
                description="All available button styles"
                code={`<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="link">Link</Button>`}
              >
                <div className="flex flex-wrap gap-2">
                  <Button variant="default">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="link">Link</Button>
                </div>
              </Example>

              <Example
                title="Button Sizes"
                description="Small, default, large, and icon-only"
                code={`<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">
  <Settings className="h-4 w-4" />
</Button>`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </Example>

              <Example
                title="Buttons with Icons"
                description="Icons can be placed before or after text"
                code={`<Button>
  <Mail className="mr-2 h-4 w-4" />
  Email
</Button>
<Button variant="outline">
  <User className="mr-2 h-4 w-4" />
  Profile
</Button>`}
              >
                <div className="flex flex-wrap gap-2">
                  <Button>
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </Button>
                  <Button variant="outline">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Button>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </Example>

              <Example
                title="Button States"
                description="Normal and disabled states"
                code={`<Button>Normal</Button>
<Button disabled>Disabled</Button>`}
              >
                <div className="flex flex-wrap gap-2">
                  <Button>Normal</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </Example>
            </ExampleGrid>
          </ExampleSection>

          {/* Form Inputs */}
          <ExampleSection
            id="form-inputs"
            title="Form Inputs"
            description="Text inputs, textareas, selects, and checkboxes"
          >
            <Example
              title="Form Components"
              description="Basic form field examples"
              code={`<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="you@example.com" />
</div>

<div className="space-y-2">
  <Label htmlFor="message">Message</Label>
  <Textarea id="message" placeholder="Type here..." rows={4} />
</div>

<div className="space-y-2">
  <Label htmlFor="country">Country</Label>
  <Select>
    <SelectTrigger id="country">
      <SelectValue placeholder="Select..." />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="us">United States</SelectItem>
      <SelectItem value="uk">United Kingdom</SelectItem>
    </SelectContent>
  </Select>
</div>

<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <Label htmlFor="terms">Accept terms</Label>
</div>`}
            >
              <div className="max-w-md space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="Type your message here..." rows={4} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select>
                    <SelectTrigger id="country">
                      <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us">United States</SelectItem>
                      <SelectItem value="uk">United Kingdom</SelectItem>
                      <SelectItem value="ca">Canada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" checked={checked} onCheckedChange={(value) => setChecked(value as boolean)} />
                  <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
                    Accept terms and conditions
                  </Label>
                </div>
              </div>
            </Example>
          </ExampleSection>

          {/* Cards */}
          <ExampleSection
            id="cards"
            title="Cards"
            description="Card component with header, content, and footer sections"
          >
            <ExampleGrid>
              <Example
                title="Simple Card"
                code={`<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here.</p>
  </CardContent>
</Card>`}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Simple Card</CardTitle>
                    <CardDescription>Basic card with title and description</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      This is the card content area. You can put any content here.
                    </p>
                  </CardContent>
                </Card>
              </Example>

              <Example
                title="Card with Footer"
                code={`<Card>
  <CardHeader>
    <CardTitle>Card with Actions</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Card content here.</p>
  </CardContent>
  <CardFooter className="flex justify-between">
    <Button variant="outline">Cancel</Button>
    <Button>Save</Button>
  </CardFooter>
</Card>`}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Card with Footer</CardTitle>
                    <CardDescription>Card with action buttons</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Cards can have footers with actions.
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline">Cancel</Button>
                    <Button>Save</Button>
                  </CardFooter>
                </Card>
              </Example>
            </ExampleGrid>
          </ExampleSection>

          {/* Badges */}
          <ExampleSection
            id="badges"
            title="Badges"
            description="Status indicators and labels"
          >
            <Example
              title="Badge Variants"
              code={`<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Destructive</Badge>`}
            >
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </Example>
          </ExampleSection>

          {/* Avatars */}
          <ExampleSection
            id="avatars"
            title="Avatars"
            description="User avatars in different sizes"
          >
            <Example
              title="Avatar Sizes"
              code={`<Avatar>
  <AvatarFallback>AB</AvatarFallback>
</Avatar>
<Avatar className="h-12 w-12">
  <AvatarFallback>CD</AvatarFallback>
</Avatar>
<Avatar className="h-16 w-16">
  <AvatarFallback>EF</AvatarFallback>
</Avatar>`}
            >
              <div className="flex flex-wrap items-center gap-4">
                <Avatar>
                  <AvatarFallback>AB</AvatarFallback>
                </Avatar>
                <Avatar className="h-12 w-12">
                  <AvatarFallback>CD</AvatarFallback>
                </Avatar>
                <Avatar className="h-16 w-16">
                  <AvatarFallback>EF</AvatarFallback>
                </Avatar>
              </div>
            </Example>
          </ExampleSection>

          {/* Alerts */}
          <ExampleSection
            id="alerts"
            title="Alerts"
            description="Contextual feedback messages"
          >
            <div className="space-y-4">
              <Example
                title="Alert Variants"
                code={`<Alert>
  <Info className="h-4 w-4" />
  <AlertTitle>Information</AlertTitle>
  <AlertDescription>
    This is an informational alert.
  </AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Something went wrong.
  </AlertDescription>
</Alert>`}
              >
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Information</AlertTitle>
                    <AlertDescription>
                      This is an informational alert message.
                    </AlertDescription>
                  </Alert>

                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      Something went wrong. Please try again.
                    </AlertDescription>
                  </Alert>
                </div>
              </Example>
            </div>
          </ExampleSection>

          {/* Dropdown Menu */}
          <ExampleSection
            id="dropdown"
            title="Dropdown Menu"
            description="Contextual menus triggered by a button"
          >
            <Example
              title="Dropdown Example"
              code={`<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Open Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>My Account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive">
      Log out
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`}
              centered
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Open Menu</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Shield className="mr-2 h-4 w-4" />
                    Security
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Example>
          </ExampleSection>

          {/* Dialog */}
          <ExampleSection
            id="dialog"
            title="Dialog"
            description="Modal dialogs for user interactions"
          >
            <Example
              title="Dialog Example"
              code={`<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Are you sure?</DialogTitle>
      <DialogDescription>
        This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button variant="destructive">Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>`}
              centered
            >
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Open Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Are you sure?</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. This will permanently delete your account
                      and remove your data from our servers.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button variant="destructive">Delete</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Example>
          </ExampleSection>

          {/* Tabs */}
          <ExampleSection
            id="tabs"
            title="Tabs"
            description="Organize content into tabbed sections"
          >
            <Example
              title="Tabs Example"
              code={`<Tabs defaultValue="account">
  <TabsList>
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
  </TabsList>
  <TabsContent value="account">
    Account content
  </TabsContent>
  <TabsContent value="password">
    Password content
  </TabsContent>
</Tabs>`}
            >
              <Tabs defaultValue="account" className="w-full">
                <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                  <TabsTrigger value="account">Account</TabsTrigger>
                  <TabsTrigger value="password">Password</TabsTrigger>
                </TabsList>
                <TabsContent value="account" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Make changes to your account here.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" placeholder="John Doe" />
                  </div>
                </TabsContent>
                <TabsContent value="password" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Change your password here.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="current">Current Password</Label>
                    <Input id="current" type="password" />
                  </div>
                </TabsContent>
              </Tabs>
            </Example>
          </ExampleSection>

          {/* Table */}
          <ExampleSection
            id="table"
            title="Table"
            description="Data tables with headers and cells"
          >
            <Example
              title="Table Example"
              code={`<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Invoice</TableHead>
      <TableHead>Status</TableHead>
      <TableHead className="text-right">Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>INV001</TableCell>
      <TableCell><Badge>Paid</Badge></TableCell>
      <TableCell className="text-right">$250.00</TableCell>
    </TableRow>
  </TableBody>
</Table>`}
            >
              <Table>
                <TableCaption>A list of recent invoices.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">INV001</TableCell>
                    <TableCell>
                      <Badge>Paid</Badge>
                    </TableCell>
                    <TableCell>Credit Card</TableCell>
                    <TableCell className="text-right">$250.00</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">INV002</TableCell>
                    <TableCell>
                      <Badge variant="secondary">Pending</Badge>
                    </TableCell>
                    <TableCell>PayPal</TableCell>
                    <TableCell className="text-right">$150.00</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">INV003</TableCell>
                    <TableCell>
                      <Badge variant="outline">Unpaid</Badge>
                    </TableCell>
                    <TableCell>Bank Transfer</TableCell>
                    <TableCell className="text-right">$350.00</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Example>
          </ExampleSection>

          {/* Skeletons */}
          <ExampleSection
            id="skeleton"
            title="Skeleton Loading"
            description="Loading placeholders for content"
          >
            <Example
              title="Skeleton Examples"
              code={`<Skeleton className="h-12 w-full" />
<Skeleton className="h-12 w-3/4" />
<Skeleton className="h-12 w-1/2" />
<div className="flex space-x-4">
  <Skeleton className="h-12 w-12 rounded-full" />
  <div className="space-y-2 flex-1">
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-4/5" />
  </div>
</div>`}
            >
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-3/4" />
                <Skeleton className="h-12 w-1/2" />
                <div className="flex space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                </div>
              </div>
            </Example>
          </ExampleSection>

          {/* Separator */}
          <ExampleSection
            id="separator"
            title="Separator"
            description="Visual dividers between content sections"
          >
            <Example
              title="Separator Example"
              code={`<div>
  <p>Section 1</p>
  <Separator className="my-4" />
  <p>Section 2</p>
</div>`}
            >
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Section 1</p>
                <Separator />
                <p className="text-sm text-muted-foreground">Section 2</p>
              </div>
            </Example>
          </ExampleSection>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Design System v1.0 • Built with{' '}
            <a
              href="https://ui.shadcn.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:text-foreground"
            >
              shadcn/ui
            </a>
            {' + '}
            <a
              href="https://tailwindcss.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:text-foreground"
            >
              Tailwind CSS 4
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
