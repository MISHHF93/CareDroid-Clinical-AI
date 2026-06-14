# Master Harmonization Report

Date: 2026-06-13

## Active Product Spine

The active product is one CareDroid Emergency OS Vite React SPA under `src/`, mounted by `src/App.jsx`, using `src/components/AppShell.tsx`, `src/components/Sidebar.tsx`, `src/components/Header.tsx`, `src/config/unified-navigation.config.ts`, `src/config/commandPalette.config.js`, `src/store/emergencyStore.ts`, and Nest `/api/emergency/*` endpoints.

## Normalized One Product Rule

- One AppShell: `src/components/AppShell.tsx`.
- One route surface: the 12 canonical `/emergency/*` routes in `src/App.jsx`.
- One navigation registry: `src/config/unified-navigation.config.ts`.
- One command palette registry: `src/config/commandPalette.config.js`.
- One frontend Emergency OS API facade: `src/services/emergencyOsApi.js`.
- One backend Emergency OS module/API convention: `backend/src/modules/emergency-os` exposed through `/api/emergency/*`.
- One central operational node: `CareDroidCentralNode` in frontend and backend.

## Classification Summary

- Active: canonical routes, AppShell, sidebar, header, command palette, Emergency OS store, central node, API facade, Nest Emergency OS module, module pages, settings, analytics, ED Copilot context.
- Connected but fixture/demo backed: Provincial Health Connector, Integration Hub, simulation, federated learning, digital twin, advanced AI/ML facades.
- Compatibility/legacy: `src/layout/AppShell.jsx`, `/workspace/emergency/*`, older `/dashboard`, `/assistant`, `/tools/*`, and optional Express/Mongoose emergency routes. These redirect or remain review-only instead of becoming active architecture.
- Manual review: broad platform modules, Android/mobile artifacts, future-module archives, and non-Emergency OS platform pages. No destructive cleanup was run.

## Harmonization Pass

This prior harmonization note is superseded by the one-system audit. The active code keeps the existing `Emergency OS` wordmark, `READ_ONLY_DISPLAY` screen mode, and the central node consumer already mounted in the header.
