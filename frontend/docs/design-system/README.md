# Design System Documentation

**FastNext Template Design System** - A comprehensive guide to building consistent, accessible, and beautiful user interfaces.

---

## 🚀 Quick Navigation

| For... | Start Here | Time |
|--------|-----------|------|
| **Quick Start** | [⚡ 5-Minute Crash Course](./00-quick-start.md) | 5 min |
| **Component Development** | [🧩 Components](./02-components.md) → [🔨 Creation Guide](./05-component-creation.md) | 15 min |
| **Layout Design** | [📐 Layouts](./03-layouts.md) → [📏 Spacing](./04-spacing-philosophy.md) | 20 min |
| **AI Code Generation** | [🤖 AI Guidelines](./08-ai-guidelines.md) | 3 min |
| **Quick Reference** | [📚 Reference Tables](./99-reference.md) | Instant |
| **Complete Guide** | Read all docs in order | 1 hour |

---

## 📖 Documentation Structure

### Getting Started
- **[00. Quick Start](./00-quick-start.md)** ⚡
  - 5-minute crash course
  - Essential components and patterns
  - Copy-paste ready examples

### Fundamentals
- **[01. Foundations](./01-foundations.md)** 🎨
  - Color system (OKLCH)
  - Typography scale
  - Spacing tokens
  - Shadows & radius

- **[02. Components](./02-components.md)** 🧩
  - shadcn/ui component library
  - All variants documented
  - Usage examples
  - Composition patterns

### Layouts & Spacing
- **[03. Layouts](./03-layouts.md)** 📐
  - Grid vs Flex decision tree
  - Common layout patterns
  - Responsive strategies
  - Before/after examples

- **[04. Spacing Philosophy](./04-spacing-philosophy.md)** 📏
  - Parent vs child spacing rules
  - Margin vs padding strategy
  - Gap vs margin for flex/grid
  - Consistency patterns

### Building Components
- **[05. Component Creation](./05-component-creation.md)** 🔨
  - When to create vs compose
  - Component templates
  - Variant patterns (CVA)
  - Testing checklist

- **[06. Forms](./06-forms.md)** 📝
  - Form patterns & validation
  - Error state UI
  - Loading states
  - Multi-field examples

### Best Practices
- **[07. Accessibility](./07-accessibility.md)** ♿
  - WCAG AA compliance
  - Keyboard navigation
  - Screen reader support
  - ARIA attributes

- **[08. AI Guidelines](./08-ai-guidelines.md)** 🤖
  - Rules for AI code generation
  - Required patterns
  - Forbidden practices
  - Component templates

### Reference
- **[99. Reference Tables](./99-reference.md)** 📚
  - Quick lookup tables
  - All tokens at a glance
  - Cheat sheet

---

## 🎪 Interactive Examples

Explore live examples and copy-paste code:

- **[Component Showcase](/dev/components)** - All shadcn/ui components with variants
- **[Layout Patterns](/dev/layouts)** - Before/after comparisons of layouts
- **[Spacing Examples](/dev/spacing)** - Visual spacing demonstrations
- **[Form Patterns](/dev/forms)** - Complete form examples

Each demo page includes:
- ✅ Live, interactive examples
- ✅ Click-to-copy code snippets
- ✅ Before/after comparisons
- ✅ Links to documentation

---

## 🛤️ Learning Paths

### Path 1: Speedrun (5 minutes)
**Goal**: Start building immediately

1. [Quick Start](./00-quick-start.md) - Essential patterns
2. [Reference](./99-reference.md) - Bookmark for lookup
3. Start coding!

**When to use**: You need to build something NOW and will learn deeply later.

---

### Path 2: Component Developer (15 minutes)
**Goal**: Master component building

1. [Quick Start](./00-quick-start.md) - Basics
2. [Components](./02-components.md) - shadcn/ui library
3. [Component Creation](./05-component-creation.md) - Building custom components
4. [Reference](./99-reference.md) - Bookmark

**When to use**: You're building reusable components or UI library.

---

### Path 3: Layout Specialist (20 minutes)
**Goal**: Master layouts and spacing

1. [Quick Start](./00-quick-start.md) - Basics
2. [Foundations](./01-foundations.md) - Spacing tokens
3. [Layouts](./03-layouts.md) - Grid vs Flex patterns
4. [Spacing Philosophy](./04-spacing-philosophy.md) - Margin/padding rules
5. [Reference](./99-reference.md) - Bookmark

**When to use**: You're designing page layouts or dashboard UIs.

---

### Path 4: Form Specialist (15 minutes)
**Goal**: Master forms and validation

1. [Quick Start](./00-quick-start.md) - Basics
2. [Components](./02-components.md) - Form components
3. [Forms](./06-forms.md) - Patterns & validation
4. [Accessibility](./07-accessibility.md) - ARIA for forms
5. [Reference](./99-reference.md) - Bookmark

**When to use**: You're building forms with complex validation.

---

### Path 5: AI Setup (3 minutes)
**Goal**: Configure AI for perfect code generation

1. [AI Guidelines](./08-ai-guidelines.md) - Read once, code forever
2. Reference this in your AI context/prompts

**When to use**: You're using AI assistants (Claude, GitHub Copilot, etc.) to generate code.

---

### Path 6: Comprehensive Mastery (1 hour)
**Goal**: Complete understanding of the design system

Read all documents in order:
1. [Quick Start](./00-quick-start.md)
2. [Foundations](./01-foundations.md)
3. [Components](./02-components.md)
4. [Layouts](./03-layouts.md)
5. [Spacing Philosophy](./04-spacing-philosophy.md)
6. [Component Creation](./05-component-creation.md)
7. [Forms](./06-forms.md)
8. [Accessibility](./07-accessibility.md)
9. [AI Guidelines](./08-ai-guidelines.md)
10. [Reference](./99-reference.md)

Explore all [interactive demos](/dev).

**When to use**: You're the design system maintainer or want complete mastery.

---

## 🎯 Key Principles

Our design system is built on these core principles:

1. **🎨 Semantic First** - Use `bg-primary`, not `bg-blue-500`
2. **♿ Accessible by Default** - WCAG AA minimum, keyboard-first
3. **📐 Consistent Spacing** - Multiples of 4px (0.25rem)
4. **🧩 Compose, Don't Create** - Use shadcn/ui primitives
5. **🌗 Dark Mode Ready** - All components work in light/dark
6. **⚡ Pareto Efficient** - 80% of needs with 20% of patterns

---

## 🏗️ Technology Stack

- **Framework**: Next.js 15 + React 19
- **Styling**: Tailwind CSS 4 (CSS-first configuration)
- **Components**: shadcn/ui (New York style)
- **Color Space**: OKLCH (perceptually uniform)
- **Icons**: lucide-react
- **Fonts**: Geist Sans + Geist Mono

---

## 🤝 Contributing to the Design System

### Adding a New Component
1. Read [Component Creation Guide](./05-component-creation.md)
2. Follow the template
3. Add to [Component Showcase](/dev/components)
4. Document in [Components](./02-components.md)

### Adding a New Pattern
1. Validate it solves a real need (used 3+ times)
2. Document in appropriate guide
3. Add to [Reference](./99-reference.md)
4. Create example in `/dev/`

### Updating Colors/Tokens
1. Edit `src/app/globals.css`
2. Test in both light and dark modes
3. Verify WCAG AA contrast
4. Update [Foundations](./01-foundations.md)

---

## 📝 Quick Reference

### Most Common Patterns

```tsx
// Button
<Button variant="default">Action</Button>
<Button variant="destructive">Delete</Button>

// Card
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// Form Input
<Label htmlFor="email">Email</Label>
<Input id="email" type="email" {...field} />
{errors.email && (
  <p className="text-sm text-destructive">{errors.email.message}</p>
)}

// Layout
<div className="container mx-auto px-4 py-8">
  <div className="max-w-4xl mx-auto space-y-6">
    {/* Content */}
  </div>
</div>

// Grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => <Card key={item.id}>...</Card>)}
</div>
```

---

## 🆘 Need Help?

1. **Quick Answer**: Check [Reference](./99-reference.md)
2. **Pattern Question**: Search relevant doc (Layouts, Components, etc.)
3. **Can't Find It**: Browse [Interactive Examples](/dev)
4. **Still Stuck**: Read [Quick Start](./00-quick-start.md) or [Comprehensive Guide](#path-6-comprehensive-mastery-1-hour)

---

## 📊 Design System Metrics

- **Components**: 20+ shadcn/ui components
- **Color Tokens**: 25+ semantic color variables
- **Layout Patterns**: 5 essential patterns (80% coverage)
- **Spacing Scale**: 14 token sizes (0-16)
- **Typography Scale**: 9 sizes (xs-9xl)
- **Test Coverage**: All patterns demonstrated in /dev/

---

## 📚 External Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS 4 Documentation](https://tailwindcss.com/docs)
- [OKLCH Color Picker](https://oklch.com)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)

---

**Last Updated**: November 2, 2025
**Version**: 1.0
**Maintainer**: Design System Team
