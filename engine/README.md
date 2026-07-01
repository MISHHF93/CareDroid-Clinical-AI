# Engine compatibility shims

Canonical ED intelligence engines live in **`src/engine/`**.

Files in this folder re-export from `src/engine/` so legacy imports from `lib/` and `store/` keep working. New code should import from `src/engine/` or `../engine/` within `src/`.