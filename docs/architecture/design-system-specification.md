# Emergency OS Design System Specification

Date: 2026-06-13

## Scope

This pass centralizes the Emergency Operations Mission Control visual language without changing routing, AppShell structure, layout ownership, page architecture, or feature behavior.

## Theme Tokens

Light mode:

- Primary `#2563EB`, secondary `#0EA5E9`, accent `#06B6D4`.
- Background `#F6F8FB`, surface/card/floating surface `#FFFFFF`.
- Border `#E5E7EB`.
- Text primary `#111827`, text secondary `#6B7280`.

Dark mode:

- Primary `#3B82F6`, secondary `#38BDF8`, accent `#22D3EE`.
- Background `#0B1220`, surface `#111827`, card `#172033`, floating surface `#1E293B`.
- Border `#2D3748`.
- Text primary `#F9FAFB`, text secondary `#9CA3AF`.

Status and capacity:

- Success `#22C55E`, warning `#F59E0B`, danger `#EF4444`, info `#06B6D4`, emergency `#DC2626`.
- Capacity green `#22C55E`, yellow `#EAB308`, orange `#F97316`, red `#DC2626`.

## Component Tokens

Tokens are centralized in `src/styles/theme-tokens.css`, `src/styles/design-tokens.css`, and the late-loaded Emergency OS bridge in `src/globals.css`.

- Cards: `--component-card-bg`, `--component-card-border`, `--component-card-radius`, `--component-card-padding`, `--component-card-gap`, `--component-card-shadow`.
- Buttons: `--component-button-height`, `--component-button-radius`, `--component-button-primary-bg`, `--component-button-secondary-bg`, `--component-button-danger-bg`, `--component-button-ghost-bg`.
- Typography: Inter, page title `32px`, section title `24px`, card title `18px`, body `14px`, caption `12px`.
- Radius: compact `12px`, standard `16px`, large/modal `20px`.
- Elevation: subtle card/floating/modal shadows mapped to `--app-elevation-*`.

## Design Principles

Cards are floating operational surfaces with soft borders, subtle elevation, and low visual noise. Controls use 40px standard height, 12px radius, clear focus rings, and semibold text. Tables retain sticky headers where already present and use subtle row emphasis. Empty/loading/error states remain visible and tokenized.
