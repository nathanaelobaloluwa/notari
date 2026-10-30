# NOTARI 2.0 Design System Specification

## 1. Executive Summary & Design Direction

**NOTARI** is a university campus event discovery and event management platform serving students and club executives across multiple faculties.

NOTARI 2.0 establishes a cohesive visual foundation based on a **Hybrid Architecture: Premium Editorial + Modern SaaS**:
- **Public Student-Facing Event Viewer**: Tactile, editorial, visually engaging notice board experience that evokes a curated university publication with authentic physical touches (pushpins, torn-ticket stub capacity indicators, paper surfaces).
- **Executive & Superadmin Back Office**: Sophisticated, structured, data-dense SaaS console providing efficient event operations, attendee rosters, and access management.

Both interfaces share a single design token architecture, typography hierarchy, and color system.

---

## 2. Color System & Design Palette

The palette balances warmth, academic authority, and modern interface clarity.

### 2.1 Brand Palette Foundations

| Color Role | Token | Hex Code | Purpose & Semantic Role |
| :--- | :--- | :--- | :--- |
| **Primary Burnt Orange** | `--palette-orange-500` | `#C85E2B` | Primary brand accent, primary CTA buttons, urgency indicators, ticket progress fill, active filters |
| **Forest Green** | `--palette-forest-500` | `#276B55` | Secondary brand anchor, faculty tags, positive booking confirmations, approved statuses |
| **Warm Ivory** | `--palette-ivory-100` | `#F6F1E8` | Light theme canvas, paper backdrop, welcoming academic atmosphere |
| **Deep Charcoal** | `--palette-charcoal-800` | `#24211E` | Primary typography in light theme, dark mode background anchor (`#1A1816`) |
| **Soft Sand** | `--palette-ivory-300` | `#E6DED2` | Hairline dividers, subtle borders, tactile frame outlines |
| **Error Red** | `--palette-red-500` | `#B52D27` | Destructive actions, validation errors, critical status warnings |
| **Warning Amber** | `--palette-amber-500` | `#D97706` | Pending approvals, waitlist warnings, intermediate status |
| **Info Blue** | `--palette-blue-500` | `#2563EB` | Neutral informational badges and highlights |

---

## 3. Light and Dark Theme Architecture

Both themes are designed independently as first-class experiences rather than simple color inversions. Themes are activated via the `data-theme="light"` or `data-theme="dark"` attribute on the `<html>` root element.

### 3.1 Theme Variables Mapping

| Semantic Token | Light Theme Value | Dark Theme Value | Usage |
| :--- | :--- | :--- | :--- |
| `--bg-base` | `#F6F1E8` (Warm Ivory) | `#1A1816` (Deep Charcoal) | Viewport and page background |
| `--bg-surface` | `#FFFFFF` (Pure White) | `#24211E` (Charcoal Surface) | Event cards, stat cards, dialogs, form inputs |
| `--bg-surface-elevated` | `#FAF7F1` | `#2D2925` | Popovers, modals, elevated panels |
| `--bg-subtle` | `#EFE8DC` | `#36312B` | Table headers, chip backgrounds, disabled surfaces |
| `--text-primary` | `#24211E` | `#F6F1E8` | Main headings, titles, active labels |
| `--text-secondary` | `#655F56` (4.8:1+ contrast) | `#A8A095` (4.6:1+ contrast) | Body copy, meta descriptions, subtitles |
| `--text-tertiary` | `#8E8578` | `#766E64` | Disabled text, subtle timestamps |
| `--border-subtle` | `#E6DED2` | `#38332D` | Standard card and input borders |
| `--border-medium` | `#D4C9BA` | `#4D463E` | Hovered outlines, active boundaries |
| `--primary` | `#C85E2B` | `#DE733F` | Burnt Orange (adjusted for dark mode contrast) |
| `--secondary` | `#276B55` | `#358B70` | Forest Green (adjusted for dark mode contrast) |
| `--status-error` | `#B52D27` | `#D6423C` | Destructive/Error states |

### 3.2 Backward Compatibility Aliases
To guarantee zero regressions across existing code and third-party plugins, legacy variables are mapped directly to the new token system:
- `--bg` -> `var(--bg-base)`
- `--surface` -> `var(--bg-surface)`
- `--ink` -> `var(--text-primary)`
- `--ink-muted` -> `var(--text-secondary)`
- `--accent` -> `var(--secondary)` (Forest Green)
- `--accent-2` -> `var(--primary)` (Burnt Orange)
- `--line` -> `var(--border-subtle)`
- `--radius` -> `var(--radius-md)`

### 3.3 Theme Flash Prevention (FOIT Elimination)
Each HTML page contains an inline, synchronous bootstrapping script in `<head>`:
```javascript
(function () {
  try {
    var savedTheme = localStorage.getItem('notari_theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
```
This sets `data-theme` prior to the initial paint, eliminating white-to-dark flashes during page load.

---

## 4. Typography Hierarchy

NOTARI uses a tri-font typography stack:
1. **Display & Headings**: `Archivo` (geometric, expressive, high-impact titles)
2. **Body & Interface**: `Inter` (neutral, legible, versatile UI font)
3. **Metadata, Tags & Numbers**: `IBM Plex Mono` (editorial stamps, codes, ticket numbers, caps)

### 4.1 Type Scale

| Token | Size | Line Height | Weight | Typical Application |
| :--- | :--- | :--- | :--- | :--- |
| `--text-5xl` | `3.00rem` (48px) | `1.12` | 800 | Hero title, landing banners |
| `--text-4xl` | `2.25rem` (36px) | `1.12` | 800 | Console page headers, stat metrics |
| `--text-3xl` | `1.875rem` (30px) | `1.20` | 700 | Modal titles, ticket event names |
| `--text-2xl` | `1.50rem` (24px) | `1.25` | 700 | Section titles, feature headings |
| `--text-xl` | `1.25rem` (20px) | `1.30` | 700 | Card titles, callout headers |
| `--text-lg` | `1.125rem` (18px) | `1.50` | 500 | Hero subheadings, lead paragraphs |
| `--text-base` | `1.00rem` (16px) | `1.55` | 400 | Standard body copy, inputs |
| `--text-sm` | `0.875rem` (14px) | `1.50` | 500 | Table cells, descriptions, buttons |
| `--text-xs` | `0.75rem` (12px) | `1.40` | 600 | Labels, filter chips, monospace timestamps |
| `--text-2xs` | `0.6875rem` (11px)| `1.20` | 600 | Card tags, ticket stubs, status pills |

---

## 5. Spacing, Layout & Border Radius Scale

Spacing is founded on a 4px modular grid:

| Token | Rem | Pixels | Application |
| :--- | :--- | :--- | :--- |
| `--space-1` | `0.25rem` | 4px | Micro padding, icon gaps |
| `--space-2` | `0.50rem` | 8px | Button gaps, chip internal padding, label spacing |
| `--space-3` | `0.75rem` | 12px | Form group internal spacing, header action gaps |
| `--space-4` | `1.00rem` | 16px | Standard component padding, container gutters |
| `--space-5` | `1.25rem` | 20px | Stat card padding, filter bar spacing |
| `--space-6` | `1.50rem` | 24px | Card padding, modal headers |
| `--space-8` | `2.00rem` | 32px | Section gutters, modal dialog padding |
| `--space-10` | `2.50rem` | 40px | Footer vertical padding |
| `--space-12` | `3.00rem` | 48px | Empty state container vertical padding |
| `--space-16` | `4.00rem` | 64px | Main section separations |

### Border Radius Scale
- `--radius-xs`: `3px` (Badges, tags, code chips)
- `--radius-sm`: `6px` (Ticket stub internal frames, button sizes)
- `--radius-md`: `8px` (Standard buttons, form inputs, stat cards)
- `--radius-lg`: `12px` (Event cards, modal dialogs, full ticket passes)
- `--radius-xl`: `16px` (Special feature panels)
- `--radius-pill`: `9999px` (Filter chips, circular avatars, toggle switches)

---

## 6. Component Foundation

### 6.1 Buttons
- **Touch Target**: Minimum `44px` height (`--touch-target-min`) across all standard buttons for mobile accessibility.
- **Variants**:
  - `.btn-primary` / `.btn-accent`: Burnt Orange (`--primary`) with subtle top highlight and active compression.
  - `.btn-secondary` / `.btn-forest`: Forest Green (`--secondary`) with hover elevation.
  - `.btn-outline`: Transparent background with border, darkening on hover.
  - `.btn-ghost`: Borderless surface with subtle hover fill.
  - `.btn-danger` / `.btn-destructive`: Error Red (`#B52D27`) for unpinning/rejecting actions.
  - `.btn-sm`: `34px` height for data-dense tables.
  - `.btn-icon`: Square or circular icon buttons with centered SVGs.

### 6.2 Forms & Inputs
- Consistent `44px` height on text inputs and select controls.
- Distinct focus states with 3px Burnt Orange ring (`--primary`) and offset.
- Floating error text (`.form-error.visible`) and invalid field states (`.is-invalid`).
- Password visibility toggling with embedded accessible SVG trigger.

### 6.3 Filter Chips
- Monospace uppercase typography with rounded pill borders (`--radius-pill`).
- Responsive horizontal scrolling (`.filter-chips-row`) with accelerated momentum on touch devices.
- High-contrast active inverted state.

### 6.4 Notice Board Cards & Torn-Ticket Stub
- Authentic pushpin header element (`.event-card::before`) with depth shadows.
- Alternating organic rotation (`-0.75deg` to `+0.85deg`) disabled automatically when card count exceeds 15 or when reduced-motion is requested.
- **Torn-Ticket Stub**:
  - Circular notch cutouts on both borders via pseudo-elements.
  - Proportional capacity fill indicator (`.ticket-fill`) in Burnt Orange.
  - Perforated dashed divider line (`.ticket-dashed-line`).

### 6.5 Data Tables (SaaS Console)
- Compact, border-collapsed layout with soft sand hairlines.
- Subtle row hover transition (`background-color 150ms`).
- Monospace metadata alignment and right-aligned action toolbars.

### 6.6 Modals & Overlays
- Backdrop blur (`backdrop-filter: blur(6px)`) with graceful fade.
- Smooth dialog scale-in transition (`translateY(18px) scale(0.98)` to normal).
- Accessible close buttons and keyboard `Escape` dismissal.

---

## 7. Responsive Breakpoints

| Breakpoint | Width | Behavior |
| :--- | :--- | :--- |
| **Mobile** | `< 600px` | Single-column form grids, condensed header, horizontal chip scrolling |
| **Tablet** | `600px - 768px` | 2-column form grids, 2-column event card grids |
| **Laptop** | `769px - 1024px` | 3-column notice board grid, full navigation links |
| **Desktop** | `> 1024px` | Expanded container width (max 1280px), multi-metric admin dashboard |

---

## 8. Motion, Interactions & Accessibility

- **Standard Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` (spring-like natural feel).
- **Reduced Motion**: Full `@media (prefers-reduced-motion: reduce)` compliance, neutralizing all transforms and card rotations while preserving immediate functional state transitions.
- **WCAG Contrast**: All primary text, muted descriptions, buttons, and status tags exceed WCAG AA requirements (4.5:1 for body copy; 3:1 for large display headers).

---

## 9. Record of Modified Files & Rationale

| File Path | Nature of Update | Rationale |
| :--- | :--- | :--- |
| `client/css/styles.css` | Complete Design System Foundation | Rebuilt token definitions, light and dark themes, typography scale, spacing tokens, and component library while preserving 100% backward compatibility for all existing classes. |
| `client/index.html` | Theme Flash Prevention Script | Added synchronous head bootstrap script to eliminate FOIT; preserved existing working tree edits. |
| `client/admin.html` | Theme Flash Prevention Script | Added synchronous head bootstrap script to eliminate FOIT. |
| `client/register.html` | Theme Flash Prevention Script | Added synchronous head bootstrap script to eliminate FOIT. |
| `client/privacy.html` | Theme Flash Prevention Script | Added synchronous head bootstrap script to eliminate FOIT. |
| `docs/NOTARI_DESIGN_SYSTEM.md` | New Architecture Documentation | Comprehensive design system specification for Phase 1 and future phases. |
