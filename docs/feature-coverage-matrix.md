# Feature Coverage Matrix — moved

This file is a stale, unmaintained duplicate. **The real, actively-regenerated
version is
[`docs/architecture/feature-coverage-matrix.md`](architecture/feature-coverage-matrix.md)**
(`npm run feature-coverage-matrix:write-docs`, which writes there — see
`src/data/featureCoverageMatrix.report.test.ts`). Read that file, not this one.

Correction (2026-08-04): an earlier pass on the same day initially concluded
the opposite — that *this* root-level file was canonical and
`docs/architecture/feature-coverage-matrix.md` was the stale duplicate — based
on `scripts/run-closure-audit-sequence.mjs` citing this path and this file
having a more recent "Generated" date at the time. That conclusion was wrong
and was corrected the same day by testing the actual regeneration script
directly (`buildFeatureCoverageRows()` in `src/data/featureCoverageMatrix.ts`,
called live) and confirming its output matches
`docs/architecture/feature-coverage-matrix.md`, not this file. If you're
reading this and considering trusting either file's content, don't — always
regenerate fresh via the npm script and read the actual write target in
`featureCoverageMatrix.report.test.ts` rather than trusting either markdown
file's claimed "Generated" date or any other doc's inbound reference.
