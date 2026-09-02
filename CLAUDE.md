# CLAUDE.md

See [`AGENTS.md`](AGENTS.md) for orientation and the commands, and
[`.github/copilot-instructions.md`](.github/copilot-instructions.md) for the full
engineering, identity/access and AI-safety rules. Both apply here — this file
does not restate them, so that there is one place to change a rule.

Claude Code specific notes:

- **PowerShell is the default shell on this machine**, and a Bash tool is also
  available. They take different syntax; `&&` and `||` are parser errors in
  Windows PowerShell 5.1 — use `;` with `if ($?)`, or run the command through Bash.
- **Redirect long runs to a file.** `npm run test:run:parallel` takes ~14 minutes
  and its output is longer than the harness will show you; write it to the
  scratchpad and grep the summary out, or you will report a truncated result as a
  complete one.
- **Verify exit codes directly.** `cmd | tail` and `cmd; echo $?` both report the
  *last* command's status, which has previously turned a failing suite into a
  reported pass.
- **`git add` aborts the whole invocation on one bad pathspec** — nothing gets
  staged, and the commit then silently omits files. After mixing `mv`/`rm` with
  edits, confirm with `git show --stat HEAD`.
- **The dev server dies silently.** `curl -s -o /dev/null -w "%{http_code}"
  http://localhost:3000` before concluding a page is broken, and rebuild the
  backend manually — the dev stack builds it once, so a stale build shows up as
  Vite 504s that look like an outage.
- **Measure performance against a production build**, never dev mode. Dev-mode
  module loading has produced 20–40s figures for pages that block for ~200ms in
  `npm run build && npm run preview`.
- **Another agent may be working in this repo.** Inspect unfamiliar untracked
  files before touching them rather than assuming they are yours.
