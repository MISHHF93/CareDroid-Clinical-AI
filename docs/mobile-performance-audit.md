# Mobile performance audit

**Audit date:** 2026-05-19  
**Targets:** LCP ≤ 2.5s · low CLS · fast tap response (INP)  
**Gate:** `npm run test:mobile-performance`

---

## Executive summary

| Area | Finding | Action taken |
|------|---------|--------------|
| **Images** | No large raster assets in repo; 2 avatar/QR `<img>` only | `loading="lazy"`, `decoding="async"`, explicit `width`/`height` |
| **Lazy loading** | Routes already use `lazyWithRetry`; Dashboard was eager | Dashboard, Profile, Settings lazy-loaded |
| **Bundle size** | Initial `index-*.js` reduced ~245 KB → ~118 KB (~67 → ~34 KB gzip) | Deferred Dexie/Firebase/analytics/offline startup; split chunks |
| **Unnecessary renders** | Chat `ToolCard` re-rendered on parent updates | `React.memo(ToolCard)` |
| **Large JS chunks** | `Calculators` ~225 KB, `ClinicalToolCatalog` ~69 KB | Separate manual chunks (`calculators`, `clinical-catalog`, `dashboard`) |
| **CLS** | Route loaders lacked reserved height | `mobile-performance.css` min-height + `contain` on loaders |
| **LCP** | Sync service init + 500 ms auth splash delayed paint | Deferred startup; auth splash 150 ms max |
| **INP / latency** | NLU recommendations on critical path | `scheduleIdleWork` after idle |

---

## 1. Image sizes

| Asset | Location | Size | Notes |
|-------|----------|------|-------|
| `/vite.svg` | favicon | small SVG | No PNG/JPEG bundles |
| QR code | `TwoFactorSetup.jsx` | data URL | `width`/`height` 280 |
| Avatar | `DataDisplay.jsx` | remote URL | 48×48 reserved box |

**Recommendation:** If marketing images are added, ship WebP, `srcset`, and max width ≤ 640 for mobile.

---

## 2. Lazy loading

| Layer | Status |
|-------|--------|
| React Router pages | `lazyWithRetry` for tools, fleet, legal, analytics |
| Dashboard shell | Now lazy (`dashboard` chunk) |
| Images | `loading="lazy"` on avatars |
| Below-fold DOM | `content-visibility: auto` on chat scroll + catalog tables |

---

## 3. Bundle sizes (production build)

Run `npm run build` and inspect `dist/assets/`. Typical layout after optimizations:

| Chunk | Role |
|-------|------|
| `vendor-react` | React + router |
| `vendor-icons` | lucide-react |
| `vendor-idb` | Dexie (offline; deferred init) |
| `vendor-firebase` | FCM (deferred) |
| `dashboard` | Chat home |
| `calculators` | Calculator hub (route-only) |
| `clinical-catalog` | Tool catalog (route-only) |
| `index` | App shell, contexts, auth |

**CI guard:** `test:mobile-performance` asserts deferred startup + lazy dashboard + chunk config.

---

## 4. Unnecessary renders

- `ToolCard` wrapped in `React.memo`.
- Recommendation fetch deferred with `requestIdleCallback` (fallback `setTimeout`) so keystrokes are not competing with NLU work.

**Future:** virtualize long chat threads if message count routinely exceeds ~50.

---

## 5. Large JS chunks

Intentionally isolated:

- `calculators` — all Tier A/B calculator forms
- `clinical-catalog` — catalog index + search
- `analytics` — recharts dashboards

Do not import these modules from `Dashboard` or `AppShell`.

---

## 6. CLS (Cumulative Layout Shift)

| Risk | Mitigation |
|------|------------|
| Route transition flash | `.page-loader` uses `min-height: 100dvh` + `contain: layout` |
| Auth init splash | Reduced artificial delay; ties to `isLoading` |
| Images | Explicit dimensions on `<img>` |
| Fonts | System stack via theme tokens (no webfont FOIT) |

---

## 7. LCP (Largest Contentful Paint)

| Factor | Mitigation |
|--------|------------|
| Main-thread long tasks at boot | `scheduleDeferredStartupTasks()` — analytics, offline, push, Sentry after idle |
| Large sync imports in `main.jsx` | Removed; dynamic `import()` in defer module |
| Dashboard in initial bundle | Lazy route chunk |
| CSS | Single index CSS unavoidable; page CSS already split per route |

**Measure:** Chrome DevTools → Performance → mobile 4× CPU throttle, or Lighthouse mobile on `/dashboard` after login.

---

## 8. Interaction latency (INP)

| Factor | Mitigation |
|--------|------------|
| `touch-action: manipulation` | Buttons / composer |
| Idle NLU recommendations | `scheduleIdleWork` |
| `prefers-reduced-motion` | Disables spinner animation |

---

## Regeneration & verification

```bash
npm run build
npm run test:mobile-performance
```

Related: [mobile-first-responsive-audit.md](./mobile-first-responsive-audit.md), [design-tokens-audit.md](./design-tokens-audit.md).
