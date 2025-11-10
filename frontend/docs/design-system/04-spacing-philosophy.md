# Spacing Philosophy

**Master the "parent controls children" spacing strategy** that eliminates 90% of layout inconsistencies. Learn when to use margin, padding, or gap—and why children should never add their own margins.

---

## Table of Contents

1. [The Golden Rules](#the-golden-rules)
2. [Parent Controls Children Strategy](#parent-controls-children-strategy)
3. [Decision Tree: Margin vs Padding vs Gap](#decision-tree-margin-vs-padding-vs-gap)
4. [Common Patterns](#common-patterns)
5. [Before/After Examples](#beforeafter-examples)
6. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
7. [Quick Reference](#quick-reference)

---

## The Golden Rules

These 5 rules eliminate 90% of spacing inconsistencies:

### Rule 1: Parent Controls Children

**Children don't add their own margins. The parent controls spacing between siblings.**

```tsx
// ✅ CORRECT - Parent controls spacing
<div className="space-y-4">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</div>

// ❌ WRONG - Children add margins
<div>
  <Card className="mb-4">Item 1</Card>
  <Card className="mb-4">Item 2</Card>
  <Card>Item 3</Card>  {/* Inconsistent: last one has no margin */}
</div>
```

**Why this matters:**

- Eliminates "last child" edge cases
- Makes components reusable (they work in any context)
- Changes propagate from one place (parent)
- Prevents margin collapsing bugs

---

### Rule 2: Use Gap for Siblings

**For flex and grid layouts, use `gap-*` to space siblings.**

```tsx
// ✅ CORRECT - Gap for flex/grid
<div className="flex gap-4">
  <Button>Cancel</Button>
  <Button>Save</Button>
</div>

<div className="grid grid-cols-3 gap-6">
  <Card>1</Card>
  <Card>2</Card>
  <Card>3</Card>
</div>

// ❌ WRONG - Children with margins
<div className="flex">
  <Button className="mr-4">Cancel</Button>
  <Button>Save</Button>
</div>
```

---

### Rule 3: Use Padding for Internal Spacing

**Padding is for spacing _inside_ a component, between the border and content.**

```tsx
// ✅ CORRECT - Padding for internal spacing
<Card className="p-6">
  <CardTitle>Title</CardTitle>
  <CardContent>Content</CardContent>
</Card>

// ❌ WRONG - Using margin for internal spacing
<Card>
  <CardTitle className="m-6">Title</CardTitle>
</Card>
```

---

### Rule 4: Use space-y for Vertical Stacks

**For vertical stacks (not flex/grid), use `space-y-*` utility.**

```tsx
// ✅ CORRECT - space-y for stacks
<form className="space-y-4">
  <Input />
  <Input />
  <Button />
</form>

// ❌ WRONG - Children with margins
<form>
  <Input className="mb-4" />
  <Input className="mb-4" />
  <Button />
</form>
```

**How space-y works:**

```css
/* space-y-4 applies margin-top to all children except first */
.space-y-4 > * + * {
  margin-top: 1rem; /* 16px */
}
```

---

### Rule 5: Margins Only for Exceptions

**Use margin only when a specific child needs different spacing from its siblings.**

```tsx
// ✅ CORRECT - Margin for exception
<div className="space-y-4">
  <Card>Normal spacing</Card>
  <Card>Normal spacing</Card>
  <Card className="mt-8">Extra spacing above this one</Card>
  <Card>Normal spacing</Card>
</div>

// Use case: Visually group related items
<div className="space-y-4">
  <h2>Section 1</h2>
  <p>Content</p>
  <h2 className="mt-12">Section 2</h2>  {/* Extra margin to separate sections */}
  <p>Content</p>
</div>
```

---

## Parent Controls Children Strategy

### The Problem with Child-Controlled Spacing

When children control their own margins:

```tsx
// ❌ ANTI-PATTERN
function TodoItem({ className }: { className?: string }) {
  return <div className={cn('mb-4', className)}>Todo</div>;
}

// Usage
<div>
  <TodoItem /> {/* Has mb-4 */}
  <TodoItem /> {/* Has mb-4 */}
  <TodoItem /> {/* Has mb-4 - unwanted margin at bottom! */}
</div>;
```

**Problems:**

1. ❌ Last item has unwanted margin
2. ❌ Can't change spacing without modifying component
3. ❌ Margin collapsing creates unpredictable spacing
4. ❌ Component not reusable in different contexts

---

### The Solution: Parent-Controlled Spacing

```tsx
// ✅ CORRECT PATTERN
function TodoItem({ className }: { className?: string }) {
  return <div className={className}>Todo</div>;  // No margin!
}

// Parent controls spacing
<div className="space-y-4">
  <TodoItem />
  <TodoItem />
  <TodoItem />  {/* No unwanted margin */}
</div>

// Different context, different spacing
<div className="space-y-2">
  <TodoItem />
  <TodoItem />
</div>

// Another context, flex layout
<div className="flex gap-6">
  <TodoItem />
  <TodoItem />
</div>
```

**Benefits:**

1. ✅ No edge cases (last child, first child, only child)
2. ✅ Spacing controlled in one place
3. ✅ Component works in any layout context
4. ✅ No margin collapsing surprises
5. ✅ Easier to maintain and modify

---

## Decision Tree: Margin vs Padding vs Gap

Use this flowchart to choose the right spacing method:

```
┌─────────────────────────────────────────────┐
│ What are you spacing?                       │
└─────────────┬───────────────────────────────┘
              │
       ┌──────┴──────┐
       │             │
       ▼             ▼
   Siblings?    Inside a component?
       │             │
       │             └──> USE PADDING
       │                  className="p-4"
       │
       ├──> Is parent using flex or grid?
       │    │
       │    ├─YES──> USE GAP
       │    │        className="flex gap-4"
       │    │        className="grid gap-6"
       │    │
       │    └─NO───> USE SPACE-Y or SPACE-X
       │             className="space-y-4"
       │             className="space-x-2"
       │
       └──> Exception case?
            (One child needs different spacing)
            │
            └──> USE MARGIN
                 className="mt-8"
```

---

## Common Patterns

### Pattern 1: Form Fields (Vertical Stack)

```tsx
// ✅ CORRECT
<form className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input id="email" />
  </div>

  <div className="space-y-2">
    <Label htmlFor="password">Password</Label>
    <Input id="password" />
  </div>

  <Button type="submit">Submit</Button>
</form>
```

**Spacing breakdown:**

- `space-y-4` on form: 16px between field groups
- `space-y-2` on field group: 8px between label and input
- No margins on children

---

### Pattern 2: Button Group (Horizontal Flex)

```tsx
// ✅ CORRECT
<div className="flex gap-4">
  <Button variant="outline">Cancel</Button>
  <Button>Save</Button>
</div>

// Responsive: stack on mobile, row on desktop
<div className="flex flex-col sm:flex-row gap-4">
  <Button variant="outline">Cancel</Button>
  <Button>Save</Button>
</div>
```

**Why gap over space-x:**

- Works with `flex-wrap`
- Works with `flex-col` (changes direction)
- Consistent spacing in all directions

---

### Pattern 3: Card Grid

```tsx
// ✅ CORRECT
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</div>
```

**Why gap:**

- Consistent spacing between rows and columns
- Works with responsive grid changes
- No edge cases (first row, last column, etc.)

---

### Pattern 4: Card Internal Spacing

```tsx
// ✅ CORRECT
<Card className="p-6">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <p>Paragraph 1</p>
    <p>Paragraph 2</p>
  </CardContent>
  <CardFooter className="pt-4">
    <Button>Action</Button>
  </CardFooter>
</Card>
```

**Spacing breakdown:**

- `p-6` on Card: 24px internal padding
- `space-y-4` on CardContent: 16px between paragraphs
- `pt-4` on CardFooter: Additional top padding for visual separation

---

### Pattern 5: Page Layout

```tsx
// ✅ CORRECT
<div className="container mx-auto px-4 py-8">
  <div className="max-w-4xl mx-auto space-y-6">
    <h1 className="text-3xl font-bold">Page Title</h1>

    <Card>
      <CardHeader>
        <CardTitle>Section 1</CardTitle>
      </CardHeader>
      <CardContent>Content</CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Section 2</CardTitle>
      </CardHeader>
      <CardContent>Content</CardContent>
    </Card>
  </div>
</div>
```

**Spacing breakdown:**

- `px-4`: Horizontal padding (prevents edge touching)
- `py-8`: Vertical padding (top and bottom spacing)
- `space-y-6`: 24px between sections
- No margins on children

---

## Before/After Examples

### Example 1: Button Group

#### ❌ Before (Child-Controlled)

```tsx
function ActionButton({ children, className }: Props) {
  return <Button className={cn('mr-4', className)}>{children}</Button>;
}

// Usage
<div className="flex">
  <ActionButton>Cancel</ActionButton>
  <ActionButton>Save</ActionButton>
  <ActionButton>Delete</ActionButton> {/* Unwanted mr-4 */}
</div>;
```

**Problems:**

- Last button has unwanted margin
- Can't change spacing without modifying component
- Hard to use in vertical layout

#### ✅ After (Parent-Controlled)

```tsx
function ActionButton({ children, className }: Props) {
  return <Button className={className}>{children}</Button>;
}

// Usage
<div className="flex gap-4">
  <ActionButton>Cancel</ActionButton>
  <ActionButton>Save</ActionButton>
  <ActionButton>Delete</ActionButton>
</div>

// Different context: vertical
<div className="flex flex-col gap-2">
  <ActionButton>Cancel</ActionButton>
  <ActionButton>Save</ActionButton>
</div>
```

**Benefits:**

- No edge cases
- Reusable in any layout
- Easy to change spacing

---

### Example 2: List Items

#### ❌ Before (Child-Controlled)

```tsx
function ListItem({ title, description }: Props) {
  return (
    <div className="mb-6 p-4 border rounded">
      <h3 className="mb-2">{title}</h3>
      <p>{description}</p>
    </div>
  );
}

<div>
  <ListItem title="Item 1" description="..." />
  <ListItem title="Item 2" description="..." />
  <ListItem title="Item 3" description="..." /> {/* Unwanted mb-6 */}
</div>;
```

**Problems:**

- Last item has unwanted bottom margin
- Can't change list spacing without modifying component
- Internal `mb-2` hard to override

#### ✅ After (Parent-Controlled)

```tsx
function ListItem({ title, description }: Props) {
  return (
    <div className="p-4 border rounded">
      <div className="space-y-2">
        <h3 className="font-semibold">{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

<div className="space-y-6">
  <ListItem title="Item 1" description="..." />
  <ListItem title="Item 2" description="..." />
  <ListItem title="Item 3" description="..." />
</div>

// Different context: compact spacing
<div className="space-y-2">
  <ListItem title="Item 1" description="..." />
  <ListItem title="Item 2" description="..." />
</div>
```

**Benefits:**

- No unwanted margins
- Internal spacing controlled by `space-y-2`
- Reusable with different spacings

---

### Example 3: Form Fields

#### ❌ Before (Mixed Strategy)

```tsx
<form>
  <div className="mb-4">
    <Label htmlFor="name">Name</Label>
    <Input id="name" className="mt-2" />
  </div>

  <div className="mb-4">
    <Label htmlFor="email">Email</Label>
    <Input id="email" className="mt-2" />
  </div>

  <Button type="submit" className="mt-6">
    Submit
  </Button>
</form>
```

**Problems:**

- Spacing scattered across children
- Hard to change consistently
- Have to remember `mt-6` for button

#### ✅ After (Parent-Controlled)

```tsx
<form className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="name">Name</Label>
    <Input id="name" />
  </div>

  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input id="email" />
  </div>

  <Button type="submit" className="mt-2">
    Submit
  </Button>
</form>
```

**Benefits:**

- Spacing controlled in 2 places: form (`space-y-4`) and field groups (`space-y-2`)
- Easy to change all field spacing at once
- Consistent and predictable

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Last Child Special Case

```tsx
// ❌ WRONG
{
  items.map((item, index) => (
    <Card key={item.id} className={index < items.length - 1 ? 'mb-4' : ''}>
      {item.name}
    </Card>
  ));
}

// ✅ CORRECT
<div className="space-y-4">
  {items.map((item) => (
    <Card key={item.id}>{item.name}</Card>
  ))}
</div>;
```

---

### Anti-Pattern 2: Negative Margins to Fix Spacing

```tsx
// ❌ WRONG - Using negative margin to fix unwanted spacing
<div className="-mt-4">  {/* Canceling out previous margin */}
  <Card>Content</Card>
</div>

// ✅ CORRECT - Parent controls spacing
<div className="space-y-4">
  <Card>Content</Card>
</div>
```

**Why negative margins are bad:**

- Indicates broken spacing strategy
- Hard to maintain
- Creates coupling between components

---

### Anti-Pattern 3: Mixing Gap and Child Margins

```tsx
// ❌ WRONG - Gap + child margins = unpredictable spacing
<div className="flex gap-4">
  <Button className="mr-2">Cancel</Button>  {/* gap + mr-2 = 24px */}
  <Button>Save</Button>
</div>

// ✅ CORRECT - Only gap
<div className="flex gap-4">
  <Button>Cancel</Button>
  <Button>Save</Button>
</div>

// ✅ CORRECT - Exception case
<div className="flex gap-4">
  <Button>Cancel</Button>
  <Button className="mr-8">Save</Button>  {/* Intentional extra space */}
  <Button>Delete</Button>
</div>
```

---

### Anti-Pattern 4: Using Margins for Layout

```tsx
// ❌ WRONG - Using margins to create layout
<div>
  <div className="ml-64">  {/* Pushing content for sidebar */}
    Content
  </div>
</div>

// ✅ CORRECT - Use proper layout (flex/grid)
<div className="flex gap-6">
  <aside className="w-64">Sidebar</aside>
  <main className="flex-1">Content</main>
</div>
```

---

## Quick Reference

### Spacing Method Cheat Sheet

| Use Case                | Method      | Example      |
| ----------------------- | ----------- | ------------ |
| **Flex siblings**       | `gap-*`     | `flex gap-4` |
| **Grid siblings**       | `gap-*`     | `grid gap-6` |
| **Vertical stack**      | `space-y-*` | `space-y-4`  |
| **Horizontal stack**    | `space-x-*` | `space-x-2`  |
| **Inside component**    | `p-*`       | `p-6`        |
| **One child exception** | `m-*`       | `mt-8`       |

### Common Spacing Values

| Class                  | Pixels      | Usage                  |
| ---------------------- | ----------- | ---------------------- |
| `gap-2` or `space-y-2` | 8px         | Tight (label + input)  |
| `gap-4` or `space-y-4` | 16px        | Standard (form fields) |
| `gap-6` or `space-y-6` | 24px        | Sections (cards)       |
| `gap-8` or `space-y-8` | 32px        | Large gaps             |
| `p-4`                  | 16px        | Standard padding       |
| `p-6`                  | 24px        | Card padding           |
| `px-4 py-8`            | 16px / 32px | Page padding           |

### Decision Flowchart (Simplified)

```
Need spacing?
│
├─ Between siblings?
│  ├─ Flex/Grid parent? → gap-*
│  └─ Regular parent? → space-y-* or space-x-*
│
├─ Inside component? → p-*
│
└─ Exception case? → m-* (sparingly)
```

---

## Best Practices Summary

### Do ✅

1. **Use parent-controlled spacing** (`gap`, `space-y`, `space-x`)
2. **Use `gap-*` for flex and grid** layouts
3. **Use `space-y-*` for vertical stacks** (forms, content)
4. **Use `p-*` for internal spacing** (padding inside components)
5. **Use margin only for exceptions** (mt-8 to separate sections)
6. **Let components be context-agnostic** (no built-in margins)

### Don't ❌

1. ❌ Add margins to reusable components
2. ❌ Use last-child selectors or conditional margins
3. ❌ Mix gap with child margins
4. ❌ Use negative margins to fix spacing
5. ❌ Use margins for layout (use flex/grid)
6. ❌ Hard-code spacing in child components

---

## Spacing Checklist

Before implementing spacing, verify:

- [ ] **Parent controls children?** Using gap or space-y/x?
- [ ] **No child margins?** Components don't have mb-_ or mr-_?
- [ ] **Consistent method?** Not mixing gap + child margins?
- [ ] **Reusable components?** Work in different contexts?
- [ ] **No edge cases?** No last-child or first-child special handling?
- [ ] **Semantic spacing?** Using design system scale (4, 8, 12, 16...)?

---

## Next Steps

- **Practice**: Refactor existing components to use parent-controlled spacing
- **Explore**: [Interactive spacing examples](/dev/spacing)
- **Reference**: [Quick Reference Tables](./99-reference.md)
- **Layout Patterns**: [Layouts Guide](./03-layouts.md)

---

**Related Documentation:**

- [Layouts](./03-layouts.md) - When to use Grid vs Flex
- [Foundations](./01-foundations.md) - Spacing scale tokens
- [Component Creation](./05-component-creation.md) - Building reusable components
- [Quick Start](./00-quick-start.md) - Essential patterns

**Last Updated**: November 2, 2025
