# Foundations

**The building blocks of our design system**: OKLCH colors, typography scale, spacing tokens, shadows, and border radius. Master these fundamentals to build consistent, accessible interfaces.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Color System (OKLCH)](#color-system-oklch)
3. [Typography](#typography)
4. [Spacing Scale](#spacing-scale)
5. [Shadows](#shadows)
6. [Border Radius](#border-radius)
7. [Quick Reference](#quick-reference)

---

## Technology Stack

### Core Technologies

- **Framework**: Next.js 15 + React 19
- **Styling**: Tailwind CSS 4 (CSS-first configuration)
- **Components**: shadcn/ui (New York style)
- **Color Space**: OKLCH (perceptually uniform)
- **Icons**: lucide-react
- **Fonts**: Geist Sans + Geist Mono

### Design Principles

1. **🎨 Semantic First** - Use `bg-primary`, not `bg-blue-500`
2. **♿ Accessible by Default** - WCAG AA compliance minimum (4.5:1 contrast)
3. **📐 Consistent Spacing** - Multiples of 4px (0.25rem base unit)
4. **🧩 Compose, Don't Create** - Use shadcn/ui primitives
5. **🌗 Dark Mode Ready** - All components work in light/dark
6. **⚡ Pareto Efficient** - 80% of needs with 20% of patterns

---

## Color System (OKLCH)

### Why OKLCH?

We use **OKLCH** (Oklab LCH) color space for:

- ✅ **Perceptual uniformity** - Colors look consistent across light/dark modes
- ✅ **Better accessibility** - Predictable contrast ratios
- ✅ **Vibrant colors** - More saturated without sacrificing legibility
- ✅ **Future-proof** - CSS native support (vs HSL/RGB)

**Learn more**: [oklch.com](https://oklch.com)

---

### Semantic Color Tokens

All colors follow the **background/foreground** convention:

- `background` - The background color
- `foreground` - The text color that goes on that background

**This ensures accessible contrast automatically.**

---

### Primary Colors

**Purpose**: Main brand color, CTAs, primary actions

```css
/* Light & Dark Mode */
--primary: oklch(0.6231 0.188 259.8145) /* Blue */ --primary-foreground: oklch(1 0 0)
  /* White text */;
```

**Usage**:

```tsx
// Primary button (most common)
<Button>Save Changes</Button>

// Primary link
<a href="#" className="text-primary hover:underline">
  Learn more
</a>

// Primary badge
<Badge className="bg-primary text-primary-foreground">New</Badge>
```

**When to use**:

- ✅ Call-to-action buttons
- ✅ Primary links
- ✅ Active states in navigation
- ✅ Important badges/tags

**When NOT to use**:

- ❌ Large background areas (too intense)
- ❌ Body text (use `text-foreground`)
- ❌ Disabled states (use `muted`)

---

### Secondary Colors

**Purpose**: Secondary actions, less prominent UI elements

```css
/* Light Mode */
--secondary: oklch(0.967 0.0029 264.5419) /* Light gray-blue */
  --secondary-foreground: oklch(0.1529 0 0) /* Dark text */ /* Dark Mode */
  --secondary: oklch(0.2686 0 0) /* Dark gray */ --secondary-foreground: oklch(0.9823 0 0)
  /* Light text */;
```

**Usage**:

```tsx
// Secondary button
<Button variant="secondary">Cancel</Button>

// Secondary badge
<Badge variant="secondary">Draft</Badge>

// Muted background area
<div className="bg-secondary text-secondary-foreground p-4 rounded-lg">
  Less important information
</div>
```

---

### Muted Colors

**Purpose**: Backgrounds for disabled states, subtle UI elements

```css
/* Light Mode */
--muted: oklch(0.9846 0.0017 247.8389) --muted-foreground: oklch(0.4667 0.0043 264.4327)
  /* Dark Mode */ --muted: oklch(0.2393 0 0) --muted-foreground: oklch(0.6588 0.0043 264.4327);
```

**Usage**:

```tsx
// Disabled button
<Button disabled>Submit</Button>

// Secondary/helper text
<p className="text-muted-foreground text-sm">
  This action cannot be undone
</p>

// Skeleton loader
<Skeleton className="h-12 w-full" />

// TabsList background
<Tabs defaultValue="tab1">
  <TabsList className="bg-muted">
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
  </TabsList>
</Tabs>
```

**Common use cases**:

- Disabled button backgrounds
- Placeholder/skeleton loaders
- TabsList backgrounds
- Switch backgrounds (unchecked state)
- Helper text, captions, timestamps

---

### Accent Colors

**Purpose**: Hover states, focus indicators, highlights

```css
/* Light Mode */
--accent: oklch(0.9514 0.025 236.8242) --accent-foreground: oklch(0.1529 0 0) /* Dark Mode */
  --accent: oklch(0.3791 0.1378 265.5222) --accent-foreground: oklch(0.9823 0 0);
```

**Usage**:

```tsx
// Dropdown menu item hover
<DropdownMenu>
  <DropdownMenuContent>
    <DropdownMenuItem className="focus:bg-accent focus:text-accent-foreground">
      Edit
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

// Highlighted section
<div className="bg-accent text-accent-foreground p-4 rounded-lg">
  Featured content
</div>
```

**Common use cases**:

- Dropdown menu item hover states
- Command palette hover states
- Highlighted sections
- Subtle emphasis backgrounds

---

### Destructive Colors

**Purpose**: Error states, delete actions, warnings

```css
/* Light & Dark Mode */
--destructive: oklch(0.6368 0.2078 25.3313) /* Red */ --destructive-foreground: oklch(1 0 0)
  /* White text */;
```

**Usage**:

```tsx
// Delete button
<Button variant="destructive">Delete Account</Button>

// Error alert
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Something went wrong. Please try again.
  </AlertDescription>
</Alert>

// Form error text
<p className="text-sm text-destructive">
  {errors.email?.message}
</p>

// Destructive badge
<Badge variant="destructive">Critical</Badge>
```

**When to use**:

- ✅ Delete/remove actions
- ✅ Error messages
- ✅ Validation errors
- ✅ Critical warnings

---

### Card & Popover Colors

**Purpose**: Elevated surfaces (cards, popovers, dropdowns)

```css
/* Light Mode */
--card: oklch(1 0 0) /* White */ --card-foreground: oklch(0.1529 0 0) /* Dark text */
  --popover: oklch(1 0 0) /* White */ --popover-foreground: oklch(0.1529 0 0) /* Dark text */
  /* Dark Mode */ --card: oklch(0.2686 0 0) /* Dark gray */ --card-foreground: oklch(0.9823 0 0)
  /* Light text */ --popover: oklch(0.2686 0 0) /* Dark gray */
  --popover-foreground: oklch(0.9823 0 0) /* Light text */;
```

**Usage**:

```tsx
// Card (uses card colors by default)
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>Card content</CardContent>
</Card>

// Popover
<Popover>
  <PopoverTrigger>Open</PopoverTrigger>
  <PopoverContent>Popover content</PopoverContent>
</Popover>
```

---

### Border & Input Colors

**Purpose**: Borders, input field borders, dividers

```css
/* Light Mode */
--border: oklch(0.9276 0.0058 264.5313) --input: oklch(0.9276 0.0058 264.5313) /* Dark Mode */
  --border: oklch(0.3715 0 0) --input: oklch(0.3715 0 0);
```

**Usage**:

```tsx
// Input border
<Input type="email" placeholder="you@example.com" />

// Card with border
<Card className="border">Content</Card>

// Separator
<Separator />

// Custom border
<div className="border-border border-2 rounded-lg p-4">
  Content
</div>
```

---

### Focus Ring

**Purpose**: Focus indicators for keyboard navigation

```css
/* Light & Dark Mode */
--ring: oklch(0.6231 0.188 259.8145) /* Primary blue */;
```

**Usage**:

```tsx
// Button with focus ring (automatic)
<Button>Click me</Button>

// Custom focusable element
<div
  tabIndex={0}
  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
>
  Focusable content
</div>
```

**Accessibility note**: Focus rings are critical for keyboard navigation. Never remove them with `outline: none` without providing an alternative.

---

### Chart Colors

**Purpose**: Data visualization with harmonious color palette

```css
--chart-1: oklch(0.6231 0.188 259.8145) /* Blue */ --chart-2: oklch(0.5461 0.2152 262.8809)
  /* Purple-blue */ --chart-3: oklch(0.4882 0.2172 264.3763) /* Deep purple */
  --chart-4: oklch(0.4244 0.1809 265.6377) /* Violet */ --chart-5: oklch(0.3791 0.1378 265.5222)
  /* Deep violet */;
```

**Usage**:

```tsx
// In chart components
const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];
```

---

### Color Decision Tree

```
What's the purpose?
│
├─ Main action/CTA? → PRIMARY
├─ Secondary action? → SECONDARY
├─ Error/delete? → DESTRUCTIVE
├─ Hover state? → ACCENT
├─ Disabled/subtle? → MUTED
├─ Card/elevated surface? → CARD
├─ Border/divider? → BORDER
└─ Focus indicator? → RING
```

---

### Color Usage Guidelines

#### ✅ DO

```tsx
// Use semantic tokens
<div className="bg-primary text-primary-foreground">CTA</div>
<p className="text-destructive">Error message</p>
<div className="bg-muted text-muted-foreground">Subtle background</div>

// Use accent for hover
<div className="hover:bg-accent hover:text-accent-foreground">
  Hover me
</div>

// Test contrast
// Primary on white: 4.5:1 ✅
// Destructive on white: 4.5:1 ✅
```

#### ❌ DON'T

```tsx
// Don't use arbitrary colors
<div className="bg-blue-500 text-white">Bad</div>

// Don't mix color spaces
<div className="bg-primary text-[#ff0000]">Bad</div>

// Don't use primary for large areas
<div className="min-h-screen bg-primary">Too intense</div>

// Don't override foreground without checking contrast
<div className="bg-primary text-gray-300">Low contrast!</div>
```

---

## Typography

### Font Families

```css
--font-sans:
  Geist Sans, system-ui, -apple-system, sans-serif --font-mono: Geist Mono, ui-monospace,
  monospace --font-serif: ui-serif, Georgia, serif;
```

**Usage**:

```tsx
// Sans serif (default)
<div className="font-sans">Body text</div>

// Monospace (code)
<code className="font-mono">const example = true;</code>

// Serif (rarely used)
<blockquote className="font-serif italic">Quote</blockquote>
```

---

### Type Scale

| Size | Class       | rem      | px    | Use Case                     |
| ---- | ----------- | -------- | ----- | ---------------------------- |
| 9xl  | `text-9xl`  | 8rem     | 128px | Hero text (rare)             |
| 8xl  | `text-8xl`  | 6rem     | 96px  | Hero text (rare)             |
| 7xl  | `text-7xl`  | 4.5rem   | 72px  | Hero text (rare)             |
| 6xl  | `text-6xl`  | 3.75rem  | 60px  | Hero text (rare)             |
| 5xl  | `text-5xl`  | 3rem     | 48px  | Landing page H1              |
| 4xl  | `text-4xl`  | 2.25rem  | 36px  | Page H1                      |
| 3xl  | `text-3xl`  | 1.875rem | 30px  | **Page titles**              |
| 2xl  | `text-2xl`  | 1.5rem   | 24px  | **Section headings**         |
| xl   | `text-xl`   | 1.25rem  | 20px  | **Card titles**              |
| lg   | `text-lg`   | 1.125rem | 18px  | **Subheadings**              |
| base | `text-base` | 1rem     | 16px  | **Body text (default)**      |
| sm   | `text-sm`   | 0.875rem | 14px  | **Secondary text, captions** |
| xs   | `text-xs`   | 0.75rem  | 12px  | **Labels, helper text**      |

**Bold = most commonly used**

---

### Font Weights

| Weight   | Class           | Numeric | Use Case                 |
| -------- | --------------- | ------- | ------------------------ |
| Bold     | `font-bold`     | 700     | **Headings, emphasis**   |
| Semibold | `font-semibold` | 600     | **Subheadings, buttons** |
| Medium   | `font-medium`   | 500     | **Labels, menu items**   |
| Normal   | `font-normal`   | 400     | **Body text (default)**  |
| Light    | `font-light`    | 300     | De-emphasized text       |

**Bold = most commonly used**

---

### Typography Patterns

#### Page Title

```tsx
<h1 className="text-3xl font-bold">Page Title</h1>
```

#### Section Heading

```tsx
<h2 className="text-2xl font-semibold mb-4">Section Heading</h2>
```

#### Card Title

```tsx
<CardTitle className="text-xl font-semibold">Card Title</CardTitle>
```

#### Body Text

```tsx
<p className="text-base text-foreground">Regular paragraph text uses the default text-base size.</p>
```

#### Secondary Text

```tsx
<p className="text-sm text-muted-foreground">Helper text, timestamps, captions</p>
```

#### Label

```tsx
<Label htmlFor="email" className="text-sm font-medium">
  Email Address
</Label>
```

---

### Line Height

| Class             | Value | Use Case                |
| ----------------- | ----- | ----------------------- |
| `leading-none`    | 1     | Headings (rare)         |
| `leading-tight`   | 1.25  | **Headings**            |
| `leading-snug`    | 1.375 | Dense text              |
| `leading-normal`  | 1.5   | **Body text (default)** |
| `leading-relaxed` | 1.625 | Comfortable reading     |
| `leading-loose`   | 2     | Very relaxed (rare)     |

**Usage**:

```tsx
// Heading
<h1 className="text-3xl font-bold leading-tight">
  Tight line height for headings
</h1>

// Body (default)
<p className="leading-normal">
  Normal line height for readability
</p>
```

---

### Typography Guidelines

#### ✅ DO

```tsx
// Use semantic foreground colors
<p className="text-foreground">Body text</p>
<p className="text-muted-foreground">Secondary text</p>

// Maintain heading hierarchy
<h1 className="text-3xl font-bold">Page Title</h1>
<h2 className="text-2xl font-semibold">Section</h2>
<h3 className="text-xl font-semibold">Subsection</h3>

// Limit line length for readability
<article className="max-w-2xl mx-auto">
  <p>60-80 characters per line is optimal</p>
</article>

// Use responsive type sizes
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
  Responsive Title
</h1>
```

#### ❌ DON'T

```tsx
// Don't use too many sizes on one page
<p className="text-xs">Too small</p>
<p className="text-sm">Still small</p>
<p className="text-base">Base</p>
<p className="text-lg">Large</p>
<p className="text-xl">Larger</p>
// ^ Pick 2-3 sizes max

// Don't skip heading levels
<h1>Page</h1>
<h3>Section</h3>  // ❌ Skipped h2

// Don't use custom colors without contrast check
<p className="text-blue-300">Low contrast</p>

// Don't overuse bold
<p className="font-bold">
  <span className="font-bold">Every</span>
  <span className="font-bold">word</span>
  <span className="font-bold">bold</span>
</p>
```

---

## Spacing Scale

Tailwind uses a **0.25rem (4px) base unit**:

```css
--spacing: 0.25rem;
```

**All spacing should be multiples of 4px** for consistency.

### Spacing Tokens

| Token | rem      | Pixels | Use Case                           |
| ----- | -------- | ------ | ---------------------------------- |
| `0`   | 0        | 0px    | No spacing                         |
| `px`  | -        | 1px    | Borders, dividers                  |
| `0.5` | 0.125rem | 2px    | Very tight                         |
| `1`   | 0.25rem  | 4px    | Icon gaps                          |
| `2`   | 0.5rem   | 8px    | **Tight spacing** (label → input)  |
| `3`   | 0.75rem  | 12px   | Component padding                  |
| `4`   | 1rem     | 16px   | **Standard spacing** (form fields) |
| `5`   | 1.25rem  | 20px   | Medium spacing                     |
| `6`   | 1.5rem   | 24px   | **Section spacing** (cards)        |
| `8`   | 2rem     | 32px   | **Large gaps**                     |
| `10`  | 2.5rem   | 40px   | Very large gaps                    |
| `12`  | 3rem     | 48px   | **Section dividers**               |
| `16`  | 4rem     | 64px   | **Page sections**                  |
| `20`  | 5rem     | 80px   | Extra large                        |
| `24`  | 6rem     | 96px   | Huge spacing                       |

**Bold = most commonly used**

---

### Container & Max Width

```tsx
// Responsive container with horizontal padding
<div className="container mx-auto px-4">
  Content
</div>

// Constrained width for readability
<div className="max-w-2xl mx-auto">
  Article content
</div>
```

### Max Width Scale

| Class       | Pixels | Use Case            |
| ----------- | ------ | ------------------- |
| `max-w-xs`  | 320px  | Tiny cards          |
| `max-w-sm`  | 384px  | Small cards         |
| `max-w-md`  | 448px  | **Forms**           |
| `max-w-lg`  | 512px  | **Modals**          |
| `max-w-xl`  | 576px  | Medium content      |
| `max-w-2xl` | 672px  | **Article content** |
| `max-w-3xl` | 768px  | Documentation       |
| `max-w-4xl` | 896px  | **Wide layouts**    |
| `max-w-5xl` | 1024px | Extra wide          |
| `max-w-6xl` | 1152px | Very wide           |
| `max-w-7xl` | 1280px | **Full page width** |

**Bold = most commonly used**

---

### Spacing Guidelines

#### ✅ DO

```tsx
// Use multiples of 4
<div className="p-4 space-y-6 mb-8">Content</div>

// Use gap for flex/grid
<div className="flex gap-4">
  <Button>Cancel</Button>
  <Button>Save</Button>
</div>

// Use space-y for stacks
<form className="space-y-4">
  <Input />
  <Input />
</form>

// Use responsive spacing
<div className="p-4 sm:p-6 lg:p-8">
  Responsive padding
</div>
```

#### ❌ DON'T

```tsx
// Don't use arbitrary values
<div className="p-[13px] mb-[17px]">Bad</div>

// Don't mix methods inconsistently
<div className="space-y-4">
  <div className="mb-2">Inconsistent</div>
  <div className="mb-6">Inconsistent</div>
</div>

// Don't forget responsive spacing
<div className="p-8">Too much padding on mobile</div>
```

**See [Spacing Philosophy](./04-spacing-philosophy.md) for detailed spacing strategy.**

---

## Shadows

Professional shadow system for depth and elevation:

```css
--shadow-xs:
  0 1px 3px 0px hsl(0 0% 0% / 0.05) --shadow-sm: 0 1px 3px 0px hsl(0 0% 0% / 0.1),
  0 1px 2px -1px hsl(0 0% 0% / 0.1) --shadow: 0 1px 3px 0px hsl(0 0% 0% / 0.1),
  0 1px 2px -1px hsl(0 0% 0% / 0.1) --shadow-md: 0 1px 3px 0px hsl(0 0% 0% / 0.1),
  0 2px 4px -1px hsl(0 0% 0% / 0.1) --shadow-lg: 0 1px 3px 0px hsl(0 0% 0% / 0.1),
  0 4px 6px -1px hsl(0 0% 0% / 0.1) --shadow-xl: 0 1px 3px 0px hsl(0 0% 0% / 0.1),
  0 8px 10px -1px hsl(0 0% 0% / 0.1) --shadow-2xl: 0 1px 3px 0px hsl(0 0% 0% / 0.25);
```

### Shadow Usage

| Elevation | Class        | Use Case                         |
| --------- | ------------ | -------------------------------- |
| Base      | No shadow    | Buttons, inline elements         |
| Low       | `shadow-sm`  | **Cards, panels**                |
| Medium    | `shadow-md`  | **Dropdowns, tooltips**          |
| High      | `shadow-lg`  | **Modals, popovers**             |
| Highest   | `shadow-xl`  | Notifications, floating elements |
| Maximum   | `shadow-2xl` | Dialogs (rare)                   |

**Usage**:

```tsx
// Card with subtle shadow
<Card className="shadow-sm">Card content</Card>

// Dropdown with medium shadow
<DropdownMenuContent className="shadow-md">
  Menu items
</DropdownMenuContent>

// Modal with high shadow
<DialogContent className="shadow-lg">
  Modal content
</DialogContent>

// Floating notification
<div className="fixed top-4 right-4 shadow-xl rounded-lg p-4">
  Notification
</div>
```

**Dark mode note**: Shadows are less visible in dark mode. Test both modes.

---

## Border Radius

Consistent rounded corners across the application:

```css
--radius: 0.375rem; /* 6px - base */

--radius-sm: calc(var(--radius) - 4px) /* 2px */ --radius-md: calc(var(--radius) - 2px) /* 4px */
  --radius-lg: var(--radius) /* 6px */ --radius-xl: calc(var(--radius) + 4px) /* 10px */;
```

### Border Radius Scale

| Token  | Class          | Pixels | Use Case                         |
| ------ | -------------- | ------ | -------------------------------- |
| None   | `rounded-none` | 0px    | Square elements                  |
| Small  | `rounded-sm`   | 2px    | **Tags, small badges**           |
| Medium | `rounded-md`   | 4px    | **Inputs, small buttons**        |
| Large  | `rounded-lg`   | 6px    | **Cards, buttons (default)**     |
| XL     | `rounded-xl`   | 10px   | **Large cards, modals**          |
| 2XL    | `rounded-2xl`  | 16px   | Hero sections                    |
| 3XL    | `rounded-3xl`  | 24px   | Very rounded                     |
| Full   | `rounded-full` | 9999px | **Pills, avatars, icon buttons** |

**Bold = most commonly used**

### Usage Examples

```tsx
// Button (default)
<Button className="rounded-lg">Default Button</Button>

// Input field
<Input className="rounded-md" />

// Card
<Card className="rounded-xl">Large card</Card>

// Avatar
<Avatar className="rounded-full">
  <AvatarImage src="/avatar.jpg" />
</Avatar>

// Badge/Tag
<Badge className="rounded-sm">Small tag</Badge>

// Pill button
<Button className="rounded-full">Pill Button</Button>
```

### Directional Radius

```tsx
// Top corners only
<div className="rounded-t-lg">Top rounded</div>

// Bottom corners only
<div className="rounded-b-lg">Bottom rounded</div>

// Left corners only
<div className="rounded-l-lg">Left rounded</div>

// Right corners only
<div className="rounded-r-lg">Right rounded</div>

// Individual corners
<div className="rounded-tl-lg rounded-br-lg">
  Top-left and bottom-right
</div>
```

---

## Quick Reference

### Most Used Tokens

**Colors**:

- `bg-primary text-primary-foreground` - CTAs
- `bg-destructive text-destructive-foreground` - Delete/errors
- `bg-muted text-muted-foreground` - Disabled/subtle
- `text-foreground` - Body text
- `text-muted-foreground` - Secondary text
- `border-border` - Borders

**Typography**:

- `text-3xl font-bold` - Page titles
- `text-2xl font-semibold` - Section headings
- `text-xl font-semibold` - Card titles
- `text-base` - Body text
- `text-sm text-muted-foreground` - Secondary text

**Spacing**:

- `p-4` - Standard padding (16px)
- `p-6` - Card padding (24px)
- `gap-4` - Standard gap (16px)
- `gap-6` - Section gap (24px)
- `space-y-4` - Form field spacing (16px)
- `space-y-6` - Section spacing (24px)

**Shadows & Radius**:

- `shadow-sm` - Cards
- `shadow-md` - Dropdowns
- `shadow-lg` - Modals
- `rounded-lg` - Buttons, cards (6px)
- `rounded-full` - Avatars, pills

---

## Next Steps

- **Quick Start**: [5-minute crash course](./00-quick-start.md)
- **Components**: [shadcn/ui component guide](./02-components.md)
- **Layouts**: [Layout patterns](./03-layouts.md)
- **Spacing**: [Spacing philosophy](./04-spacing-philosophy.md)
- **Reference**: [Quick lookup tables](./99-reference.md)

---

**Related Documentation:**

- [Quick Start](./00-quick-start.md) - Essential patterns
- [Components](./02-components.md) - shadcn/ui library
- [Spacing Philosophy](./04-spacing-philosophy.md) - Margin vs padding strategy
- [Accessibility](./07-accessibility.md) - WCAG compliance

**External Resources:**

- [OKLCH Color Picker](https://oklch.com)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

**Last Updated**: November 2, 2025
