# Prompt navigation test report

**Generated:** 2026-07-24T04:40:13.620Z
**Result:** **PASS** (19 passed, 0 failed, 19 total)

Vitest blocked in this environment (esbuild.exe Application Control). This runner executes the real transpiled modules.

| Status | Test |
|--------|------|
| PASS | exposes a non-empty closed catalog with unique ids |
| PASS | resolves open reception desk prompts |
| PASS | resolves whiteboard and HEART score |
| PASS | resolves reception panel intents (OCR, lookup, shift clearance) |
| PASS | returns null for unknown / question prompts (chat path) |
| PASS | denies clinical calculators for registration clerk |
| PASS | requires permission held by the user |
| PASS | builds proposal input from intent without inventing paths |
| PASS | navigates for open_route |
| PASS | dispatches panel events when already on reception |
| PASS | navigates then dispatches when not on reception |
| PASS | identifies navigation tool names |
| PASS | looksLikeNavigationPrompt gates questions vs open phrases |
| PASS | registry is frozen with unique ids and non-empty queries |
| PASS | includes AI open-route palette commands |
| PASS | open palette commands require view_operations and are listable |
| PASS | unknown palette ids are refused |
| PASS | InteractiveAIWorkspace imports and uses navigation execute path |
| PASS | ReceptionWorkspace listens for lookup and shift-clearance events |
