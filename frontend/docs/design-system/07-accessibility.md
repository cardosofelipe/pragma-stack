# Accessibility Guide

**Build inclusive, accessible interfaces** that work for everyone. Learn WCAG AA standards, keyboard navigation, screen reader support, and testing strategies.

---

## Table of Contents

1. [Accessibility Standards](#accessibility-standards)
2. [Color Contrast](#color-contrast)
3. [Keyboard Navigation](#keyboard-navigation)
4. [Screen Reader Support](#screen-reader-support)
5. [ARIA Attributes](#aria-attributes)
6. [Focus Management](#focus-management)
7. [Testing](#testing)
8. [Accessibility Checklist](#accessibility-checklist)

---

## Accessibility Standards

### WCAG 2.1 Level AA

We follow **WCAG 2.1 Level AA** as the **minimum** standard.

**Why Level AA?**
- ✅ Required for most legal compliance (ADA, Section 508)
- ✅ Covers 95%+ of accessibility needs
- ✅ Achievable without major UX compromises
- ✅ Industry standard for modern web apps

**WCAG Principles (POUR):**
1. **Perceivable** - Information can be perceived by users
2. **Operable** - Interface can be operated by users
3. **Understandable** - Information and operation are understandable
4. **Robust** - Content works with current and future technologies

---

### Accessibility Decision Tree

```
Creating a UI element?
│
├─ Is it interactive?
│  ├─YES─> Can it be focused with Tab?
│  │       ├─YES─> ✅ Good
│  │       └─NO──> ❌ Add tabIndex or use button/link
│  │
│  └─NO──> Is it important information?
│          ├─YES─> Does it have appropriate semantic markup?
│          │       ├─YES─> ✅ Good
│          │       └─NO──> ❌ Use h1-h6, p, ul, etc.
│          │
│          └─NO──> Is it purely decorative?
│                  ├─YES─> Add aria-hidden="true"
│                  └─NO──> Add alt text or ARIA label
```

---

## Color Contrast

### Minimum Contrast Ratios (WCAG AA)

| Content Type | Minimum Ratio | Example |
|--------------|---------------|---------|
| **Normal text** (< 18px) | **4.5:1** | Body paragraphs, form labels |
| **Large text** (≥ 18px or ≥ 14px bold) | **3:1** | Headings, subheadings |
| **UI components** | **3:1** | Buttons, form borders, icons |
| **Graphical objects** | **3:1** | Chart elements, infographics |

**WCAG AAA (ideal, not required):**
- Normal text: 7:1
- Large text: 4.5:1

---

### Testing Color Contrast

**Tools:**
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Chrome DevTools: Inspect element → Accessibility panel
- [Contrast Ratio Tool](https://contrast-ratio.com)
- Browser extensions: axe DevTools, WAVE

**Example:**

```tsx
// ✅ GOOD - 4.7:1 contrast (WCAG AA pass)
<p className="text-foreground">  // oklch(0.1529 0 0) on white
  Body text
</p>

// ❌ BAD - 2.1:1 contrast (WCAG AA fail)
<p className="text-gray-400">  // Too light
  Body text
</p>

// ✅ GOOD - Using semantic tokens ensures contrast
<p className="text-muted-foreground">
  Secondary text
</p>
```

**Our design system tokens are WCAG AA compliant:**
- `text-foreground` on `bg-background`: 12.6:1 ✅
- `text-primary-foreground` on `bg-primary`: 8.2:1 ✅
- `text-destructive` on `bg-background`: 5.1:1 ✅
- `text-muted-foreground` on `bg-background`: 4.6:1 ✅

---

### Color Blindness

**8% of men and 0.5% of women** have some form of color blindness.

**Best practices:**
- ❌ Don't rely on color alone to convey information
- ✅ Use icons, text labels, or patterns in addition to color
- ✅ Test with color blindness simulators

**Example:**

```tsx
// ❌ BAD - Color only
<div className="text-green-600">Success</div>
<div className="text-red-600">Error</div>

// ✅ GOOD - Color + icon + text
<Alert variant="success">
  <CheckCircle className="h-4 w-4" />
  <AlertTitle>Success</AlertTitle>
  <AlertDescription>Operation completed</AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong</AlertDescription>
</Alert>
```

---

## Keyboard Navigation

### Core Requirements

All interactive elements must be:
1. ✅ **Focusable** - Can be reached with Tab key
2. ✅ **Activatable** - Can be triggered with Enter or Space
3. ✅ **Navigable** - Can move between with arrow keys (where appropriate)
4. ✅ **Escapable** - Can be closed/exited with Escape key

---

### Tab Order

**Natural tab order** follows DOM order (top to bottom, left to right).

```tsx
// ✅ GOOD - Natural tab order
<form>
  <Input />  {/* Tab 1 */}
  <Input />  {/* Tab 2 */}
  <Button>Submit</Button>  {/* Tab 3 */}
</form>

// ❌ BAD - Using tabIndex to force order
<form>
  <Input tabIndex={2} />  // Don't do this
  <Input tabIndex={1} />
  <Button tabIndex={3}>Submit</Button>
</form>
```

**When to use `tabIndex`:**
- `tabIndex={0}` - Make non-interactive element focusable
- `tabIndex={-1}` - Remove from tab order (for programmatic focus)
- `tabIndex={1+}` - ❌ **Avoid** - Breaks natural order

---

### Keyboard Shortcuts

| Key | Action | Example |
|-----|--------|---------|
| **Tab** | Move focus forward | Navigate through form fields |
| **Shift + Tab** | Move focus backward | Go back to previous field |
| **Enter** | Activate button/link | Submit form, follow link |
| **Space** | Activate button/checkbox | Toggle checkbox, click button |
| **Escape** | Close overlay | Close dialog, dropdown |
| **Arrow keys** | Navigate within component | Navigate dropdown items |
| **Home** | Jump to start | First item in list |
| **End** | Jump to end | Last item in list |

---

### Implementing Keyboard Navigation

**Button (automatic):**
```tsx
// ✅ Button is keyboard accessible by default
<Button onClick={handleClick}>
  Click me
</Button>
// Enter or Space triggers onClick
```

**Custom clickable div (needs work):**
```tsx
// ❌ BAD - Not keyboard accessible
<div onClick={handleClick}>
  Click me
</div>

// ✅ GOOD - Make it accessible
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>
  Click me
</div>

// ✅ BETTER - Just use a button
<button onClick={handleClick}>
  Click me
</button>
```

**Dropdown navigation:**
```tsx
<DropdownMenu>
  <DropdownMenuContent>
    <DropdownMenuItem>Edit</DropdownMenuItem>  {/* Arrow down */}
    <DropdownMenuItem>Delete</DropdownMenuItem>  {/* Arrow down */}
  </DropdownMenuContent>
</DropdownMenu>
// shadcn/ui handles arrow key navigation automatically
```

---

### Skip Links

**Allow keyboard users to skip navigation:**

```tsx
// Add to layout
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg"
>
  Skip to main content
</a>

<nav>{/* Navigation */}</nav>

<main id="main-content">
  {/* Main content */}
</main>
```

---

## Screen Reader Support

### Screen Reader Basics

**Popular screen readers:**
- **NVDA** (Windows) - Free, most popular for testing
- **JAWS** (Windows) - Industry standard, paid
- **VoiceOver** (macOS/iOS) - Built-in to Apple devices
- **TalkBack** (Android) - Built-in to Android

**What screen readers announce:**
- Semantic element type (button, link, heading, etc.)
- Element text content
- Element state (expanded, selected, disabled)
- ARIA labels and descriptions

---

### Semantic HTML

**Use the right HTML element for the job:**

```tsx
// ✅ GOOD - Semantic HTML
<header>
  <nav>
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/about">About</a></li>
    </ul>
  </nav>
</header>

<main>
  <article>
    <h1>Page Title</h1>
    <p>Content...</p>
  </article>
</main>

<footer>
  <p>&copy; 2025 Company</p>
</footer>

// ❌ BAD - Div soup
<div>
  <div>
    <div>
      <div onClick={goHome}>Home</div>
      <div onClick={goAbout}>About</div>
    </div>
  </div>
</div>

<div>
  <div>
    <div>Page Title</div>
    <div>Content...</div>
  </div>
</div>
```

**Semantic elements:**
- `<header>` - Page header
- `<nav>` - Navigation
- `<main>` - Main content (only one per page)
- `<article>` - Self-contained content
- `<section>` - Thematic grouping
- `<aside>` - Sidebar content
- `<footer>` - Page footer
- `<h1>` - `<h6>` - Headings (hierarchical)
- `<button>` - Buttons
- `<a>` - Links

---

### Alt Text for Images

```tsx
// ✅ GOOD - Descriptive alt text
<img src="/chart.png" alt="Bar chart showing 20% increase in sales from January to February" />

// ✅ GOOD - Decorative images
<img src="/decorative.png" alt="" />  // Empty alt for decorative
// OR
<img src="/decorative.png" aria-hidden="true" />

// ❌ BAD - Generic or missing alt
<img src="/chart.png" alt="image" />
<img src="/chart.png" />  // No alt
```

**Icon-only buttons:**
```tsx
// ✅ GOOD - ARIA label
<Button size="icon" aria-label="Close dialog">
  <X className="h-4 w-4" />
</Button>

// ❌ BAD - No label
<Button size="icon">
  <X className="h-4 w-4" />
</Button>
```

---

## ARIA Attributes

### Common ARIA Attributes

**ARIA roles:**
```tsx
<div role="button" tabIndex={0}>Custom Button</div>
<div role="alert">Error message</div>
<div role="status">Loading...</div>
<div role="navigation">...</div>
```

**ARIA states:**
```tsx
<button aria-expanded={isOpen}>Toggle Menu</button>
<button aria-pressed={isActive}>Toggle</button>
<input aria-invalid={!!errors.email} />
<div aria-disabled="true">Disabled Item</div>
```

**ARIA properties:**
```tsx
<button aria-label="Close">×</button>
<input aria-describedby="email-help" />
<input aria-required="true" />
<div aria-live="polite">Status updates</div>
<div aria-hidden="true">Decorative content</div>
```

---

### Form Accessibility

**Label association:**
```tsx
// ✅ GOOD - Explicit association
<Label htmlFor="email">Email</Label>
<Input id="email" type="email" />

// ❌ BAD - No association
<div>Email</div>
<Input type="email" />
```

**Error messages:**
```tsx
// ✅ GOOD - Linked with aria-describedby
<Label htmlFor="password">Password</Label>
<Input
  id="password"
  type="password"
  aria-invalid={!!errors.password}
  aria-describedby={errors.password ? 'password-error' : undefined}
/>
{errors.password && (
  <p id="password-error" className="text-sm text-destructive">
    {errors.password.message}
  </p>
)}

// ❌ BAD - No association
<Input type="password" />
{errors.password && <p>{errors.password.message}</p>}
```

**Required fields:**
```tsx
// ✅ GOOD - Marked as required
<Label htmlFor="name">
  Name <span className="text-destructive">*</span>
</Label>
<Input id="name" required aria-required="true" />

// Screen reader announces: "Name, required, edit text"
```

---

### Live Regions

**Announce dynamic updates:**

```tsx
// Polite (waits for user to finish)
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// Assertive (interrupts immediately)
<div aria-live="assertive" role="alert">
  {errorMessage}
</div>

// Example: Toast notifications (sonner uses this)
toast.success('User created');
// Announces: "Success. User created."
```

---

## Focus Management

### Visible Focus Indicators

**All interactive elements must have visible focus:**

```tsx
// ✅ GOOD - shadcn/ui components have focus rings
<Button>Click me</Button>
// Shows ring on focus

// ✅ GOOD - Custom focus styles
<div
  tabIndex={0}
  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
>
  Focusable content
</div>

// ❌ BAD - Removing focus outline
<button style={{ outline: 'none' }}>Bad</button>
```

**Use `:focus-visible` instead of `:focus`:**
- `:focus` - Shows on mouse click AND keyboard
- `:focus-visible` - Shows only on keyboard (better UX)

---

### Focus Trapping

**Dialogs should trap focus:**

```tsx
// shadcn/ui Dialog automatically traps focus
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    {/* Focus trapped inside */}
    <Input autoFocus />  {/* Focus first field */}
    <Button>Submit</Button>
  </DialogContent>
</Dialog>

// When dialog closes, focus returns to trigger button
```

---

### Programmatic Focus

**Set focus after actions:**

```tsx
const inputRef = useRef<HTMLInputElement>(null);

const handleDelete = () => {
  deleteUser();
  // Return focus to a relevant element
  inputRef.current?.focus();
};

<Input ref={inputRef} />
```

---

## Testing

### Automated Testing Tools

**Browser extensions:**
- [axe DevTools](https://www.deque.com/axe/devtools/) - Free, comprehensive
- [WAVE](https://wave.webaim.org/extension/) - Visual feedback
- [Lighthouse](https://developer.chrome.com/docs/lighthouse/) - Built into Chrome

**CI/CD testing:**
- [@axe-core/react](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/react) - Runtime accessibility testing
- [jest-axe](https://github.com/nickcolley/jest-axe) - Jest integration
- [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing)

---

### Manual Testing Checklist

#### Keyboard Testing
1. [ ] Unplug mouse
2. [ ] Tab through entire page
3. [ ] All interactive elements focusable?
4. [ ] Focus indicators visible?
5. [ ] Can activate with Enter/Space?
6. [ ] Can close modals with Escape?
7. [ ] Tab order logical?

#### Screen Reader Testing
1. [ ] Install NVDA (Windows) or VoiceOver (Mac)
2. [ ] Navigate page with screen reader on
3. [ ] All content announced?
4. [ ] Interactive elements have labels?
5. [ ] Form errors announced?
6. [ ] Heading hierarchy correct?

#### Contrast Testing
1. [ ] Use contrast checker on all text
2. [ ] Check UI components (buttons, borders)
3. [ ] Test in dark mode too
4. [ ] All elements meet 4.5:1 (text) or 3:1 (UI)?

---

### Testing with Real Users

**Considerations:**
- Test with actual users who rely on assistive technologies
- Different screen readers behave differently
- Mobile screen readers (VoiceOver, TalkBack) differ from desktop
- Keyboard-only users have different needs than screen reader users

---

## Accessibility Checklist

### General
- [ ] Page has `<title>` and `<meta name="description">`
- [ ] Page has proper heading hierarchy (h1 → h2 → h3)
- [ ] Landmarks used (`<header>`, `<nav>`, `<main>`, `<footer>`)
- [ ] Skip link present for keyboard users
- [ ] No content relies on color alone

### Color & Contrast
- [ ] Text has 4.5:1 contrast (normal) or 3:1 (large)
- [ ] UI components have 3:1 contrast
- [ ] Tested in both light and dark modes
- [ ] Color blindness simulator used

### Keyboard
- [ ] All interactive elements focusable
- [ ] Focus indicators visible (ring, outline, etc.)
- [ ] Tab order is logical
- [ ] No keyboard traps
- [ ] Enter/Space activates buttons
- [ ] Escape closes dialogs/dropdowns
- [ ] Arrow keys navigate lists/menus

### Screen Readers
- [ ] All images have alt text
- [ ] Icon-only buttons have aria-label
- [ ] Form labels associated with inputs
- [ ] Form errors use aria-describedby
- [ ] Required fields marked with aria-required
- [ ] Live regions for dynamic updates
- [ ] ARIA roles used correctly

### Forms
- [ ] Labels associated with inputs (`htmlFor` + `id`)
- [ ] Error messages linked (`aria-describedby`)
- [ ] Invalid inputs marked (`aria-invalid`)
- [ ] Required fields indicated (`aria-required`)
- [ ] Submit button disabled during submission

### Focus Management
- [ ] Dialogs trap focus
- [ ] Focus returns after dialog closes
- [ ] Programmatic focus after actions
- [ ] No focus outline removed without alternative

---

## Quick Wins for Accessibility

**Easy improvements with big impact:**

1. **Add alt text to images**
   ```tsx
   <img src="/logo.png" alt="Company Logo" />
   ```

2. **Associate labels with inputs**
   ```tsx
   <Label htmlFor="email">Email</Label>
   <Input id="email" />
   ```

3. **Use semantic HTML**
   ```tsx
   <button> instead of <div onClick>
   ```

4. **Add aria-label to icon buttons**
   ```tsx
   <Button aria-label="Close"><X /></Button>
   ```

5. **Use semantic color tokens**
   ```tsx
   className="text-foreground" // Auto contrast
   ```

6. **Test with keyboard only**
   - Tab through page
   - Fix anything unreachable

---

## Next Steps

- **Test Now**: Run [axe DevTools](https://www.deque.com/axe/devtools/) on your app
- **Learn More**: [W3C ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- **Components**: [Review accessible components](./02-components.md)
- **Forms**: [Accessible form patterns](./06-forms.md)

---

**Related Documentation:**
- [Forms](./06-forms.md) - Accessible form patterns
- [Components](./02-components.md) - All components are accessible
- [Foundations](./01-foundations.md) - Color contrast tokens

**External Resources:**
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [axe DevTools](https://www.deque.com/axe/devtools/)

**Last Updated**: November 2, 2025
