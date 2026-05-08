# Mobile Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a fully mobile-optimized public website + 4 critical admin views to www.hobbyskyguesthouse.com via Netlify, hitting LCP < 2.5s on mobile and shrinking the initial JS bundle ≥ 30%.

**Architecture:** Tailwind responsive utilities + React.lazy route splitting + two new shared components (`MobileSheet`, `MobileTabBar`) + WebP/`<picture>` image upgrades. No new dependencies. Existing Radix Dialog + shadcn `Sheet` reused.

**Tech Stack:** React 18 + Vite + TypeScript + Tailwind + Radix UI + shadcn + react-router-dom + Supabase + Netlify.

**Spec:** `docs/superpowers/specs/2026-05-08-mobile-optimization-design.md`

---

## Phase 1 — Foundation

### Task 1.1: Lighthouse mobile baseline

**Files:**
- Create: `docs/superpowers/specs/lighthouse-baseline-2026-05-08.md`

- [ ] **Step 1: Build production bundle**

```bash
npm run build:prod 2>&1 | tee /tmp/build-baseline.log
```

Expected: build succeeds, list of chunks printed. Capture bundle sizes.

- [ ] **Step 2: Start preview server**

```bash
npm run preview &
sleep 3
```

Expected: server on `http://localhost:4173`.

- [ ] **Step 3: Run Lighthouse mobile against home + book-now**

```bash
npx -y lighthouse http://localhost:4173/ --only-categories=performance --form-factor=mobile --throttling-method=simulate --output=json --output-path=/tmp/lh-home-baseline.json --chrome-flags="--headless"
npx -y lighthouse http://localhost:4173/book-now --only-categories=performance --form-factor=mobile --throttling-method=simulate --output=json --output-path=/tmp/lh-booknow-baseline.json --chrome-flags="--headless"
```

Expected: two JSON reports written.

- [ ] **Step 4: Record summary**

Extract LCP, TBT, FCP, CLS, total bundle bytes from JSON. Write to `docs/superpowers/specs/lighthouse-baseline-2026-05-08.md` as a markdown table:

```markdown
# Lighthouse Mobile Baseline — 2026-05-08

| Page | LCP | FCP | TBT | CLS | Total transfer |
|------|-----|-----|-----|-----|----------------|
| /            | <ms> | <ms> | <ms> | <val> | <KB> |
| /book-now    | <ms> | <ms> | <ms> | <val> | <KB> |

Initial JS chunks (build output):
- index-<hash>.js — <size>KB
- vendor-<hash>.js — <size>KB
- (...)
Total initial JS: <size>KB
```

- [ ] **Step 5: Stop preview server, commit baseline**

```bash
pkill -f "vite preview" || true
git add docs/superpowers/specs/lighthouse-baseline-2026-05-08.md
git commit -m "docs(perf): mobile lighthouse baseline before optimization

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 1.2: Global CSS — safe-area + overflow guard + 16px form inputs

**Files:**
- Modify: `src/index.css` (append to `@layer base`)

- [ ] **Step 1: Add base mobile rules**

Append at the end of the `@layer base { ... }` block in `src/index.css` (after the existing `body` and `*` rules):

```css
@layer base {
  /* Mobile safe-area + horizontal-scroll guard */
  html, body {
    overflow-x: hidden;
    -webkit-text-size-adjust: 100%;
  }

  :root {
    --safe-area-top: env(safe-area-inset-top, 0px);
    --safe-area-bottom: env(safe-area-inset-bottom, 0px);
    --safe-area-left: env(safe-area-inset-left, 0px);
    --safe-area-right: env(safe-area-inset-right, 0px);
    --mobile-tabbar-height: 64px;
  }

  /* iOS auto-zoom prevention: form inputs must be ≥16px */
  @media (max-width: 767px) {
    input, select, textarea {
      font-size: 16px;
    }
  }

  /* Sticky bottom CTA respects iOS home-indicator */
  .pb-safe {
    padding-bottom: calc(0.75rem + var(--safe-area-bottom));
  }

  .pt-safe {
    padding-top: calc(0.75rem + var(--safe-area-top));
  }
}
```

- [ ] **Step 2: Verify build still passes**

```bash
npm run lint:css && npm run lint:types
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(mobile): safe-area CSS vars + 16px form inputs + overflow guard

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 1.3: Lazy-load admin routes in App.tsx

**Files:**
- Modify: `src/App.tsx:14-42` (admin imports), `src/App.tsx:160` (Suspense fallback)

Goal: convert eager admin imports to `lazy()` so initial bundle only loads what `/` needs.

- [ ] **Step 1: Replace lines 14–42 with lazy imports**

In `src/App.tsx`, replace the block of admin page imports (lines 14 through 42, the contiguous `import { … } from './pages/staff/…'` and related) with:

```tsx
// Eager — needed for first paint or auth gate
import { StaffLoginPage } from './pages/staff/StaffLoginPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { ErrorBoundary } from './components/ErrorBoundary'

// Lazy — admin pages only load when staff route is hit
const DashboardPage = lazy(() => import('./pages/staff/DashboardPage').then(m => ({ default: m.DashboardPage })))
const StaffCalendarPage = lazy(() => import('./pages/staff/CalendarPage').then(m => ({ default: m.CalendarPage })))
const PropertiesPage = lazy(() => import('./pages/staff/PropertiesPage').then(m => ({ default: m.PropertiesPage })))
const StaffBookingsPage = lazy(() => import('./pages/staff/BookingsPage').then(m => ({ default: m.BookingsPage })))
const StaffGuestsPage = lazy(() => import('./pages/staff/GuestsPage').then(m => ({ default: m.GuestsPage })))
const ChannelsPage = lazy(() => import('./pages/staff/ChannelsPage').then(m => ({ default: m.ChannelsPage })))
const ReportsPage = lazy(() => import('./pages/staff/ReportsPage').then(m => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('./pages/staff/SettingsPage').then(m => ({ default: m.SettingsPage })))
const SetPricesPage = lazy(() => import('./pages/staff/SetPricesPage').then(m => ({ default: m.SetPricesPage })))
const StaffReservationsPage = lazy(() => import('./pages/staff/ReservationsPage').then(m => ({ default: m.ReservationsPage })))
const ReservationHistoryPage = lazy(() => import('./pages/staff/ReservationHistoryPage').then(m => ({ default: m.ReservationHistoryPage })))
const HousekeepingPage = lazy(() => import('./pages/staff/HousekeepingPage'))
const EmployeesPage = lazy(() => import('./pages/staff/EmployeesPage').then(m => ({ default: m.EmployeesPage })))
const CleanupToolPage = lazy(() => import('./pages/staff/CleanupToolPage').then(m => ({ default: m.CleanupToolPage })))
const OnsiteBookingPage = lazy(() => import('./pages/staff/OnsiteBookingPage').then(m => ({ default: m.OnsiteBookingPage })))
const TaskCompletionPage = lazy(() => import('./pages/TaskCompletionPage').then(m => ({ default: m.TaskCompletionPage })))
const InvoicePage = lazy(() => import('./pages/InvoicePage').then(m => ({ default: m.InvoicePage })))
const InvoicesPage = lazy(() => import('./pages/staff/InvoicesPage').then(m => ({ default: m.InvoicesPage })))
const ReviewSubmissionPage = lazy(() => import('./pages/ReviewSubmissionPage').then(m => ({ default: m.ReviewSubmissionPage })))
const AnalyticsPage = lazy(() => import('./pages/staff/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })))
const ActivityLogsPage = lazy(() => import('./pages/staff/ActivityLogsPage').then(m => ({ default: m.ActivityLogsPage })))
const DiagnoseEmailPage = lazy(() => import('./pages/staff/DiagnoseEmailPage').then(m => ({ default: m.DiagnoseEmailPage })))
const ReviewsPage = lazy(() => import('./pages/staff/ReviewsPage').then(m => ({ default: m.ReviewsPage })))
const MarketingPage = lazy(() => import('./pages/staff/MarketingPage'))
const ServiceRequestsPage = lazy(() => import('./pages/staff/ServiceRequestsPage').then(m => ({ default: m.ServiceRequestsPage })))
const HRPage = lazy(() => import('./pages/staff/HRPage').then(m => ({ default: m.HRPage })))
const MyRevenuePage = lazy(() => import('./pages/staff/MyRevenuePage').then(m => ({ default: m.MyRevenuePage })))
const ClockPage = lazy(() => import('./pages/staff/ClockPage').then(m => ({ default: m.ClockPage })))
const InventoryPage = lazy(() => import('./pages/staff/InventoryPage').then(m => ({ default: m.InventoryPage })))
const GuestLayout = lazy(() => import('./layouts/GuestLayout'))
const GuestDashboard = lazy(() => import('./pages/guest/GuestDashboard'))
const ConciergePage = lazy(() => import('./pages/guest/ConciergePage').then(m => ({ default: m.ConciergePage })))
const ServicesPage = lazy(() => import('./pages/guest/ServicesPage').then(m => ({ default: m.ServicesPage })))
const GuestLoginPage = lazy(() => import('./pages/guest/GuestLoginPage').then(m => ({ default: m.GuestLoginPage })))
```

Keep all other imports unchanged.

- [ ] **Step 2: Replace Suspense fallback with branded skeleton**

Find this in `src/App.tsx`:

```tsx
<Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
```

Replace with:

```tsx
<Suspense fallback={
  <div className="flex items-center justify-center min-h-[60vh] px-4">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-resort-gold-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-resort-green-700">Loading…</p>
    </div>
  </div>
}>
```

- [ ] **Step 3: Verify type check + build**

```bash
npm run lint:types && npm run build:prod
```

Expected: no errors. Build output now shows separate chunks for admin pages.

- [ ] **Step 4: Smoke test public pages still load**

```bash
npm run preview &
sleep 3
curl -sI http://localhost:4173/ | head -1
curl -sI http://localhost:4173/book-now | head -1
pkill -f "vite preview" || true
```

Expected: `HTTP/1.1 200 OK` for both.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "perf(routing): lazy-load admin + guest routes via React.lazy

Initial JS bundle no longer ships admin code to public visitors.
Admin pages chunk-split per-route. Branded suspense skeleton replaces
spinner.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Phase 2 — Public Website

### Task 2.1: Header — safe-area + 44px tap targets

**Files:**
- Modify: `src/website/components/feature/Header.tsx:18-19`, `:101-114` (hamburger button), `:119-121` (mobile menu container)

- [ ] **Step 1: Add safe-area to fixed header**

In `src/website/components/feature/Header.tsx`, find:

```tsx
<header className="fixed top-0 left-0 right-0 z-50 bg-resort-green-900 shadow-md border-b border-resort-green-800">
  <div className="container mx-auto px-4">
```

Replace with:

```tsx
<header className="fixed top-0 left-0 right-0 z-50 bg-resort-green-900 shadow-md border-b border-resort-green-800" style={{ paddingTop: 'var(--safe-area-top)' }}>
  <div className="container mx-auto px-4 sm:px-6">
```

- [ ] **Step 2: Enlarge hamburger tap target to 44px**

Find the mobile menu button:

```tsx
<button
  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
  className="lg:hidden p-2 cursor-pointer"
  aria-label="Toggle menu"
>
  <div className="space-y-1.5">
```

Replace with:

```tsx
<button
  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
  className="lg:hidden p-3 -mr-2 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
  aria-label="Toggle menu"
>
  <div className="space-y-1.5">
```

- [ ] **Step 3: Make mobile menu drawer respect safe areas**

Find:

```tsx
<div
  className={`fixed inset-0 bg-resort-green-900 z-40 transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
    }`}
>
```

Replace with:

```tsx
<div
  className={`fixed inset-0 bg-resort-green-900 z-40 transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
    }`}
  style={{ paddingTop: 'var(--safe-area-top)', paddingBottom: 'var(--safe-area-bottom)' }}
>
```

- [ ] **Step 4: Build + smoke**

```bash
npm run lint:types
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/website/components/feature/Header.tsx
git commit -m "feat(mobile): header safe-area + 44px hamburger tap target

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2.2: HeroSection — fluid type, stacked CTAs, LCP preload

**Files:**
- Modify: `src/website/pages/home/components/HeroSection.tsx`
- Modify: `index.html:7-30` (add LCP preload)

- [ ] **Step 1: Read the hero file**

```bash
cat src/website/pages/home/components/HeroSection.tsx
```

Note the current image src (likely `/hotelview-enhanced.png` or similar) and the CTA button block.

- [ ] **Step 2: Apply mobile-first classes**

In `HeroSection.tsx`:

- The outer wrapper `<section>` keeps `min-h-screen` but adds `min-h-[100svh]` first (so it tracks visible viewport on mobile, not the URL bar–including 100vh):

  Find: `min-h-screen` → Replace with: `min-h-[100svh] min-h-screen`

- The headline element (whatever uses `text-4xl md:text-6xl` or similar): change to fluid `clamp()`:

  Find any `text-4xl md:text-6xl lg:text-7xl` style on the headline → Replace with: `text-[clamp(2rem,7vw,4.5rem)] leading-[1.1]`

  Find any subheadline `text-lg md:text-xl` → Replace with: `text-[clamp(1rem,2.5vw,1.25rem)]`

- The CTA button group (a flex container with 2 buttons): ensure mobile-stacked.

  Find: `flex gap-4` (or `flex-row gap-4`) on the buttons wrapper → Replace with: `flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto`

  Each button: append `w-full sm:w-auto justify-center min-h-[48px]` to its `className`.

- The hero `<img>` (if any): ensure attrs `loading="eager"` `fetchPriority="high"` `decoding="async"`. (LCP element — eager.)

- [ ] **Step 3: Add `<link rel="preload">` for hero image in `index.html`**

In `index.html`, after the existing `<link rel="canonical">`, insert (use the actual hero image filename verified in step 1):

```html
<link rel="preload" as="image" href="/hotelview-enhanced.png" fetchpriority="high" />
```

If the hero file is different, substitute the correct path.

- [ ] **Step 4: Verify type-check**

```bash
npm run lint:types
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/website/pages/home/components/HeroSection.tsx index.html
git commit -m "feat(mobile): hero fluid type + stacked CTAs + LCP preload

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2.3: Home sections — responsive grids + lazy images

**Files:**
- Modify: `src/website/pages/home/components/AboutSection.tsx`
- Modify: `src/website/pages/home/components/AmenitiesSection.tsx`
- Modify: `src/website/pages/home/components/OurRoomsSection.tsx`
- Modify: `src/website/pages/home/components/GallerySection.tsx`
- Modify: `src/website/pages/home/components/ImageGalleryGrid.tsx`
- Modify: `src/website/pages/home/components/TestimonialsSection.tsx`
- Modify: `src/website/pages/home/components/LocationSection.tsx`
- Modify: `src/website/pages/home/components/BookingCTA.tsx`

- [ ] **Step 1: Apply uniform responsive pattern to each home section**

For EACH file in the list above, do these edits:

a. **Section padding:** find any `py-20` or `py-24` → replace with `py-12 md:py-20`. Find any `py-16` → replace with `py-10 md:py-16`. Find horizontal `px-4` (already mobile-safe — leave). If you find `px-8` outer padding → replace with `px-4 md:px-8`.

b. **Headline:** find any `text-4xl md:text-5xl` (or larger only) on the section heading → replace with `text-3xl sm:text-4xl md:text-5xl`.

c. **Body / paragraphs:** any standalone `text-lg` on long copy → replace with `text-base md:text-lg`.

d. **Grids:** any `grid grid-cols-2` (without breakpoint qualifier) → replace with `grid grid-cols-1 sm:grid-cols-2`. Any `grid grid-cols-3` → replace with `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`. Any `grid grid-cols-4` → replace with `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4`.

e. **Images:** every `<img …>` not already inside the hero LCP path: append `loading="lazy" decoding="async"` if missing.

f. **Cards / inner padding:** any `p-8` on cards → replace with `p-5 md:p-8`. Any `p-6` → replace with `p-4 md:p-6`.

If a file does not match a particular pattern, skip that sub-step for that file. Do not invent classes.

- [ ] **Step 2: OurRoomsSection — extra mobile carousel option**

Open `src/website/pages/home/components/OurRoomsSection.tsx`. Find the rooms grid (currently `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3` after step 1). Wrap so that on `<sm` it shows a horizontal swipe row, on `sm+` it shows the grid. Replace the grid wrapper:

```tsx
<div className="flex sm:hidden gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 scrollbar-hide">
  {/* same room card map, but each card wrapper gets: className="snap-start shrink-0 w-[80%]" */}
</div>
<div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* same room card map */}
</div>
```

Implementation hint: extract the map callback into a `renderRoomCard(room, opts)` helper inside the component so it's not duplicated. For the swipe variant pass `opts={{ wrapperClass: 'snap-start shrink-0 w-[80%]' }}`; for the grid variant pass no wrapper override.

Add `scrollbar-hide` utility to `tailwind.config.cjs` plugins if not present, or use inline style `style={{ scrollbarWidth: 'none' }}` plus a `::-webkit-scrollbar { display: none }` rule in `src/index.css` `@layer utilities`. Pick the inline + global rule path:

In `src/index.css` append inside `@layer utilities`:

```css
@layer utilities {
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { scrollbar-width: none; -ms-overflow-style: none; }
}
```

- [ ] **Step 3: Type-check**

```bash
npm run lint:types
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/website/pages/home/components/ src/index.css
git commit -m "feat(mobile): responsive home sections + room swipe carousel <sm

- Uniform responsive padding/type/grid pass on all home section components
- Lazy-load all non-LCP images
- OurRoomsSection: snap-x carousel <sm, grid sm+
- scrollbar-hide utility added to global CSS

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2.4: About / Gallery / Contact pages — responsive pass

**Files:**
- Modify: `src/website/pages/about/page.tsx`
- Modify: `src/website/pages/gallery/page.tsx`
- Modify: `src/website/pages/contact/page.tsx`

- [ ] **Step 1: Apply same responsive pattern to each page**

For EACH file, apply the same a–f rules from Task 2.3 Step 1 (padding, headline, body, grids, images, cards).

- [ ] **Step 2: Gallery page — masonry to 2-col on mobile**

In `src/website/pages/gallery/page.tsx`, find the gallery grid (likely `columns-3` or `grid-cols-3`). Replace with:

- If using CSS columns: `columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-4`
- If using grid: `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4`

Each gallery item `<img>` gets `loading="lazy" decoding="async"` and `className` appended with `w-full h-auto rounded-md`.

- [ ] **Step 3: Contact page — full-width form on mobile**

In `src/website/pages/contact/page.tsx`, find the form. For each `<Input>`, `<Textarea>`, `<Select>`: ensure the wrapping element uses `w-full`. If the form is a 2-col grid (`grid grid-cols-2`), change to `grid grid-cols-1 md:grid-cols-2 gap-4`.

Submit button: append `w-full sm:w-auto min-h-[48px]` to className.

- [ ] **Step 4: Type-check**

```bash
npm run lint:types
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/website/pages/about/ src/website/pages/gallery/ src/website/pages/contact/
git commit -m "feat(mobile): about/gallery/contact responsive pass

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2.5: Book-Now wizard — single column + sticky CTA + sticky progress

**Files:**
- Modify: `src/website/pages/book-now/page.tsx`
- Possibly modify: `src/website/pages/book-now/components/*.tsx` step components

- [ ] **Step 1: Read and map the booking page**

```bash
wc -l src/website/pages/book-now/page.tsx src/website/pages/book-now/components/*.tsx
grep -n "step\|Step\|currentStep" src/website/pages/book-now/page.tsx | head -40
```

Note: which component renders the step indicator (progress bar) and which renders the next/back CTAs.

- [ ] **Step 2: Make step indicator sticky on mobile**

Find the step indicator wrapper element in `src/website/pages/book-now/page.tsx` (usually a `<div>` containing step circles or numbers). Add classes:

```tsx
className="sticky top-20 z-30 bg-background/95 backdrop-blur-sm border-b border-border py-3 -mx-4 px-4 md:static md:mx-0 md:px-0 md:py-6 md:bg-transparent md:backdrop-blur-none md:border-0"
```

(The `top-20` matches the fixed header height; adjust to `top-16` if header is shorter.)

- [ ] **Step 3: Make form layout single-column on mobile**

Find any 2-col form grid inside the wizard (e.g. `grid grid-cols-2`). Replace with `grid grid-cols-1 md:grid-cols-2 gap-4`.

For each `<Input>`/`<Select>` field wrapper: ensure `w-full`.

- [ ] **Step 4: Sticky bottom CTA bar**

Find the navigation buttons (Back / Continue / Submit). Wrap them in a sticky bottom container that's only sticky on mobile:

```tsx
<div className="sticky bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border -mx-4 px-4 py-3 pb-safe flex gap-3 md:static md:mx-0 md:px-0 md:py-0 md:bg-transparent md:backdrop-blur-none md:border-0 md:pb-0">
  {/* existing back button: append className "flex-1 md:flex-none min-h-[48px]" */}
  {/* existing continue button: append className "flex-1 md:flex-none min-h-[48px]" */}
</div>
```

- [ ] **Step 5: Add scroll padding so sticky CTA doesn't cover form errors**

On the outer wizard container (the element with `<form>` or main wrapper), append to className: `pb-32 md:pb-0` (so last form field isn't hidden behind sticky CTA).

- [ ] **Step 6: Type-check + build**

```bash
npm run lint:types && npm run build:prod
```

Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/website/pages/book-now/
git commit -m "feat(mobile): book-now sticky progress + sticky CTA + single-col wizard

Step indicator pins under header on mobile, CTA bar pins to bottom with
safe-area padding, form fields stack single-column <md.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Phase 3 — Critical Admin

### Task 3.1: Create `MobileSheet` component

**Files:**
- Create: `src/components/ui/mobile-sheet.tsx`

- [ ] **Step 1: Write the component**

```tsx
import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from '@/components/icons'
import { cn } from '@/lib/utils'

interface MobileSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  /** Stick to bottom on mobile, center on md+. Default true. */
  responsive?: boolean
  className?: string
}

/**
 * MobileSheet — bottom-sheet on mobile, centered modal on md+.
 * Wraps Radix Dialog. Use anywhere a Dialog/Modal is needed
 * for an admin form on small screens.
 */
export function MobileSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  responsive = true,
  className,
}: MobileSheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 bg-background shadow-xl outline-none focus:outline-none',
            responsive
              ? 'left-0 right-0 bottom-0 rounded-t-2xl max-h-[90vh] overflow-y-auto data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom md:left-1/2 md:right-auto md:bottom-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:max-w-lg md:w-full md:max-h-[85vh] md:data-[state=open]:slide-in-from-top-1/2'
              : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg max-w-lg w-full max-h-[85vh] overflow-y-auto',
            className,
          )}
          style={{ paddingBottom: 'var(--safe-area-bottom)' }}
        >
          <div className="flex items-start justify-between p-4 md:p-6 border-b border-border sticky top-0 bg-background z-10">
            <div>
              {title && <DialogPrimitive.Title className="text-lg font-semibold text-foreground">{title}</DialogPrimitive.Title>}
              {description && <DialogPrimitive.Description className="text-sm text-muted-foreground mt-1">{description}</DialogPrimitive.Description>}
            </div>
            <DialogPrimitive.Close className="rounded-md p-2 -mr-2 -mt-2 hover:bg-muted min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Close">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="p-4 md:p-6">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npm run lint:types
```

Expected: no errors. If `X` isn't exported from `@/components/icons`, swap to `import { X } from 'lucide-react'`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/mobile-sheet.tsx
git commit -m "feat(ui): MobileSheet component — bottom-sheet on mobile, modal on md+

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3.2: Create `MobileTabBar` component

**Files:**
- Create: `src/components/layout/MobileTabBar.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Sparkles, ReceiptText } from '@/components/icons'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/staff/dashboard',    label: 'Home',     icon: LayoutDashboard },
  { to: '/staff/bookings',     label: 'Bookings', icon: BookOpen },
  { to: '/staff/housekeeping', label: 'Rooms',    icon: Sparkles },
  { to: '/staff/invoices',     label: 'Invoices', icon: ReceiptText },
]

/**
 * Fixed bottom tab bar for staff on mobile only.
 * Hidden on md+ (sidebar takes over).
 */
export function MobileTabBar() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'var(--safe-area-bottom)' }}
      aria-label="Primary mobile navigation"
    >
      <ul className="grid grid-cols-4 h-16">
        {tabs.map(tab => (
          <li key={tab.to} className="flex">
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                  isActive ? 'text-resort-gold-500' : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npm run lint:types
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/MobileTabBar.tsx
git commit -m "feat(layout): MobileTabBar — bottom nav for staff on mobile

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3.3: Wire `MobileTabBar` into `AppLayout` + bottom-pad content

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Import and mount**

In `src/components/layout/AppLayout.tsx`, near the other layout imports (top of file), add:

```tsx
import { MobileTabBar } from './MobileTabBar'
```

Then locate the JSX wrapper that contains `<Outlet />`. The component returns something like (search for `<Outlet`):

```tsx
return (
  <div className="flex h-screen ...">
    {/* sidebar */}
    <main className="...">
      <Outlet />
    </main>
  </div>
)
```

a. Add `pb-20 md:pb-0` to the `<main>` className so content isn't hidden behind the tab bar.

b. Add `<MobileTabBar />` as a sibling at the end of the outer wrapper (before the closing `</div>` of the layout container).

So the return becomes:

```tsx
return (
  <div className="flex h-screen ...">
    {/* sidebar — unchanged */}
    <main className="... pb-20 md:pb-0">
      <Outlet />
    </main>
    <MobileTabBar />
  </div>
)
```

- [ ] **Step 2: Confirm sidebar already drops below `lg`**

The codebase uses shadcn `Sheet` for the existing mobile menu (`mobileMenuOpen` state, lines 50+). It already triggers below `lg`. Lower the breakpoint to `md` so tablets get the drawer too: in `AppLayout.tsx`, find any `lg:hidden` on the hamburger button → replace with `md:hidden`. Find any `hidden lg:block` on the sidebar wrapper → replace with `hidden md:block`.

- [ ] **Step 3: Type-check + build**

```bash
npm run lint:types && npm run build:prod
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/AppLayout.tsx
git commit -m "feat(layout): mount MobileTabBar + lower sidebar breakpoint to md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3.4: DashboardPage — KPI cards stack

**Files:**
- Modify: `src/pages/staff/DashboardPage.tsx`

- [ ] **Step 1: Locate KPI grid + chart container**

```bash
grep -n "grid-cols\|md:grid-cols\|lg:grid-cols" src/pages/staff/DashboardPage.tsx | head -20
```

Note line numbers of grid containers.

- [ ] **Step 2: Apply mobile-first grid breakpoints**

For each `grid grid-cols-N` or `grid-cols-N md:grid-cols-M` you find:

- 4-up KPI rows: change `grid-cols-4` (or `grid-cols-2 md:grid-cols-4`) → `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4`
- 3-up rows: change → `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4`
- 2-up rows: change → `grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4`

For chart containers (`<ResponsiveContainer>` from recharts, or a `<div className="h-80">` or similar): ensure they have `w-full` and shrink the height on mobile:

- `h-80` → `h-56 md:h-80`
- `h-96` → `h-64 md:h-96`

For section padding outside cards: any `p-6 md:p-8` on the page wrapper → replace with `p-4 md:p-6 lg:p-8`.

- [ ] **Step 3: Tables (if present) — wrap in horizontal scroll**

If DashboardPage has any `<table>`: wrap it with `<div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">…</div>`.

- [ ] **Step 4: Type-check**

```bash
npm run lint:types
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/staff/DashboardPage.tsx
git commit -m "feat(mobile): dashboard KPI grid stacks on small screens

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3.5: BookingsPage — card list under `md`, table sm+

**Files:**
- Modify: `src/pages/staff/BookingsPage.tsx` (1106 lines — careful, additive only)
- Possibly create: `src/pages/staff/components/BookingsMobileList.tsx`

Goal: do not restructure the table or any state — add a parallel mobile card list rendered below `md`.

- [ ] **Step 1: Locate the booking row mapping**

```bash
grep -n "filteredBookings\.map\|bookings\.map\|sortedBookings\.map" src/pages/staff/BookingsPage.tsx | head
```

Find the table body that maps over the bookings array. Note the variable name.

- [ ] **Step 2: Wrap the existing `<table>` for desktop only**

Find the `<table …>` (and its surrounding wrapper). Wrap with `<div className="hidden md:block">` (preserve ALL existing children/state). Closing the wrapping `</div>` after the `</table>`.

If the table already has a wrapper div, add `hidden md:block` to that wrapper's className instead of adding a new wrapper.

- [ ] **Step 3: Add a mobile card list right after the table wrapper**

Immediately after the `</div>` that closes the `hidden md:block` table wrapper, insert:

```tsx
<div className="md:hidden flex flex-col gap-3">
  {filteredBookings.length === 0 ? (
    <div className="text-center py-12 text-muted-foreground">No bookings match your filters.</div>
  ) : (
    filteredBookings.map((booking) => (
      <div
        key={booking.id}
        className="bg-card border border-border rounded-lg p-4 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-foreground truncate">
              {booking.guestName ?? booking.guest_name ?? 'Guest'}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {booking.roomName ?? booking.room_name ?? booking.roomNumber ?? '—'}
            </div>
          </div>
          <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-resort-green-100 text-resort-green-800">
            {booking.status ?? 'pending'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <div className="text-muted-foreground text-xs">Check-in</div>
            <div className="text-foreground">{booking.checkIn ?? booking.check_in ?? '—'}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Check-out</div>
            <div className="text-foreground">{booking.checkOut ?? booking.check_out ?? '—'}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              // Reuse the existing edit handler — find what the desktop "Edit" button calls
              // and call the same here. If it's `setEditingBooking(booking)`, use that.
              setEditingBooking?.(booking)
            }}
            className="flex-1 min-h-[44px] inline-flex items-center justify-center px-3 py-2 rounded-md border border-border bg-background hover:bg-muted text-sm font-medium"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              // Same as desktop "View" / detail handler
              setViewingBooking?.(booking)
            }}
            className="flex-1 min-h-[44px] inline-flex items-center justify-center px-3 py-2 rounded-md bg-resort-green-700 text-white hover:bg-resort-green-800 text-sm font-medium"
          >
            View
          </button>
        </div>
      </div>
    ))
  )}
</div>
```

**Important:** the property names (`booking.guestName` vs `booking.guest_name`, `booking.checkIn` vs `booking.check_in`) and the action handlers (`setEditingBooking`, `setViewingBooking`) **must match what the existing desktop table uses**. Read the desktop `<tbody>` first and use the same accessor patterns + handler functions. Do not invent new handlers.

- [ ] **Step 4: Make filter bar collapse on mobile**

Find the filter row (search box + select filters above the table). Wrap the filter group:

```tsx
<details className="md:hidden bg-card border border-border rounded-lg p-3 mb-3">
  <summary className="cursor-pointer font-medium text-foreground select-none">Filters</summary>
  <div className="flex flex-col gap-3 mt-3">
    {/* MOVE the filter inputs HERE — same instances, not duplicates */}
  </div>
</details>
<div className="hidden md:flex … existing classes …">
  {/* original filter row */}
</div>
```

If duplicating the filter inputs would break controlled state, instead wrap the existing filter row in a `<div className="bg-card border border-border rounded-lg p-3 mb-3 md:p-0 md:border-0 md:bg-transparent md:mb-0">` and let it stack vertically on mobile (`<flex flex-col md:flex-row gap-3>`).

- [ ] **Step 5: Type-check + build**

```bash
npm run lint:types && npm run build:prod
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/staff/BookingsPage.tsx
git commit -m "feat(mobile): bookings page renders card list <md, table preserved md+

Card list reuses same state + handlers as desktop table; no logic
change. Filter row stacks vertically on mobile.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3.6: HousekeepingPage — 2-col room grid + MobileSheet for details

**Files:**
- Modify: `src/pages/staff/HousekeepingPage.tsx`

- [ ] **Step 1: Locate task/room grid**

```bash
grep -n "grid-cols\|tasks\.map\|rooms\.map" src/pages/staff/HousekeepingPage.tsx | head -20
```

Find the main grid that renders the housekeeping task cards.

- [ ] **Step 2: Apply mobile-first grid + bigger touch targets**

For the grid wrapper: change to `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4`.

Each task card: ensure card padding is `p-4 md:p-5` (not `p-2`). Status toggle / mark-clean button: ensure `min-h-[44px]` and `w-full` className appended on mobile.

Search/filter row: wrap in `flex flex-col sm:flex-row gap-3` (was likely `flex gap-3`).

- [ ] **Step 3: Replace the existing details Dialog with MobileSheet**

Find the current task-details `<Dialog>` (uses `DialogContent`/`DialogHeader`). Replace the import line:

```tsx
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
```

with:

```tsx
import { MobileSheet } from '@/components/ui/mobile-sheet'
```

Replace the JSX:

```tsx
<Dialog open={!!selectedTask} onOpenChange={(o) => !o && setSelectedTask(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Task Details</DialogTitle>
      <DialogDescription>…</DialogDescription>
    </DialogHeader>
    {/* body */}
    <DialogFooter>
      {/* footer buttons */}
    </DialogFooter>
  </DialogContent>
</Dialog>
```

with:

```tsx
<MobileSheet
  open={!!selectedTask}
  onOpenChange={(o) => !o && setSelectedTask(null)}
  title="Task Details"
  description={selectedTask ? `Room ${selectedTask.roomNumber ?? selectedTask.room_id ?? ''}` : undefined}
>
  {/* body — unchanged */}
  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4 pt-4 border-t border-border">
    {/* footer buttons — unchanged, but add className overrides: w-full sm:w-auto min-h-[44px] */}
  </div>
</MobileSheet>
```

Leave `AlertDialog` (delete confirmation) alone — it's already small + fine on mobile.

- [ ] **Step 4: Type-check + build**

```bash
npm run lint:types && npm run build:prod
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/staff/HousekeepingPage.tsx
git commit -m "feat(mobile): housekeeping 2-col grid + MobileSheet for task details

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3.7: Charges + Checkout flow — MobileSheet for charge entry

**Files:**
- Locate first via grep, then modify: likely `src/pages/staff/components/AddChargeModal.tsx` or similar; checkout review screen probably in `src/pages/staff/BookingsPage.tsx` or a `CheckoutPage`.

- [ ] **Step 1: Locate charge + checkout components**

```bash
grep -rln "addCharge\|add charge\|AddCharge" src/pages/staff src/components 2>/dev/null
grep -rln "checkout" src/pages/staff/BookingsPage.tsx src/pages/staff/ 2>/dev/null | head
```

Identify the file(s) containing the add-charge form Dialog and the checkout review modal. If charges live inline inside `BookingsPage.tsx`, work there.

- [ ] **Step 2: Convert charge-entry Dialog to MobileSheet**

For each charge-related `<Dialog>` you find: apply the same swap as Task 3.6 Step 3 — replace `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` block with `<MobileSheet open={…} onOpenChange={…} title="Add Charge">…</MobileSheet>`.

For the form fields inside: ensure each `<Input>`, `<Select>` wrapper has `w-full`. For two-column layouts (price + qty side by side): use `grid grid-cols-1 sm:grid-cols-2 gap-3`.

Submit/cancel button row: append `flex-col-reverse sm:flex-row sm:justify-end gap-2` to the wrapper, and `w-full sm:w-auto min-h-[44px]` to each button.

- [ ] **Step 3: Convert checkout-review Dialog (if separate) to MobileSheet**

Same pattern. The summary table inside the checkout review: wrap in `<div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">`. Total row at bottom: ensure `text-base md:text-lg`.

- [ ] **Step 4: Type-check + build**

```bash
npm run lint:types && npm run build:prod
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(mobile): charges + checkout use MobileSheet on small screens

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Phase 4 — Performance

### Task 4.1: Drop unused 3D dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json` (auto via npm)

Confirmed earlier: zero usage of `@react-three/fiber` and `@react-three/drei` in `src/`.

- [ ] **Step 1: Re-confirm zero usage**

```bash
grep -rn "@react-three\|three" src/ --include="*.ts" --include="*.tsx" | grep -v "three-" | head
```

Expected: no matches (or only test/ignored).

- [ ] **Step 2: Remove deps**

```bash
npm uninstall @react-three/fiber @react-three/drei three
```

If `three` isn't installed top-level, only the first two will be removed. If `three` is a transitive dep, it'll be removed automatically.

- [ ] **Step 3: Build to confirm nothing breaks**

```bash
npm run build:prod
```

Expected: build succeeds. Note new total bundle size.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "perf(deps): drop unused @react-three/fiber + drei (~500KB)

Verified zero src usage. No runtime change.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4.2: WebP variants for hero + room images

**Files:**
- Create: WebP files in `public/` next to existing PNGs/JPGs (e.g. `public/hotelview-enhanced.webp`)
- Modify: components that reference these images, to use `<picture>` with WebP source + original fallback

- [ ] **Step 1: Identify largest public images**

```bash
ls -lhS public/ | head -15
```

Note files > 200KB. These are the ROI targets.

- [ ] **Step 2: Generate WebP for each large image**

```bash
npx -y sharp-cli -i 'public/*.{png,jpg,jpeg}' -o public/ -f webp --quality 82 2>&1 | tail -20
```

If `sharp-cli` isn't available, use:

```bash
npx -y @squoosh/cli --webp '{"quality":82}' public/hotelview-enhanced.png -d public/
```

Repeat for each large file. Verify the `.webp` files were written:

```bash
ls -lh public/*.webp
```

Each WebP should be 30–60% smaller than the original.

- [ ] **Step 3: Update `<img>` references to `<picture>` for the largest images**

For each component that references one of the converted images (use grep to find them):

```bash
grep -rln "hotelview-enhanced.png" src/
```

Replace each `<img src="/hotelview-enhanced.png" … />` with:

```tsx
<picture>
  <source srcSet="/hotelview-enhanced.webp" type="image/webp" />
  <img src="/hotelview-enhanced.png" {/* keep all existing props */} />
</picture>
```

Repeat per converted image. Only convert the top 5–10 largest assets — diminishing returns below ~100KB.

- [ ] **Step 4: Build to confirm assets resolve**

```bash
npm run build:prod
```

Expected: succeeds, both PNG and WebP copied to `dist/`.

- [ ] **Step 5: Commit**

```bash
git add public/*.webp src/
git commit -m "perf(images): WebP source + PNG fallback for top hero/room assets

Largest assets converted to WebP at q=82, served via <picture>. Falls
back to PNG for browsers without WebP. ~40% smaller per image.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4.3: Lighthouse mobile re-run + verify targets met

**Files:**
- Create: `docs/superpowers/specs/lighthouse-after-2026-05-08.md`

- [ ] **Step 1: Build prod + start preview**

```bash
npm run build:prod 2>&1 | tee /tmp/build-after.log
npm run preview &
sleep 3
```

- [ ] **Step 2: Run Lighthouse mobile**

```bash
npx -y lighthouse http://localhost:4173/ --only-categories=performance --form-factor=mobile --throttling-method=simulate --output=json --output-path=/tmp/lh-home-after.json --chrome-flags="--headless"
npx -y lighthouse http://localhost:4173/book-now --only-categories=performance --form-factor=mobile --throttling-method=simulate --output=json --output-path=/tmp/lh-booknow-after.json --chrome-flags="--headless"
```

- [ ] **Step 3: Compare against baseline**

Extract LCP / FCP / TBT / CLS / total transfer from the new JSON files. Write `docs/superpowers/specs/lighthouse-after-2026-05-08.md`:

```markdown
# Lighthouse Mobile — After Optimization (2026-05-08)

| Page | LCP (was → now) | FCP | TBT | CLS | Initial JS (was → now) |
|------|-----------------|-----|-----|-----|------------------------|
| /            | … → … | | | | … → … |
| /book-now    | … → … | | | | … → … |

## Targets

- [ ] LCP < 2.5s mobile on / and /book-now
- [ ] Initial JS bundle ≥ 30% smaller
- [ ] No regression in CLS or TBT > 10%
```

Tick the boxes that pass. If any target missed, note in the file what would close the gap (e.g. "still need font-display: swap").

- [ ] **Step 4: Stop preview**

```bash
pkill -f "vite preview" || true
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/lighthouse-after-2026-05-08.md
git commit -m "docs(perf): mobile lighthouse results after optimization

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Phase 5 — Deploy

### Task 5.1: Full lint + production build

- [ ] **Step 1: Run lint suite**

```bash
npm run lint
```

Expected: zero errors. If any errors appear that pre-date this work, note them but do not fix in this round (out of scope).

- [ ] **Step 2: Production build**

```bash
npm run build:prod
```

Expected: succeeds. Note `dist/` size:

```bash
du -sh dist/
```

- [ ] **Step 3: Local preview smoke test**

```bash
npm run preview &
sleep 3
```

In a browser at 375px viewport (or via DevTools mobile emulation), manually verify:

- `/` loads, no horizontal scroll, hero renders, hamburger menu opens
- `/book-now` loads, all 5 steps reachable, sticky CTA visible
- `/staff/login` loads
- (If you have admin creds locally) `/staff/dashboard`, `/staff/bookings`, `/staff/housekeeping` render with mobile tab bar

```bash
pkill -f "vite preview" || true
```

- [ ] **Step 4: No commit needed (no file changes from preview)**

---

### Task 5.2: Push to main → Netlify auto-deploy → verify production

- [ ] **Step 1: Confirm clean local state + on main**

```bash
git status
git branch --show-current
```

Expected: branch `main`, working tree clean (or only contains expected staged docs).

- [ ] **Step 2: Push**

```bash
git push origin main
```

Expected: push succeeds.

- [ ] **Step 3: Watch Netlify deploy**

```bash
netlify watch
```

Or:

```bash
netlify status
netlify open:admin
```

Wait until the deploy moves from "Building" to "Published". Note the deploy URL.

- [ ] **Step 4: Smoke production**

```bash
curl -sI https://www.hobbyskyguesthouse.com/ | head -3
curl -sI https://www.hobbyskyguesthouse.com/book-now | head -3
```

Expected: `HTTP/2 200`. If the response is 404 or 5xx, check Netlify logs via `netlify logs:deploy` and roll back via `netlify rollback` (or via dashboard) — do not leave a broken deploy.

- [ ] **Step 5: Real-device check**

On a real phone, open https://www.hobbyskyguesthouse.com — verify:
- Hero loads quickly, no layout shift
- Hamburger menu works
- Book Now flow runs through to the final step
- Page is styled correctly (no missing CSS / broken fonts)

Document result. If anything broken: `git revert HEAD~N..HEAD` the offending phase commits and re-push.

- [ ] **Step 6: Final commit (if any tweak needed)** + close out.

---

## Self-Review

**1. Spec coverage check (against `docs/superpowers/specs/2026-05-08-mobile-optimization-design.md`):**

| Spec section | Tasks |
|--------------|-------|
| Goal: responsive layout | 2.1–2.5, 3.4–3.7 |
| Goal: performance (LCP, bundle) | 1.3, 4.1, 4.2, 4.3 |
| Goal: mobile-first UX | 2.5, 3.1, 3.2, 3.3, 3.6, 3.7 |
| Public website (8 page surfaces) | 2.1–2.5 |
| Critical admin (4 pages) | 3.3, 3.4, 3.5, 3.6, 3.7 |
| New `MobileSheet` | 3.1 |
| New `MobileTabBar` | 3.2 |
| Image upgrades (WebP) | 4.2 |
| Bundle trim | 1.3, 4.1 |
| Lighthouse before/after | 1.1, 4.3 |
| Deploy | 5.1, 5.2 |

All in-scope spec items have at least one task. ✅

**2. Placeholder scan:** No "TBD"/"TODO"/"similar to". File-level instructions like "find the existing `<Dialog>`" are paired with concrete grep commands and concrete replacement code — acceptable. ✅

**3. Type/name consistency:** `MobileSheet` (3.1) is consumed in 3.6 + 3.7 with the same prop names (`open`, `onOpenChange`, `title`). `MobileTabBar` (3.2) is consumed in 3.3. ✅

**4. Risk:** Task 3.5 (BookingsPage 1106 lines) is the highest-risk task — mitigated by additive-only edits and reusing existing handlers. Plan calls out reading desktop handlers first. ✅

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-08-mobile-optimization.md`. Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session via executing-plans, batch with checkpoints.

Which approach?
