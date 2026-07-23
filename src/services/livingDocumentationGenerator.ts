import type {
  LivingDocumentationEntry,
  LivingDocumentationSection,
  LivingDocumentationSnapshot,
} from '../config/livingDocumentationModel';
import { LIVING_CONTEXTUAL_HELP_ENTRIES } from '../config/livingDocumentationContextualHelp';
import { buildLivingDocumentationSnapshot } from './livingDocumentationService';

function sectionTitle(section: LivingDocumentationSection): string {
  const titles: Record<LivingDocumentationSection, string> = {
    routes: 'Routes & pages (curated ED journey stages)',
    apis: 'APIs & page bindings',
    roles: 'User roles',
    workflows: 'Workflows & automation',
    services: 'Platform services',
    ai: 'AI capabilities',
    permissions: 'Permissions',
    components: 'Reusable components',
    configuration: 'Configuration sources',
  };
  return titles[section];
}

/** Extra scope-clarifying line shown only for sections whose entry count could
 * otherwise be mistaken for the app's full surface (see Cycle 153 audit — this
 * doc's old "Routes & pages" title with 16 entries misled readers into
 * thinking it was the full route inventory, when CANONICAL_ROUTES has ~190+). */
function sectionScopeNote(section: LivingDocumentationSection): string | null {
  if (section === 'routes') {
    return '> This is the curated 911→outcome ED journey-stage subset (`caredroidPageArchitecture.config.ts`), not the full route surface. For the complete route inventory and a wiring/reachability scan, see `CANONICAL_ROUTES` in `src/config/routes.config.ts` or run `node scripts/audit-routes-nav-full-scan.mjs`.';
  }
  return null;
}

function formatEntryMarkdown(entry: LivingDocumentationEntry): string {
  const lines = [`### ${entry.label}`, '', entry.summary, '', `- **Source:** \`${entry.sourceModule}\``];
  if (entry.route) lines.push(`- **Route:** \`${entry.route}\``);
  if (entry.helpTopicId) lines.push(`- **Help topic:** \`${entry.helpTopicId}\``);
  if (entry.status) lines.push(`- **Status:** ${entry.status}`);
  if (entry.endpoints?.length) {
    lines.push(`- **Endpoints:** ${entry.endpoints.map((endpoint) => `\`${endpoint}\``).join(', ')}`);
  }
  if (entry.permissions?.length) {
    lines.push(`- **Permissions:** ${entry.permissions.map((permission) => `\`${permission}\``).join(', ')}`);
  }
  if (entry.roles?.length) {
    lines.push(`- **Roles:** ${entry.roles.map((role) => `\`${role}\``).join(', ')}`);
  }
  if (entry.workflows?.length) {
    lines.push(`- **Workflows:** ${entry.workflows.map((workflow) => `\`${workflow}\``).join(', ')}`);
  }
  if (entry.components?.length) {
    lines.push(`- **Components:** ${entry.components.map((component) => `\`${component}\``).join(', ')}`);
  }
  lines.push('');
  return lines.join('\n');
}

function formatSectionMarkdown(
  section: LivingDocumentationSection,
  entries: readonly LivingDocumentationEntry[],
): string {
  const scopeNote = sectionScopeNote(section);
  return [
    `# ${sectionTitle(section)}`,
    '',
    `> Auto-generated from implementation. Do not edit manually.`,
    `> Regenerate: \`npm run docs:generate\``,
    ...(scopeNote ? [scopeNote] : []),
    '',
    `**Entries:** ${entries.length}`,
    '',
    ...entries.map(formatEntryMarkdown),
  ].join('\n');
}

export function formatContextualHelpMarkdown(): string {
  return [
    '# Contextual help entries',
    '',
    '> Auto-generated from `livingDocumentationContextualHelp.ts`.',
    `> Regenerate: \`npm run docs:generate\``,
    '',
    `**Entries:** ${LIVING_CONTEXTUAL_HELP_ENTRIES.length}`,
    '',
    ...LIVING_CONTEXTUAL_HELP_ENTRIES.map((entry) =>
      [
        `### ${entry.title}`,
        '',
        entry.detail,
        '',
        `- **Path prefix:** \`${entry.pathPrefix}\``,
        `- **Guidance id:** \`${entry.guidanceId}\``,
        `- **Help topic:** \`${entry.helpTopicId}\``,
        entry.workflowStepId ? `- **Workflow step:** \`${entry.workflowStepId}\`` : '',
        entry.tone ? `- **Tone:** ${entry.tone}` : '',
        '',
      ]
        .filter(Boolean)
        .join('\n'),
    ),
  ].join('\n');
}

export function formatLivingDocumentationIndex(snapshot: LivingDocumentationSnapshot): string {
  const lines = [
    '# CareDroid living documentation index',
    '',
    `> Generated: **${snapshot.generatedAt}**`,
    `> Engine: \`${snapshot.engineId}\``,
    '',
    '## Metrics',
    '',
    '| Section | Count |',
    '|---------|------:|',
    ...Object.entries(snapshot.metrics).map(([key, value]) => `| ${key} | ${value} |`),
    '',
    '## Generated files',
    '',
    '- [routes.md](./routes.md)',
    '- [apis.md](./apis.md)',
    '- [roles.md](./roles.md)',
    '- [workflows.md](./workflows.md)',
    '- [services.md](./services.md)',
    '- [ai-capabilities.md](./ai-capabilities.md)',
    '- [permissions.md](./permissions.md)',
    '- [components.md](./components.md)',
    '- [configuration.md](./configuration.md)',
    '- [contextual-help.md](./contextual-help.md)',
    '- [superseded-manifest.json](./superseded-manifest.json)',
    '',
    '## Superseded static documentation',
    '',
    'The following manual docs are replaced by this generated set:',
    '',
    ...snapshot.supersededDocs.map(
      (record) => `- \`${record.path}\` → \`${record.replacedBy}\` — ${record.reason}`,
    ),
    '',
    '## In-app help',
    '',
    '- Press `?` to open HelpHub with contextual procedures.',
    '- `ContextualGuidance` banners link to HelpHub topics on key workflow surfaces.',
    '- Source registries: `src/config/livingDocumentationModel.ts`, `src/services/livingDocumentationService.ts`.',
    '',
  ];
  return lines.join('\n');
}

export function generateLivingDocumentationFiles(
  snapshot: LivingDocumentationSnapshot = buildLivingDocumentationSnapshot(),
): Readonly<Record<string, string>> {
  const sectionFileMap: Record<LivingDocumentationSection, string> = {
    routes: 'routes.md',
    apis: 'apis.md',
    roles: 'roles.md',
    workflows: 'workflows.md',
    services: 'services.md',
    ai: 'ai-capabilities.md',
    permissions: 'permissions.md',
    components: 'components.md',
    configuration: 'configuration.md',
  };

  const files: Record<string, string> = {
    'README.md': formatLivingDocumentationIndex(snapshot),
    'contextual-help.md': formatContextualHelpMarkdown(),
    'superseded-manifest.json': `${JSON.stringify(snapshot.supersededDocs, null, 2)}\n`,
  };

  for (const [section, filename] of Object.entries(sectionFileMap)) {
    const entries = snapshot.sections[section as LivingDocumentationSection] || [];
    files[filename] = formatSectionMarkdown(section as LivingDocumentationSection, entries);
  }

  return Object.freeze(files);
}

export default {
  formatLivingDocumentationIndex,
  generateLivingDocumentationFiles,
};