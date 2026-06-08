# Search-Before-Navigation Report

## Goal

Reduce navigation dependence.

Improve:

- Command palette
- Global search
- AI search

Every major capability should be:

- Searchable
- Launchable
- Discoverable

## Audit Areas

- Command palette destinations and indexed actions
- Global search result sources
- AI/search capability suggestions
- Tool, workspace, operation, platform, and commercial capability indexing
- Launch routing and access handling

## Findings

### Command Palette

- **Finding:** Quick Command already consumed the search-first index, but only allowed a subset of discovery kinds.
- **Impact:** Some global-search capabilities were searchable in `/search` but not launchable from the command palette.
- **Repair:** Quick Command now includes destination, dashboard-style destination, notification, and commercial discovery entries.

### Global Search

- **Finding:** `searchFirstDiscovery` was the best canonical search index, but it lacked commercial/catalog row-level entries.
- **Impact:** Users could find top-level commercial pages but not common launch targets such as Emergency Department Solution, Sepsis Care Pathway, FHIR Patient Integration, or AI agents.
- **Repair:** Added commercial capability and row-level entries to the shared search-first index.

### AI Search

- **Finding:** AI capability suggestions used the search-first index, but search results did not have a path for caller-provided navigation permissions.
- **Impact:** AI search could diverge from global/command search exposure rules.
- **Repair:** AI search suggestions can now pass `navigationPermissions` into search-first results.

### Launchability

- **Finding:** The command palette used different launch behavior by discovery kind, leaving some indexed entries non-launchable.
- **Impact:** Search results were discoverable but not consistently launchable.
- **Repair:** Quick Command now launches the expanded discovery kinds with the same path/assistant prompt fallback behavior.

### Relevance

- **Finding:** Search-first results were sorted alphabetically after filtering.
- **Impact:** Exact and prefix matches could appear below less relevant entries.
- **Repair:** Added relevance scoring for exact label, prefix, alias, and full-text matches before alphabetical fallback.

## Repairs

- Extended `src/data/searchFirstDiscovery.js` with commercial capability groups and row-level commercial entries.
- Added relevance scoring to `filterSearchFirstDiscoveryEntries()`.
- Broadened `src/components/QuickCommandLauncher.jsx` discovery coverage and launch handling.
- Added commercial and notification icon mapping support for command/AI search surfaces.
- Added optional `navigationPermissions` to `getChatCapabilitySuggestions()` search-first integration.
- Passed Assistant page navigation permissions into AI capability suggestions.
- Added regression coverage for commercial search results and command-palette launches.

## Verification

Passed:

- `npm test -- searchFirstDiscovery.test.js QuickCommandLauncher.test.jsx PlatformOSPages.test.jsx Dashboard.chatLayout.test.jsx`
