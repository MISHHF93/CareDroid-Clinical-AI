# CareDroid Clinical AI UX/UI Scrolling and Layout Evaluation

## 1. Executive Summary
A source-first UX audit was completed across shell/layout CSS, key route-level pages, chat/workspace flows, calculator surfaces, and map/fleet panels. The app already uses a mostly strong single-scroll architecture (`.app-shell-page-body` as primary scrollport), but a few targeted issues were found and safely fixed: map canvas clipping on narrow widths, mobile notification dropdown overflow, and overly wide mobile tool-result tables.

## 2. Global Scrolling Findings
- Primary page scroll is centralized in `app-shell-page-body` with `overflow-y: auto`, which is the correct top-level pattern.
- Known risk area identified: `LiveTrackingMap` used fixed-size map internals (`min-width: 720px`) while canvas used `overflow: hidden`, causing clipped horizontal reachability on small screens.
- Risk fixed by switching map canvas to local horizontal scroll and explicit width handling for map internals.

## 3. Component Boundary Findings
- Most major cards already enforce `min-width: 0` and wrapping behavior.
- Tool result tables had a hard 520px mobile minimum that could push narrow devices into awkward overflow; reduced to 460px while preserving local horizontal scrolling.
- Notification dropdown used fixed 400px width that could exceed mobile viewport edge in compact shell contexts.

## 4. Page-by-Page UX Findings
- Auth / Dashboard / Assistant: visually coherent and compact, chat input/action rail visible in existing tests.
- Tools / Calculators: good responsive utility classes and mobile tests already in place.
- Live Map: primary layout solid; overflow behavior required fix for small-width map access.
- Fleet / IoT / Hospital dashboards: structurally aligned to shared card system and tokenized theme.
- Fallback/Not-found and tool fallback pages are already covered by targeted route tests.

## 5. AI Chatbot Wireframe Findings
- Assistant remains discoverable and central through dashboard/chat layout.
- Tool execution cards and result surfaces are integrated in chat stream.
- Remaining product-level opportunities are integration depth (passing map/fleet context to assistant), not layout blockers.

## 6. Responsive Findings
Validated in code and existing tests for phone/tablet ranges with updated safeguards:
- No forced viewport overflow from notification dropdown.
- Live map internals remain reachable via local scroll where necessary.
- Tool result tables maintain readability with reduced minimum width and local overflow.

## 7. Interaction Findings
- Existing components already include focus/hover and action rail affordances in key surfaces.
- No unsafe interaction rewrites were applied; only boundary/overflow-safe improvements.

## 8. Design Language Findings
- Compact theme and token-based styling are largely consistent.
- Fixes preserved existing neutral + blue-accent language and component density.

## 9. Fixes Applied
1. `LiveTrackingMap.css`
   - Converted map canvas from clipping (`overflow: hidden`) to local scroll (`overflow: auto`).
   - Added explicit width behavior for map marker layer and mobile width adjustments.
2. `NotificationCenter.css`
   - Made dropdown width viewport-safe using `min(400px, calc(100vw - 24px))`.
3. `ToolCard.css`
   - Reduced mobile result-table minimum width from `520px` to `460px` to reduce clipping pressure.
4. `Dashboard.mobile.test.jsx`
   - Updated CSS contract assertion to match revised mobile table minimum width.

## 10. Remaining Risks
- Some advanced pages (high-density data widgets) still rely on route-specific CSS contracts rather than visual snapshot regression.
- Full interactive E2E viewport matrix would further reduce residual risk for edge states (empty/loading/error across all feature modules).

## 11. Test Results
- Targeted responsive/layout unit tests passed (see run log in PR/test section).
- Lint and production build passed.
