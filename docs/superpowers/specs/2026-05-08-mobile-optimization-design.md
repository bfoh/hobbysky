# Mobile Optimization — Design Spec

**Date:** 2026-05-08
**Project:** Hobbysky Guest House — HMA + public website
**Target deployment:** https://www.hobbyskyguesthouse.com (Netlify project `hobbysky-guest-house-official`)

## Goals

1. **Responsive layout** — every shipped page renders correctly at 320px–1024px wide with no horizontal scroll, tap targets ≥ 44px, readable type scale.
2. **Performance** — LCP < 2.5s on simulated 4G for home + book-now. Initial JS bundle shrinks ≥ 30% via route-level lazy loading.
3. **Mobile-first UX** — sticky CTAs on booking flow, bottom-sheet pattern for admin modals, bottom-tab nav for critical admin sections.

## Scope

### In scope

**Public website (full pass):**
- Header / mobile menu (`src/website/components/feature/Header.tsx`)
- Home page sections (`src/website/pages/home/components/*`): Hero, About, Rooms, Amenities, Gallery, Testimonials, BookingCTA, Location
- About page (`src/website/pages/about/page.tsx`)
- Gallery page (`src/website/pages/gallery/page.tsx`)
- Contact page (`src/website/pages/contact/page.tsx`)
- Book-now 5-step wizard (`src/website/pages/book-now/page.tsx` + components)
- Footer (`src/website/components/feature/Footer.tsx`)

**Critical admin pages:**
- `AppLayout` (`src/components/layout/AppLayout.tsx`) — sidebar collapse + mobile hamburger + bottom-tab nav
- DashboardPage — KPI cards stack
- BookingsPage — card-list under `md` breakpoint, swipe-friendly check-in/out
- HousekeepingPage — 2-col room grid, big toggles
- Guest charges + checkout flow (`src/pages/staff/CheckoutPage` or equivalent on Bookings detail) — bottom-sheet drawer for charge entry

### Out of scope (this round)

- AnalyticsPage charts (dense desktop tool)
- Full InvoicesPage admin UI (already print-optimized; admin desktop)
- HRPage, ReportsPage, SetPricesPage, ChannelsPage, MarketingPage, ServiceRequestsPage, ActivityLogsPage, EmployeesPage, CleanupToolPage, DiagnoseEmailPage, ReviewsPage
- Guest portal (`/pages/guest/*`) — separate audit if needed later
- Email/invoice HTML templates (already mobile-tested)
- Database/schema/backend changes

## Architecture

### No new dependencies

Use existing stack:
- Tailwind CSS responsive utilities (`sm: md: lg: xl:`)
- Radix UI primitives already installed (Dialog, ScrollArea, etc.)
- Lucide-react icons already in use
- React Router `lazy()` + `Suspense` for code-splitting (Suspense already imported in App.tsx)

### New components (2)

**`src/components/ui/MobileSheet.tsx`** — bottom-sheet wrapper around `@radix-ui/react-dialog`. Slides up from bottom on mobile, falls back to centered modal on `md+`. Used for admin charge-entry, booking edit, status changes on small screens. Props: `open`, `onOpenChange`, `title`, `children`.

**`src/components/layout/MobileTabBar.tsx`** — fixed-bottom 4-icon nav, only visible `<md`. Tabs: Bookings • Housekeeping • Charges (= today's checkouts) • Dashboard. Active route highlighted in `resort-gold-400`. Hidden when `MobileSheet` open.

### Modified files

| Area | Files | Change |
|------|-------|--------|
| Routing | `src/App.tsx` | Wrap admin route components in `lazy(() => import('...'))`. Keep `StaffLoginPage` + `AppLayout` eager. |
| Layout | `src/components/layout/AppLayout.tsx` | Sidebar becomes drawer on `<lg`, mounts `MobileTabBar` on `<md`. |
| Layout | `src/components/layout/StaffSidebar.tsx` | Accept `onNavigate` to close drawer after click. |
| Public nav | `src/website/components/feature/Header.tsx` | Verify/fix mobile menu animation, add safe-area-inset-top, ensure tap targets ≥ 44px. |
| Public pages | All `src/website/pages/**/*.tsx` | Tailwind responsive utilities pass: stacking, type scale, image sizing. |
| Booking flow | `src/website/pages/book-now/page.tsx` + components | Single-column wizard <md, sticky bottom CTA bar, sticky progress header. |
| Admin pages | DashboardPage, BookingsPage, HousekeepingPage, charges/checkout | Card-list/2-col grid mobile patterns; replace inline modals with `MobileSheet`. |
| Global CSS | `src/index.css` | Add safe-area CSS vars (`--safe-area-bottom: env(safe-area-inset-bottom, 0px)`), prevent body horizontal scroll. |
| Images | `public/*` hero/gallery, components consuming them | Add `loading="lazy"` `decoding="async"`, generate WebP variants for hero + room cards (largest assets). |
| Bundle | Audit `package.json` | Drop `@react-three/fiber` + `@react-three/drei` if unused after grep. |

### Data flow

Unchanged. UI-only.

### Error handling

Unchanged. Existing `ErrorBoundary` continues to wrap routes. New components add no new failure modes — `MobileSheet` propagates `open` errors via Radix as before.

## Testing

**Manual viewport regression** — for each modified page, verify at:
- 320px (smallest phone)
- 375px (iPhone SE / mini)
- 390px (iPhone 14/15)
- 414px (Plus / Pro Max)
- 768px (tablet portrait)
- 1024px (tablet landscape / small laptop)

**Acceptance per page:**
- No horizontal scroll
- All interactive elements ≥ 44px high
- Text readable without zoom (≥ 14px body, ≥ 16px form inputs to prevent iOS zoom)
- Sticky CTAs above safe-area inset
- No layout shift on hero image load

**Performance validation:**
- Lighthouse mobile run before any work → record baseline
- Lighthouse mobile run after Phase 4 → must hit LCP < 2.5s on home + book-now
- Bundle size: initial JS chunk shrinks ≥ 30% (measured via `vite build` output)

**Smoke test post-deploy:**
- Real phone: load www.hobbyskyguesthouse.com, complete a test booking end-to-end
- Real phone: log into admin, do a test check-in via mobile

## Build sequence

### Phase 1 — Foundation

1. Lighthouse mobile baseline; save `docs/superpowers/specs/lighthouse-baseline-2026-05-08.json`.
2. Add safe-area CSS vars + `overflow-x: hidden` on `body` in `src/index.css`.
3. Convert all admin route imports in `src/App.tsx` to `lazy()`. Keep `AppLayout`, `StaffLoginPage`, `ProtectedRoute`, `Header`, `Footer`, `ErrorBoundary` eager.
4. Add `loading="lazy"` / `decoding="async"` to all `<img>` outside the LCP element.

### Phase 2 — Public website

1. `Header.tsx`: verify mobile menu animation, safe-area, ≥44px tap. Add Book Now visible in mobile menu.
2. `HeroSection.tsx`: stack CTA buttons <sm, fluid clamp() type, preload hero image.
3. `OurRoomsSection.tsx`: 1-col cards <md, optional snap-scroll horizontal carousel.
4. `AmenitiesSection.tsx`, `AboutSection.tsx`, `LocationSection.tsx`, `TestimonialsSection.tsx`, `GallerySection.tsx`, `ImageGalleryGrid.tsx`, `BookingCTA.tsx`: responsive padding, type, columns.
5. About / Gallery / Contact pages: responsive grids, 2-col gallery <md, full-width form inputs.
6. `book-now/page.tsx`: single-column wizard <md, sticky bottom CTA, sticky progress header, `font-size: 16px` on inputs.

### Phase 3 — Critical admin

1. `AppLayout.tsx` + `StaffSidebar.tsx`: hamburger drawer <lg, `MobileTabBar` <md.
2. New `MobileSheet.tsx` + `MobileTabBar.tsx`.
3. `DashboardPage.tsx`: KPI cards 1-col <sm / 2-col sm-md.
4. `BookingsPage.tsx`: hide table <md, render card list with title/status/dates/CTA. Filter bar collapses behind a toggle on mobile.
5. `HousekeepingPage.tsx`: room grid 2-col <md, large status toggles, swap inline modals → `MobileSheet`.
6. Guest charges + checkout: `MobileSheet` for add-charge form; checkout review screen single-column.

### Phase 4 — Performance

1. Generate WebP for `/public/*` hero + room images (use `sharp` via npx, or pre-generated). Update `<img>` to use `<picture>` with WebP source + JPG fallback.
2. Subset `Inter` + `Playfair Display` (or Google Fonts query strings with `text=`) if used.
3. `grep` for `@react-three` usage; drop from `package.json` if unused. Same for any other heavy unused dep.
4. Re-run Lighthouse mobile; save `lighthouse-after-2026-05-08.json`.

### Phase 5 — Deploy

1. `npm run lint` (types + JS + CSS).
2. `npm run build:prod` — confirm no errors, note bundle sizes.
3. Local preview at `http://localhost:4173` via `npm run preview`. Smoke check key pages.
4. `git add -A && git commit` per phase (5 commits) → push `main`.
5. Netlify auto-deploys via `netlify.toml`. Watch `netlify status` / Netlify dashboard until deploy succeeds.
6. Verify www.hobbyskyguesthouse.com on real phone.

## Risks + mitigations

| Risk | Mitigation |
|------|-----------|
| BookingsPage (1106 lines) refactor breaks desktop table | Extract mobile card list as new `<BookingsMobileList>` component, render alongside table with Tailwind `hidden md:block` / `md:hidden`. Don't restructure table. |
| Lazy admin routes cause flash on every nav | Wrap `<Suspense>` once at admin shell with branded skeleton, not per-route. |
| Sticky bottom CTA overlaps content | All scrollable areas get `padding-bottom: calc(64px + var(--safe-area-bottom))` when sticky CTA mounts. |
| WebP conversion breaks legacy iOS | `<picture>` with JPG fallback. iOS 14+ supports WebP natively. |
| Netlify build fails on changed asset paths | Phase 4 image work tested locally with `vite build` before commit. |

## Success criteria

1. All in-scope pages pass viewport regression at 320–1024px.
2. LCP < 2.5s mobile on home + book-now.
3. Initial JS bundle ≥ 30% smaller than baseline.
4. Booking flow completes successfully on real iPhone + Android.
5. Admin user can do a check-in on phone in <10 taps.
6. www.hobbyskyguesthouse.com serves the new build.
