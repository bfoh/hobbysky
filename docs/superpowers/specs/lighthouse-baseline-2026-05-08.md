# Mobile Performance Baseline — 2026-05-08

Lighthouse mobile via headless Chrome unavailable in this sandbox. Using `vite build` chunk sizes as the primary perf metric. Lighthouse will be re-validated in production after deploy.

## Build output (before optimization)

| Chunk | Raw | Gzip |
|-------|-----|------|
| `index-Dj9_FnoX.js` (monolith) | **3,080.47 kB** | **815.30 kB** |
| `index.es-DHUhawTU.js` | 155.97 kB | 50.95 kB |
| `index-Rk7PHnW1.css` | 180.41 kB | 28.26 kB |
| `page-Dhalf5yt.js` | 51.39 kB | 12.20 kB |
| `vendor-o1p2wq5R.js` | 46.27 kB | 16.22 kB |
| `page-DAjzrXrP.js` | 23.03 kB | 6.78 kB |
| `purify.es-vonsjV1r.js` | 22.64 kB | 8.50 kB |
| Smaller page chunks | < 20 kB each | — |

**Total initial JS: ~3,080 KB raw / 815 KB gzip** (the index monolith dominates — every visitor downloads admin code).

## Key issues

1. **Single 3MB JS bundle** — admin pages eagerly imported in `App.tsx`. Public visitors download all of HMA admin.
2. Multiple "dynamic import will not move module into another chunk" warnings from Vite — modules dynamically imported but also statically imported elsewhere (defeats code-split).
3. CSS bundle 180KB — likely Tailwind not purging unused (`./src/**/*.ts` warns about node_modules pattern overlap).
4. `@react-three/fiber` + `@react-three/drei` listed in deps but zero src usage (~500KB potential bundle savings).

## Targets after optimization

- Initial JS bundle ≥ 30% smaller (target: < 2,150 KB raw / < 570 KB gzip)
- LCP < 2.5s on mobile in production (verify via real Lighthouse post-deploy)
- No horizontal scroll at 320–1024px on any in-scope page
- Tap targets ≥ 44px

## Build environment note

Local builds run on Node.js 21.7.1 (Vite recommends 20.19+ or 22.12+). Netlify uses Node 22 per `netlify.toml`.
