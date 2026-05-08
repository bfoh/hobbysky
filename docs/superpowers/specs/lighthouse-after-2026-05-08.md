# Mobile Performance — After Optimization (2026-05-08)

## Bundle metrics (vite build output)

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Initial JS bundle (raw) | 3,080.47 kB | **909.96 kB** | **−70%** |
| Initial JS bundle (gzip) | 815.30 kB | **249.55 kB** | **−69%** |
| Image payload (top 11 hero/gallery) | 16.9 MB | **1.0 MB** | **−94%** |
| Public visitors download admin code? | Yes | No | ✅ split |

## Targets

- [x] Initial JS bundle ≥ 30% smaller (achieved 70%)
- [x] No horizontal scroll at 320–1024px (verified via Tailwind responsive utilities + body overflow guard)
- [x] Tap targets ≥ 44px on all primary CTAs and nav controls
- [x] Form inputs ≥ 16px on mobile (iOS no-zoom rule)
- [x] Safe-area insets respected on all sticky/fixed elements
- [x] Admin pages chunk-split per-route via `React.lazy()`
- [x] WebP variants for largest images
- [x] Unused 3D libs removed
- [x] LCP image preload via `<link rel="preload" as="image" type="image/webp">`
- [ ] LCP < 2.5s (validate via real Lighthouse on production after deploy)

## Build environment note

Local builds run on Node.js 21.7.1 (Vite recommends 20.19+ or 22.12+, but builds succeed). Netlify builds on Node 22.

## Largest remaining chunks (acceptable, lazy-loaded)

| Chunk | Why |
|-------|-----|
| `AnalyticsPage-*.js` 472 KB | Recharts + heavy aggregation; admin-only |
| `jspdf.es.min-*.js` 382 KB | PDF generation; only loaded on invoice routes |
| `html2canvas.esm-*.js` 199 KB | Same as above |
| `OnsiteBookingPage-*.js` 84 KB | Admin-only |
| `EmployeesPage-*.js` 108 KB | Admin-only |

These are correctly chunked: public visitors don't pay for them.

## Post-deploy verification checklist

After Netlify publishes:

1. Run real Lighthouse mobile against `https://www.hobbyskyguesthouse.com/` and `https://www.hobbyskyguesthouse.com/book-now`. Confirm LCP < 2.5s.
2. Real-device check: complete a test booking on actual phone.
3. Real-device check: front-desk admin user logs in, verifies bottom tab bar + responsive bookings list.
