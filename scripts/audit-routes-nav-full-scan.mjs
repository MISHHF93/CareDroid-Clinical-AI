#!/usr/bin/env node
/**
 * Inventory-only full-app routes/nav scan.
 *
 * Answers "is the whole application actually wired up?" by cross-referencing
 * three layers, all parsed from source text (no build step, no runtime):
 *   1. CANONICAL_ROUTES        — the full path-constant surface (src/config/routes.config.ts)
 *   2. CANONICAL_ROUTE_MAP     — nav/permission metadata records (id, path, showInNav)
 *   3. HOSPITAL_ROLE_NAV_IDS   — each hospital role's curated sidebar allowlist
 *      (src/config/roleClusterNav.config.ts)
 *
 * This is the mechanized version of how the Cycle 153 PatientRoomDisplay
 * orphan was found by hand: a route with no CANONICAL_ROUTE_MAP entry and no
 * reference anywhere outside the routing/registry plumbing itself is a real
 * page nobody can click to. Same limits as scripts/audit-tone-value-coloring.mjs:
 * text-level heuristics, NOT a runtime simulation of Pilot Mode / entitlement /
 * profile-scoped nav filtering (those layers are dynamic and role+context
 * dependent — a script can't safely claim to replicate them). Expect false
 * positives (e.g. a route only ever opened via query-param action, or reached
 * through a non-obvious card link) and false negatives (a reference inside a
 * string template this script's regexes don't catch, or a path mentioned only
 * in prose/FAQ text rather than a real <Route>/<Link>). A human must review
 * every row before treating it as a real defect — do not auto-fix from this
 * output.
 *
 * Usage: node scripts/audit-routes-nav-full-scan.mjs
 * Output: qa/route-nav-full-scan.json (and a console summary)
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(__dirname, '..');
const srcRoot = join(repoRoot, 'src');

const routesConfigPath = join(srcRoot, 'config/routes.config.ts');
const roleNavConfigPath = join(srcRoot, 'config/roleClusterNav.config.ts');

/** Strip `//` line comments so stray apostrophes/quotes in prose (e.g. "role's own")
 * don't get mistaken for string literals by the regex-based array parsers below. */
function stripLineComments(src) {
  return src
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

const routesConfigSrc = stripLineComments(readFileSync(routesConfigPath, 'utf8'));
const roleNavConfigSrc = stripLineComments(readFileSync(roleNavConfigPath, 'utf8'));

// Route-registry/mounting plumbing: a reference here proves a route is
// *defined*, not that anything actually links to it. Excluded from the
// "reachability evidence" count.
const STRUCTURAL_FILE_RE =
  /(^|\/)(router\.tsx|routes\.config\.ts|routeMetadata\.ts|consoleRoutePolicy\.config\.ts|inShellRouteAllowlist\.ts|unified-navigation\.config\.ts|roleClusterNav\.config\.ts|[a-zA-Z]+ConsoleRouteTree\.tsx|[a-zA-Z]+ConsoleRoutes\.ts|edRouteAliasRegistry.*|canonicalRouteTree.*)$/;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git') continue;
      walk(full, out);
    } else if (/\.(tsx?|jsx?)$/.test(entry) && !/\.(test|spec)\.[jt]sx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

// ── Stage A: parse CANONICAL_ROUTES (name -> path) ──────────────────────────
function extractBlock(src, startMarker) {
  const start = src.indexOf(startMarker);
  if (start === -1) return null;
  const braceStart = src.indexOf('{', start);
  let depth = 0;
  for (let i = braceStart; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(braceStart + 1, i);
    }
  }
  return null;
}

const canonicalRoutesBlock = extractBlock(routesConfigSrc, 'export const CANONICAL_ROUTES');
const canonicalRoutes = {};
for (const m of canonicalRoutesBlock.matchAll(/(\w+):\s*'([^']+)'/g)) {
  canonicalRoutes[m[1]] = m[2];
}

// ── Stage B: parse named nav-id arrays used by reference (PILOT_VISIBLE etc.) ─
function extractNamedArray(src, name) {
  const re = new RegExp(`export const ${name}\\s*=\\s*Object\\.freeze\\(\\[([\\s\\S]*?)\\]\\)`);
  const m = src.match(re);
  if (!m) return null;
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}
const namedNavIdArrays = {
  CANONICAL_PILOT_VISIBLE_NAV_IDS:
    extractNamedArray(routesConfigSrc, 'CANONICAL_PILOT_VISIBLE_NAV_IDS') || [],
  CANONICAL_PILOT_EXTENSION_NAV_IDS:
    extractNamedArray(routesConfigSrc, 'CANONICAL_PILOT_EXTENSION_NAV_IDS') || [],
};

// ── Stage C: parse CANONICAL_ROUTE_MAP records (id, path, showInNav) ────────
function extractRouteMapRecords(src) {
  const records = [];
  const marker = 'export const CANONICAL_ROUTE_MAP';
  const start = src.indexOf(marker);
  if (start === -1) return records;
  const scanFrom = src.indexOf('[', start);
  const arrClose = src.indexOf('\nexport const CANONICAL_ROUTE_MAP_BY_ID', start);
  const region = src.slice(scanFrom, arrClose === -1 ? undefined : arrClose);

  let i = 0;
  while (true) {
    const callIdx = region.indexOf('route({', i);
    if (callIdx === -1) break;
    const braceStart = region.indexOf('{', callIdx);
    let depth = 0;
    let end = -1;
    for (let j = braceStart; j < region.length; j++) {
      if (region[j] === '{') depth++;
      else if (region[j] === '}') {
        depth--;
        if (depth === 0) {
          end = j;
          break;
        }
      }
    }
    if (end === -1) break;
    const block = region.slice(braceStart, end + 1);
    const idMatch = block.match(/id:\s*'([^']+)'/);
    const pathConstMatch = block.match(/path:\s*CANONICAL_ROUTES\.(\w+)/);
    const pathLiteralMatch = block.match(/path:\s*'([^']+)'/);
    const showInNavMatch = block.match(/showInNav:\s*(true|false)/);
    records.push({
      id: idMatch ? idMatch[1] : null,
      pathConst: pathConstMatch ? pathConstMatch[1] : null,
      path: pathConstMatch
        ? canonicalRoutes[pathConstMatch[1]] || null
        : pathLiteralMatch
          ? pathLiteralMatch[1]
          : null,
      showInNav: showInNavMatch ? showInNavMatch[1] === 'true' : true,
    });
    i = end + 1;
  }
  return records;
}
const routeMapRecords = extractRouteMapRecords(routesConfigSrc);
const routeMapByPathConst = new Map(
  routeMapRecords.filter((r) => r.pathConst).map((r) => [r.pathConst, r]),
);
const routeMapById = new Map(routeMapRecords.filter((r) => r.id).map((r) => [r.id, r]));

// ── Stage D: parse HOSPITAL_ROLE_NAV_IDS (role -> [navIds]) ─────────────────
function extractRoleNavIds(src) {
  const block = extractBlock(src, 'export const HOSPITAL_ROLE_NAV_IDS');
  const roleMap = {};
  const entryRe = /(\w+):\s*(?:Object\.freeze\(\[([\s\S]*?)\]\)|([A-Z][A-Z0-9_]*))\s*,/g;
  for (const m of block.matchAll(entryRe)) {
    const role = m[1];
    if (m[2] !== undefined) {
      roleMap[role] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    } else if (m[3]) {
      roleMap[role] = namedNavIdArrays[m[3]] || [];
    }
  }
  return roleMap;
}
const roleNavIds = extractRoleNavIds(roleNavConfigSrc);

// ── Stage E: reachability evidence — grep every non-structural file for each
//    route's path constant name ─────────────────────────────────────────────
const allFiles = walk(srcRoot);
const structuralFiles = allFiles.filter((f) =>
  STRUCTURAL_FILE_RE.test(relative(repoRoot, f).replace(/\\/g, '/')),
);
const nonStructuralFiles = allFiles.filter((f) => !structuralFiles.includes(f));
const nonStructuralCorpus = nonStructuralFiles.map((f) => readFileSync(f, 'utf8')).join('\n');

// Mounting-evidence corpus: every source file EXCEPT routes.config.ts itself —
// routes.config.ts trivially contains every path's own literal text at its
// declaration site, which would make any check against it self-match 100% of
// the time and prove nothing. router.tsx and the console route trees mount
// several routes with a literal path string instead of the matching
// CANONICAL_ROUTES constant, which would otherwise look identical to a truly
// unmounted route — this corpus is what catches that.
const mountingCorpus = allFiles
  .filter((f) => f !== routesConfigPath)
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');
function pathMountedLiterally(path) {
  // Escape regex special chars FIRST, then substitute ':param' segments with a
  // wildcard — order matters, escaping after substitution would mangle the
  // wildcard's own bracket/plus characters.
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = escaped.replace(/:[A-Za-z0-9_]+/g, ':[A-Za-z0-9_]+');
  const re = new RegExp(pattern);
  return re.test(mountingCorpus);
}

const orphanCandidates = [];
const deadNamedConstants = [];
for (const [name, path] of Object.entries(canonicalRoutes)) {
  const hasRouteMapEntry = routeMapByPathConst.has(name);
  const referencedOutsideStructural =
    nonStructuralCorpus.includes(`CANONICAL_ROUTES.${name}`) ||
    nonStructuralCorpus.includes(`'${path}'`) ||
    nonStructuralCorpus.includes(`"${path}"`);
  if (hasRouteMapEntry || referencedOutsideStructural) continue;

  if (pathMountedLiterally(path)) {
    // The constant itself is unused, but the URL is genuinely mounted (usually
    // via a literal path string elsewhere) — dead export, not an unreachable page.
    deadNamedConstants.push({ name, path });
  } else {
    orphanCandidates.push({ name, path });
  }
}

// ── Stage F: curated-but-hidden nav ids (showInNav:false yet role-curated) ──
const curatedButHidden = new Map();
for (const [role, ids] of Object.entries(roleNavIds)) {
  for (const id of ids) {
    const record = routeMapById.get(id);
    if (record && record.showInNav === false) {
      if (!curatedButHidden.has(id))
        curatedButHidden.set(id, { navId: id, path: record.path, roles: [] });
      curatedButHidden.get(id).roles.push(role);
    }
  }
}

// ── Stage G: dead nav ids (curated by a role, matches no route-map record) ──
const deadNavIds = new Map();
for (const [role, ids] of Object.entries(roleNavIds)) {
  for (const id of ids) {
    if (!routeMapById.has(id)) {
      if (!deadNavIds.has(id)) deadNavIds.set(id, { navId: id, roles: [] });
      deadNavIds.get(id).roles.push(role);
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  note: 'Inventory only — text-level heuristics, not a runtime simulation of Pilot Mode/entitlement/profile-scoped nav filtering. "orphanCandidates" found no evidence of the path anywhere outside routes.config.ts; "deadNamedConstants" found the URL mounted/mentioned elsewhere but not via the named CANONICAL_ROUTES export (may include prose/FAQ mentions, not just real routes/links). Human review required before treating any row as a confirmed defect.',
  totals: {
    canonicalRoutes: Object.keys(canonicalRoutes).length,
    routeMapEntries: routeMapRecords.length,
    routeMapEntriesShowInNavFalse: routeMapRecords.filter((r) => r.showInNav === false).length,
    hospitalRolesCovered: Object.keys(roleNavIds).length,
  },
  orphanCandidates,
  deadNamedConstants,
  curatedButHiddenFromNav: [...curatedButHidden.values()],
  deadNavIdsCuratedByRoles: [...deadNavIds.values()],
};

const outDir = join(repoRoot, 'qa');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'route-nav-full-scan.json');
writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log(
  `Parsed ${report.totals.canonicalRoutes} CANONICAL_ROUTES, ${report.totals.routeMapEntries} CANONICAL_ROUTE_MAP entries (${report.totals.routeMapEntriesShowInNavFalse} with showInNav:false), ${report.totals.hospitalRolesCovered} hospital role nav lists.`,
);
console.log(
  `  ${orphanCandidates.length} orphan candidate route(s) — not mounted anywhere findable AND no reference outside routing plumbing.`,
);
console.log(
  `  ${deadNamedConstants.length} dead named constant(s) — CANONICAL_ROUTES entry unused, but the URL IS mounted elsewhere via a literal path string.`,
);
console.log(
  `  ${curatedButHidden.size} nav id(s) curated by a role but excluded via showInNav:false.`,
);
console.log(
  `  ${deadNavIds.size} nav id(s) curated by a role but matching no route-map record at all.`,
);
console.log(`Report written to ${relative(repoRoot, outPath)}`);
if (orphanCandidates.length) {
  console.log('\nOrphan candidates (genuinely unreachable — highest priority for review):');
  for (const row of orphanCandidates) console.log(`  ${row.name} :: ${row.path}`);
}
if (deadNamedConstants.length) {
  console.log(
    '\nDead named constants (URL is mounted, just not via this constant — low priority):',
  );
  for (const row of deadNamedConstants) console.log(`  ${row.name} :: ${row.path}`);
}
if (curatedButHidden.size) {
  console.log('\nCurated but showInNav:false:');
  for (const row of curatedButHidden.values())
    console.log(`  ${row.navId} (${row.path}) — curated by: ${row.roles.join(', ')}`);
}
if (deadNavIds.size) {
  console.log('\nDead nav ids (curated, no matching route-map record):');
  for (const row of deadNavIds.values())
    console.log(`  ${row.navId} — curated by: ${row.roles.join(', ')}`);
}
