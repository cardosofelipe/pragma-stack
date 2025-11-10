# Layout Patterns

**Master the 5 essential layouts** that cover 80% of all interface needs. Learn when to use Grid vs Flex, and build responsive, consistent layouts every time.

---

## Table of Contents

1. [Grid vs Flex Decision Tree](#grid-vs-flex-decision-tree)
2. [The 5 Essential Patterns](#the-5-essential-patterns)
3. [Responsive Strategies](#responsive-strategies)
4. [Common Mistakes](#common-mistakes)
5. [Advanced Patterns](#advanced-patterns)

---

## Grid vs Flex Decision Tree

Use this flowchart to choose between Grid and Flex:

```
┌─────────────────────────────────────┐
│ Need equal-width columns?           │
│ (e.g., 3 cards of same width)       │
└──────────┬─YES──────────┬─NO────────┘
           │              │
           ▼              ▼
      USE GRID      Need 2D layout?
                    (rows + columns)
                         │
                    ┌────┴────┐
                    │YES      │NO
                    ▼         ▼
               USE GRID   USE FLEX
```

### Quick Rules

| Scenario                    | Solution                                                |
| --------------------------- | ------------------------------------------------------- |
| **Equal-width columns**     | Grid (`grid grid-cols-3`)                               |
| **Flexible item sizes**     | Flex (`flex gap-4`)                                     |
| **2D layout (rows + cols)** | Grid (`grid grid-cols-2 grid-rows-3`)                   |
| **1D layout (row OR col)**  | Flex (`flex` or `flex flex-col`)                        |
| **Card grid**               | Grid (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) |
| **Navbar items**            | Flex (`flex items-center gap-4`)                        |
| **Sidebar + Content**       | Flex (`flex gap-6`)                                     |
| **Form fields**             | Flex column (`flex flex-col gap-4` or `space-y-4`)      |

---

## The 5 Essential Patterns

These 5 patterns cover 80% of all layout needs. Master these first.

---

### 1. Page Container Pattern

**Use case**: Standard page layout with readable content width

```tsx
<div className="container mx-auto px-4 py-8">
  <div className="max-w-4xl mx-auto space-y-6">
    <h1 className="text-3xl font-bold">Page Title</h1>

    <Card>
      <CardHeader>
        <CardTitle>Section Title</CardTitle>
      </CardHeader>
      <CardContent>Page content goes here</CardContent>
    </Card>
  </div>
</div>
```

**Key Features:**

- `container` - Responsive container with max-width
- `mx-auto` - Center horizontally
- `px-4` - Horizontal padding (mobile-friendly)
- `py-8` - Vertical padding
- `max-w-4xl` - Constrain content width for readability
- `space-y-6` - Vertical spacing between children

**When to use:**

- Blog posts
- Documentation pages
- Settings pages
- Any page with readable content

**[See live example](/dev/layouts#page-container)**

---

### 2. Dashboard Grid Pattern

**Use case**: Responsive card grid that adapts to screen size

```tsx
<div className="container mx-auto px-4 py-8">
  <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {items.map((item) => (
      <Card key={item.id}>
        <CardHeader>
          <CardTitle>{item.title}</CardTitle>
          <CardDescription>{item.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{item.value}</p>
        </CardContent>
      </Card>
    ))}
  </div>
</div>
```

**Responsive behavior:**

- **Mobile** (`< 768px`): 1 column
- **Tablet** (`≥ 768px`): 2 columns
- **Desktop** (`≥ 1024px`): 3 columns

**Key Features:**

- `grid` - Use CSS Grid
- `grid-cols-1` - Default: 1 column (mobile-first)
- `md:grid-cols-2` - 2 columns on tablet
- `lg:grid-cols-3` - 3 columns on desktop
- `gap-6` - Consistent spacing between items

**When to use:**

- Dashboards
- Product grids
- Image galleries
- Card collections

**[See live example](/dev/layouts#dashboard-grid)**

---

### 3. Form Layout Pattern

**Use case**: Centered form with constrained width

```tsx
<div className="container mx-auto px-4 py-8">
  <Card className="max-w-md mx-auto">
    <CardHeader>
      <CardTitle>Login</CardTitle>
      <CardDescription>Enter your credentials to continue</CardDescription>
    </CardHeader>
    <CardContent>
      <form className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" />
        </div>

        <Button className="w-full">Sign In</Button>
      </form>
    </CardContent>
  </Card>
</div>
```

**Key Features:**

- `max-w-md` - Constrain form width (448px max)
- `mx-auto` - Center the form
- `space-y-4` - Vertical spacing between fields
- `w-full` - Full-width button

**Form width guidelines:**

- **Short forms** (login, signup): `max-w-md` (448px)
- **Medium forms** (profile, settings): `max-w-lg` (512px)
- **Long forms** (checkout): `max-w-2xl` (672px)

**When to use:**

- Login/signup forms
- Contact forms
- Settings forms
- Any single-column form

**[See live example](/dev/layouts#form-layout)**

---

### 4. Sidebar Layout Pattern

**Use case**: Sidebar navigation with main content area

```tsx
<div className="flex min-h-screen">
  {/* Sidebar */}
  <aside className="w-64 border-r bg-muted/40 p-6">
    <nav className="space-y-2">
      <a href="#" className="block rounded-lg px-3 py-2 text-sm hover:bg-accent">
        Dashboard
      </a>
      <a href="#" className="block rounded-lg px-3 py-2 text-sm hover:bg-accent">
        Settings
      </a>
    </nav>
  </aside>

  {/* Main Content */}
  <main className="flex-1 p-6">
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Page Title</h1>
      {/* Content */}
    </div>
  </main>
</div>
```

**Key Features:**

- `flex` - Horizontal layout
- `w-64` - Fixed sidebar width (256px)
- `flex-1` - Main content takes remaining space
- `min-h-screen` - Full viewport height
- `border-r` - Visual separator

**Responsive strategy:**

```tsx
// Mobile: Collapsible sidebar
<div className="flex min-h-screen">
  {/* Sidebar - hidden on mobile */}
  <aside className="hidden lg:block w-64 border-r p-6">
    {/* Sidebar content */}
  </aside>

  {/* Main content - full width on mobile */}
  <main className="flex-1 p-4 lg:p-6">
    {/* Content */}
  </main>
</div>

// Add mobile menu button
<Button size="icon" className="lg:hidden">
  <Menu className="h-6 w-6" />
</Button>
```

**When to use:**

- Admin dashboards
- Settings pages
- Documentation sites
- Apps with persistent navigation

**[See live example](/dev/layouts#sidebar-layout)**

---

### 5. Centered Content Pattern

**Use case**: Single-column content with optimal reading width

```tsx
<div className="container mx-auto px-4 py-8">
  <article className="max-w-2xl mx-auto">
    <h1 className="text-4xl font-bold mb-4">Article Title</h1>
    <p className="text-muted-foreground mb-8">Published on Nov 2, 2025</p>

    <div className="prose prose-lg">
      <p>Article content with optimal line length for reading...</p>
      <p>More content...</p>
    </div>
  </article>
</div>
```

**Key Features:**

- `max-w-2xl` - Optimal reading width (672px)
- `mx-auto` - Center content
- `prose` - Typography styles (if using @tailwindcss/typography)

**Width recommendations:**

- **Articles/Blogs**: `max-w-2xl` (672px)
- **Documentation**: `max-w-3xl` (768px)
- **Landing pages**: `max-w-4xl` (896px) or wider
- **Forms**: `max-w-md` (448px)

**When to use:**

- Blog posts
- Articles
- Documentation
- Long-form content

**[See live example](/dev/layouts#centered-content)**

---

## Responsive Strategies

### Mobile-First Approach

Always start with mobile layout, then enhance for larger screens:

```tsx
// ✅ CORRECT - Mobile first
<div className="
  p-4           // Mobile: 16px padding
  sm:p-6        // Tablet: 24px padding
  lg:p-8        // Desktop: 32px padding
">
  <div className="
    grid
    grid-cols-1        // Mobile: 1 column
    sm:grid-cols-2     // Tablet: 2 columns
    lg:grid-cols-3     // Desktop: 3 columns
    gap-4
  ">
    {/* Items */}
  </div>
</div>

// ❌ WRONG - Desktop first
<div className="p-8 md:p-6 sm:p-4">  // Don't do this
```

### Breakpoints

| Breakpoint | Min Width | Typical Use                 |
| ---------- | --------- | --------------------------- |
| `sm:`      | 640px     | Large phones, small tablets |
| `md:`      | 768px     | Tablets                     |
| `lg:`      | 1024px    | Laptops, desktops           |
| `xl:`      | 1280px    | Large desktops              |
| `2xl:`     | 1536px    | Extra large screens         |

### Responsive Grid Columns

```tsx
// 1→2→3→4 progression (common)
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4

// 1→2→3 progression (most common)
grid-cols-1 md:grid-cols-2 lg:grid-cols-3

// 1→2 progression (simple)
grid-cols-1 md:grid-cols-2

// 1→3 progression (skip 2)
grid-cols-1 lg:grid-cols-3
```

### Responsive Text

```tsx
// Heading sizes
<h1 className="
  text-2xl sm:text-3xl lg:text-4xl
  font-bold
">
  Responsive Title
</h1>

// Body text (usually doesn't need responsive sizes)
<p className="text-base">
  Body text stays consistent
</p>
```

---

## Common Mistakes

### ❌ Mistake 1: Using Margins Instead of Gap

```tsx
// ❌ WRONG - Children have margins
<div className="flex">
  <div className="mr-4">Item 1</div>
  <div className="mr-4">Item 2</div>
  <div>Item 3</div>  {/* Last one has no margin */}
</div>

// ✅ CORRECT - Parent controls spacing
<div className="flex gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

### ❌ Mistake 2: Fixed Widths Instead of Responsive

```tsx
// ❌ WRONG - Fixed width, not responsive
<div className="w-[800px]">
  Content
</div>

// ✅ CORRECT - Responsive width
<div className="w-full max-w-4xl mx-auto px-4">
  Content
</div>
```

### ❌ Mistake 3: Not Using Container

```tsx
// ❌ WRONG - Content touches edges on large screens
<div className="px-4">
  Content spans full width on 4K screens
</div>

// ✅ CORRECT - Container constrains width
<div className="container mx-auto px-4">
  Content has maximum width
</div>
```

### ❌ Mistake 4: Desktop-First Responsive

```tsx
// ❌ WRONG - Desktop first
<div className="p-8 lg:p-6 md:p-4">

// ✅ CORRECT - Mobile first
<div className="p-4 md:p-6 lg:p-8">
```

### ❌ Mistake 5: Using Flex for Equal Columns

```tsx
// ❌ WRONG - Flex doesn't guarantee equal widths
<div className="flex gap-4">
  <div className="flex-1">Col 1</div>
  <div className="flex-1">Col 2</div>
  <div className="flex-1">Col 3</div>
</div>

// ✅ CORRECT - Grid ensures equal widths
<div className="grid grid-cols-3 gap-4">
  <div>Col 1</div>
  <div>Col 2</div>
  <div>Col 3</div>
</div>
```

**[See before/after examples](/dev/layouts)**

---

## Advanced Patterns

### Asymmetric Grid

```tsx
// 2/3 - 1/3 split
<div className="grid grid-cols-3 gap-6">
  <div className="col-span-2">Main content (2/3 width)</div>
  <div className="col-span-1">Sidebar (1/3 width)</div>
</div>
```

### Auto-fit Grid (Flexible columns)

```tsx
// Columns adjust based on available space
<div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
  {/* Adds as many columns as fit */}
</div>
```

### Sticky Sidebar

```tsx
<div className="flex gap-6">
  <aside className="sticky top-6 h-fit w-64">{/* Stays in view while scrolling */}</aside>
  <main className="flex-1">{/* Scrollable content */}</main>
</div>
```

### Full-height Layout

```tsx
<div className="flex flex-col min-h-screen">
  <header className="h-16 border-b">Header</header>
  <main className="flex-1">Flexible content</main>
  <footer className="h-16 border-t">Footer</footer>
</div>
```

---

## Layout Checklist

Before implementing a layout, ask:

- [ ] **Responsive?** Does it work on mobile, tablet, desktop?
- [ ] **Container?** Is content constrained on large screens?
- [ ] **Spacing?** Using `gap` or `space-y`, not margins on children?
- [ ] **Mobile-first?** Starting with mobile layout?
- [ ] **Semantic?** Using appropriate HTML tags (main, aside, nav)?
- [ ] **Accessible?** Proper heading hierarchy, skip links?

---

## Quick Reference

### Grid Cheat Sheet

```tsx
// Basic grid
grid grid-cols-3 gap-6

// Responsive grid
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6

// Asymmetric grid
grid grid-cols-3 gap-6
  <div className="col-span-2">...</div>

// Auto-fit grid
grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6
```

### Flex Cheat Sheet

```tsx
// Horizontal flex
flex gap-4

// Vertical flex
flex flex-col gap-4

// Center items
flex items-center justify-center

// Space between
flex items-center justify-between

// Wrap items
flex flex-wrap gap-4
```

### Container Cheat Sheet

```tsx
// Standard container
container mx-auto px-4 py-8

// Constrained width
max-w-4xl mx-auto px-4

// Full width
w-full px-4
```

---

## Next Steps

- **Practice**: Build pages using the 5 essential patterns
- **Explore**: [Interactive layout examples](/dev/layouts)
- **Deep Dive**: [Spacing Philosophy](./04-spacing-philosophy.md)
- **Reference**: [Quick Reference Tables](./99-reference.md)

---

**Related Documentation:**

- [Spacing Philosophy](./04-spacing-philosophy.md) - When to use margin vs padding vs gap
- [Foundations](./01-foundations.md) - Spacing tokens and scale
- [Quick Start](./00-quick-start.md) - Essential patterns

**Last Updated**: November 2, 2025
