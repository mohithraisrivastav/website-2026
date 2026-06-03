# Design Tokens Documentation

## Overview

All design values (colors, spacing, typography, shadows) are defined as CSS custom properties in `:root` within `global.css`. This ensures a single source of truth and makes global updates trivial.

## Color System

### Color Primitives
Base hues organized by category. These map 1:1 to actual hex values and should rarely be used directly in component styles.

```css
/* Neutrals: warm tinted grays and creams */
--color-neutral-100: #FAFAFA;   /* Near white */
--color-neutral-200: #F7F3ED;   /* Parchment (primary light) */
--color-neutral-300: #F0E8D0;   /* Gold light highlight */
--color-neutral-400: #EDE8DF;   /* Off-white (secondary) */
--color-neutral-500: #D4CFC3;   /* Light taupe */
--color-neutral-600: #A89A8E;   /* Medium taupe */
--color-neutral-700: #6B5E4F;   /* Warm taupe (labels) */
--color-neutral-800: #4A3A33;   /* Dark gray (secondary text) */
--color-neutral-900: #1A1612;   /* Near black (primary text) */

/* Accent: warm gold (architectural) */
--color-accent-light:   #F6EBC8;  /* Gold tint */
--color-accent:         #CFA246;  /* Main gold (7.8:1 on dark) */
--color-accent-dark:    #B8902E;  /* Dark gold (rare) */
--color-accent-text:    #7F5F10;  /* Dark amber (text on light) */

/* Action: terracotta (engagement) */
--color-action-light:   #E86A4A;  /* Light terracotta */
--color-action:         #B85C38;  /* Primary action */
--color-action-hover:   #A34E2E;  /* Hover */
--color-action-active:  #8A2E12;  /* Pressed */
```

### Semantic Tokens
Intent-based names. **Always use semantic tokens in component styles**, never primitives.

```css
/* Backgrounds */
--bg-primary:   var(--color-neutral-200);  /* Main page */
--bg-secondary: var(--color-neutral-400);  /* Cards, surfaces */
--bg-tertiary:  var(--color-neutral-100);  /* Lightest */
--bg-overlay:   rgba(26, 22, 18, 0.5);    /* Dark overlay */

/* Text */
--text-primary:    var(--color-neutral-900);  /* Body text */
--text-secondary:  var(--color-neutral-800);  /* Labels */
--text-tertiary:   var(--color-neutral-700);  /* Weak contrast */
--text-link:       var(--color-accent-text);  /* Links */

/* Borders */
--border-light:    rgba(207, 162, 70, 0.15);  /* Subtle */
--border-default:  rgba(207, 162, 70, 0.25);  /* Default */

/* States */
--state-hover:     rgba(207, 162, 70, 0.1);   /* Hover tint */
--state-disabled:  rgba(75, 58, 51, 0.3);    /* Disabled */
```

## Spacing Scale

Used for all padding, margins, gaps. Ensures consistent visual rhythm.

```css
--spacing-xs:  4px;   /* Micro gaps */
--spacing-sm:  8px;   /* Small */
--spacing-md:  12px;  /* Medium (common) */
--spacing-lg:  16px;  /* Large */
--spacing-xl:  24px;  /* Extra large */
--spacing-2xl: 32px;  /* 2× large */
--spacing-3xl: 48px;  /* 3× large */
--spacing-4xl: 64px;  /* 4× large */
--spacing-5xl: 80px;  /* 5× large */
```

## Typography

### Fonts
```css
--font-accent: 'Cormorant Garamond', Georgia, serif;  /* Display, headings */
--font-main:   'Inter', -apple-system, sans-serif;     /* Body, UI */
--font-mono:   'Courier New', monospace;                /* Code */
```

### Scale
```css
--text-xs:  0.75rem;   /* 12px - captions */
--text-sm:  0.875rem;  /* 14px - small text */
--text-base: 1rem;     /* 16px - body */
--text-lg:  1.125rem;  /* 18px - callouts */
--text-xl:  1.25rem;   /* 20px - subheadings */
--text-2xl: 1.5rem;    /* 24px - small headings */
--text-3xl: 2rem;      /* 32px - headings */
--text-4xl: 2.5rem;    /* 40px - large headings */
--text-5xl: 3rem;      /* 48px - hero */
```

### Weights
```css
--font-weight-light:      300;  /* Decorative, large text */
--font-weight-normal:     400;  /* Body text */
--font-weight-medium:     500;  /* Emphasis */
--font-weight-semibold:   600;  /* Labels, CTAs */
--font-weight-bold:       700;  /* Strong emphasis */
```

## Elevation & Shadows

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.15);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.2);
```

## Motion & Easing

```css
--transition-fast:   150ms ease-out;
--transition-normal: 250ms ease-out;
--transition-slow:   400ms ease-out;
--easing-smooth:     cubic-bezier(0.25, 1, 0.5, 1);  /* Smooth decel */
```

## Usage Examples

### ✓ Correct: Use semantic tokens

```css
.button {
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: var(--text-sm);
    transition: background var(--transition-normal);
}

.button:hover {
    background: var(--state-hover);
}
```

### ✗ Incorrect: Hard-coded colors

```css
.button {
    background: #F7F3ED;           /* Use var(--bg-primary) */
    color: #1A1612;                /* Use var(--text-primary) */
    border: 1px solid #CFA246;     /* Use var(--border-default) */
    padding: 12px 16px;            /* Use var(--spacing-md) var(--spacing-lg) */
    font-size: 0.875rem;           /* Use var(--text-sm) */
    transition: background 250ms;  /* Use var(--transition-normal) */
}
```

## Migration Checklist

- [ ] Replace all hard-coded colors with semantic tokens
- [ ] Replace all spacing values with `--spacing-*` scale
- [ ] Replace all font sizes with `--text-*` scale
- [ ] Replace all transitions with `--transition-*` + `--easing-*`
- [ ] Remove inline `style` attributes using hard-coded values
- [ ] Update page-specific CSS to use tokens from `:root`
- [ ] Verify all components work with token updates
- [ ] Test dark mode variant (future phase)

## Design Decisions

**Why semantic tokens?** A color's name should reflect its *purpose*, not its value. `--text-primary` is clearer than `--color-neutral-900`. If brand colors change, updating one token updates everywhere.

**Why use CSS custom properties?** They're native to CSS, work in all modern browsers, and allow runtime changes (e.g., dark mode toggle). No build step needed.

**Why organize by category?** Primitives → Semantic keeps the system clear. Primitives rarely change; semantic tokens change only when intent changes.
