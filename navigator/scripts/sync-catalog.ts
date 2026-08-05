import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const sourceArg = process.argv.find((argument) => argument.startsWith('--source='));
// navigator/ is a top-level sibling of src/ within the CareDroid-Clinical-AI
// repo itself (not a separate checkout) -- '..' from here is the repo root.
const sourceRoot = resolve(sourceArg?.slice('--source='.length) || '..');
const routeFile = join(sourceRoot, 'src', 'config', 'routes.config.ts');
const module = await import(pathToFileURL(routeFile).href);
const routes = module.CANONICAL_ROUTE_MAP as Array<Record<string, unknown>>;

const records = routes.map((route) => ({
  id: route.id,
  label: route.label,
  description: route.description,
  path: route.path,
  component: route.pageComponent || route.componentKey,
  navigationGroup: route.navigationGroup,
  breadcrumbs: route.breadcrumbs || [],
  aliases: route.aliases || [],
  workflowOwner: route.workflowOwner,
  requiredPermissions: route.requiredPermissions || [],
}));

let sourceCommit = 'unknown';
try {
  sourceCommit = execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
} catch {
  // A source archive without .git can still produce a valid catalog.
}

const output = resolve('data/catalog.json');
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify({
  schemaVersion: 1,
  source: 'CareDroid CANONICAL_ROUTE_MAP',
  sourceCommit,
  generatedAt: new Date().toISOString(),
  records,
}, null, 2)}\n`, 'utf8');
console.log(`Wrote ${records.length} verified routes to ${output}`);
