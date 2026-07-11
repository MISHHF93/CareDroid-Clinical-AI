/**
 * FullJourneyOperatingPage: replace MEDICAL_THEME-heavy style={{}} with CSS classes.
 */
import fs from 'node:fs';

const file = 'src/pages/emergency/FullJourneyOperatingPage.tsx';
let src = fs.readFileSync(file, 'utf8');

if (!src.includes("import './FullJourneyOperatingPage.css'")) {
  src = src.replace(
    "import {\n  buildCommandCenterWorkflowActions,",
    "import './FullJourneyOperatingPage.css';\nimport {\n  buildCommandCenterWorkflowActions,",
  );
}

// Helper components — full replace
const oldStatusChip = `function StatusChip({ label, status }: { label: string; status: string }) {
  const color = STATUS_COLORS[status] ?? MEDICAL_THEME.inkSubtle;
  return (
    <span
      className="emergency-route-action-chip"
      style={{ color, borderColor: color, whiteSpace: 'nowrap' }}
    >
      {label} · {status}
    </span>
  );
}`;

const newStatusChip = `function StatusChip({ label, status }: { label: string; status: string }) {
  return (
    <span
      className="emergency-route-action-chip fj-status-chip"
      data-status={status}
    >
      {label} · {status}
    </span>
  );
}`;

const oldMetricChip = `function MetricChip({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: 10,
        background: MEDICAL_THEME.surfaceCard,
        border: \`1px solid \${warn && Number(value) > 0 ? MEDICAL_TYPE.statusCritical : MEDICAL_THEME.border}\`,
        minWidth: 80,
        flex: '0 0 auto',
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: warn && Number(value) > 0 ? MEDICAL_TYPE.statusCritical : MEDICAL_THEME.ink,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: MEDICAL_THEME.inkSubtle, fontWeight: 600 }}>{label}</div>
    </div>
  );
}`;

const newMetricChip = `function MetricChip({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  const warnOn = Boolean(warn && Number(value) > 0);
  return (
    <div className={\`fj-metric-chip\${warnOn ? ' fj-metric-chip--warn' : ''}\`}>
      <div className="fj-metric-chip__value">{value}</div>
      <div className="fj-metric-chip__label">{label}</div>
    </div>
  );
}`;

const oldToneDot = `function ActionToneDot({ tone }: { tone: OperationalWorkflowAction['tone'] }) {
  const color =
    tone === 'critical'
      ? MEDICAL_TYPE.statusCritical
      : tone === 'warning'
        ? '#F59E0B'
        : tone === 'success'
          ? '#10B981'
          : MEDICAL_THEME.accent;

  return (
    <span
      className={\`emergency-command-action__tone emergency-command-action__tone--\${tone}\`}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}`;

const newToneDot = `function ActionToneDot({ tone }: { tone: OperationalWorkflowAction['tone'] }) {
  return (
    <span
      className={\`emergency-command-action__tone emergency-command-action__tone--\${tone}\`}
      aria-hidden="true"
    />
  );
}`;

function mustReplace(label, oldStr, newStr) {
  if (!src.includes(oldStr)) {
    console.warn('SKIP missing block:', label);
    return;
  }
  src = src.replace(oldStr, newStr);
  console.log('OK', label);
}

mustReplace('StatusChip', oldStatusChip, newStatusChip);
mustReplace('MetricChip', oldMetricChip, newMetricChip);
mustReplace('ActionToneDot', oldToneDot, newToneDot);

// Common style object replacements (order: longer first)
const pairs = [
  [
    `style={{
                    color: trace.threeMinuteBreachOccurred ? MEDICAL_TYPE.statusCritical : MEDICAL_THEME.inkSubtle,
                    flexShrink: 0,
                  }}`,
    `className={\`emergency-route-queue-row__oldest \${trace.threeMinuteBreachOccurred ? 'fj-text-critical-flex' : 'fj-text-subtle-flex'}\`}`,
  ],
  [
    `style={{ fontSize: 12, marginTop: 2 }}`,
    `className="fj-caption"`,
  ],
  [
    `style={{ fontSize: 12, color: MEDICAL_THEME.inkSubtle, marginTop: 2 }}`,
    `className="fj-caption-12-mt"`,
  ],
  [
    `style={{ fontSize: 11, color: MEDICAL_THEME.inkSubtle, marginTop: 2 }}`,
    `className="fj-caption-11-mt"`,
  ],
  [
    `style={{ fontSize: 11, color: MEDICAL_THEME.inkSubtle }}`,
    `className="fj-caption-11"`,
  ],
  [
    `style={{ fontSize: 13, color: MEDICAL_THEME.inkSubtle, marginTop: 10 }}`,
    `className="fj-caption-13-mt"`,
  ],
  [
    `style={{ fontSize: 12, color: MEDICAL_THEME.inkSubtle }}`,
    `className="fj-caption"`,
  ],
  [
    `style={{ display: 'block', fontSize: 11, fontWeight: 700, color: MEDICAL_THEME.inkSubtle, marginBottom: 3 }}`,
    `className="fj-label-block"`,
  ],
  [
    `style={{ fontSize: 11, fontWeight: 700, color: MEDICAL_THEME.inkSubtle, marginBottom: 4 }}`,
    `className="fj-label-mb4"`,
  ],
  [
    `style={{ fontSize: 12, color: '#10B981', fontWeight: 700 }}`,
    `className="fj-text-ok-12"`,
  ],
  [
    `style={{ fontSize: 12, color: '#10B981', marginTop: 2 }}`,
    `className="fj-text-ok-12-mt"`,
  ],
  [
    `style={{ color: MEDICAL_TYPE.statusCritical, fontSize: 13 }}`,
    `className="fj-text-critical-13"`,
  ],
  [
    `style={{ fontSize: 11, fontWeight: 800, color: MEDICAL_TYPE.statusCritical }}`,
    `className="fj-text-critical-11"`,
  ],
  [
    `style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}`,
    `className="fj-stack-col-10"`,
  ],
  [
    `style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}`,
    `className="fj-stack-col-10-mt"`,
  ],
  [
    `style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}`,
    `className="fj-row-between"`,
  ],
  [
    `style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}`,
    `className="fj-row-wrap-8-mt"`,
  ],
  [
    `style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}`,
    `className="fj-row-wrap-6-mt"`,
  ],
  [
    `style={{ marginTop: 6 }}`,
    `className="fj-mt-6"`,
  ],
  [
    `style={{ flexShrink: 0 }}`,
    `className="fj-flex-shrink-0"`,
  ],
  [
    `style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginTop: 12,
        }}`,
    `className="fj-stack-col-10"`,
  ],
];

// multi-line style blocks with MEDICAL_THEME
const multiLinePatterns = [
  // generic: style={{ fontSize: 12, color: MEDICAL_THEME.inkSubtle, marginTop: 2 }} already above
];

let n = 0;
for (const [from, to] of pairs) {
  if (src.includes(from)) {
    const before = src.split(from).length - 1;
    src = src.split(from).join(to);
    n += before;
    console.log('replaced', before, 'x', from.slice(0, 60).replace(/\n/g, ' '));
  }
}

// Regex-based for remaining MEDICAL_THEME color-only and common combos
const regexPairs = [
  [
    /style=\{\{\s*fontSize:\s*12,\s*color:\s*MEDICAL_THEME\.inkSubtle,\s*marginTop:\s*2\s*\}\}/g,
    'className="fj-caption-12-mt"',
  ],
  [
    /style=\{\{\s*fontSize:\s*11,\s*color:\s*MEDICAL_THEME\.inkSubtle,\s*marginTop:\s*2\s*\}\}/g,
    'className="fj-caption-11-mt"',
  ],
  [
    /style=\{\{\s*fontSize:\s*11,\s*color:\s*MEDICAL_THEME\.inkSubtle\s*\}\}/g,
    'className="fj-caption-11"',
  ],
  [
    /style=\{\{\s*fontSize:\s*12,\s*color:\s*MEDICAL_THEME\.inkSubtle\s*\}\}/g,
    'className="fj-caption"',
  ],
  [
    /style=\{\{\s*fontSize:\s*13,\s*color:\s*MEDICAL_THEME\.inkSubtle,\s*marginTop:\s*10\s*\}\}/g,
    'className="fj-caption-13-mt"',
  ],
  [
    /style=\{\{\s*fontSize:\s*12,\s*marginTop:\s*2\s*\}\}/g,
    'className="fj-caption"',
  ],
  [
    /style=\{\{\s*color:\s*MEDICAL_THEME\.inkSubtle\s*\}\}/g,
    'className="fj-text-subtle"',
  ],
  [
    /style=\{\{\s*color:\s*STATUS_COLORS\.active\s*\}\}/g,
    'className="fj-text-ok"',
  ],
  [
    /style=\{\{\s*color:\s*MEDICAL_TYPE\.statusCritical\s*\}\}/g,
    'className="fj-text-critical"',
  ],
  [
    /style=\{\{\s*color:\s*STATUS_COLORS\[stage\.status\]\s*\?\?\s*MEDICAL_THEME\.inkSubtle,\s*flexShrink:\s*0\s*\}\}/g,
    'className="fj-text-subtle-flex" data-status={stage.status}',
  ],
  [
    /style=\{\{\s*color:\s*flags\.length\s*>\s*0\s*\?\s*MEDICAL_TYPE\.statusCritical\s*:\s*MEDICAL_THEME\.inkSubtle\s*\}\}/g,
    `className={flags.length > 0 ? 'fj-text-critical' : 'fj-text-subtle'}`,
  ],
  [
    /style=\{\{\s*color:\s*row\.status\s*===\s*'resulted'\s*\?\s*'#10B981'\s*:\s*row\.status\s*===\s*'in_progress'\s*\?\s*'#F59E0B'\s*:\s*MEDICAL_THEME\.inkSubtle\s*\}\}/g,
    `className="fj-dx-status" data-status={row.status}`,
  ],
  [
    /style=\{\{\s*color:\s*arrival\.status\s*===\s*'Handoff'\s*\?\s*'#F59E0B'\s*:\s*STATUS_COLORS\.active\s*\}\}/g,
    `className="fj-arrival-status" data-status={arrival.status}`,
  ],
  [
    /style=\{\{\s*fontSize:\s*11,\s*fontWeight:\s*800,\s*color:\s*priorityColor\(row\.priority\)\s*\}\}/g,
    `className="fj-priority-badge" data-priority={row.priority}`,
  ],
  [
    /style=\{\{\s*accentColor:\s*'#10B981'\s*\}\}/g,
    'className="fj-check-row"',
  ],
  [
    /style=\{\{\s*padding:\s*'10px 14px',\s*borderRadius:\s*8,\s*background:\s*'rgba\(239,68,68,0\.07\)',\s*border:\s*'1px solid rgba\(239,68,68,0\.2\)',\s*fontSize:\s*12,\s*[^}]*\}\}/g,
    'className="fj-alert-box"',
  ],
];

for (const [re, rep] of regexPairs) {
  const before = src;
  src = src.replace(re, rep);
  if (src !== before) {
    const c = (before.match(re) || []).length;
    n += c || 1;
    console.log('regex ok', String(re).slice(0, 50));
  }
}

// Checkbox row pattern — multiline
src = src.replace(
  /style=\{\{\s*display:\s*'flex',\s*alignItems:\s*'center',\s*gap:\s*8,\s*fontSize:\s*12,\s*cursor:\s*item\.ready\s*\?\s*'default'\s*:\s*'pointer',\s*color:\s*item\.ready\s*\?\s*'#10B981'\s*:\s*[^}]+\}\}/g,
  `className={\`fj-check-row \${item.ready ? 'fj-check-row--ready' : 'fj-check-row--todo'}\`}`,
);

// Primary button pattern
src = src.replace(
  /style=\{\{\s*padding:\s*'8px 14px',\s*borderRadius:\s*8,\s*background:\s*MEDICAL_THEME\.accent,\s*color:\s*MEDICAL_THEME\.onAccent,\s*fontWeight:\s*700,\s*fontSize:\s*[^}]+\}\}/g,
  'className="fj-btn-primary"',
);

// Critical small button
src = src.replace(
  /style=\{\{\s*padding:\s*'4px 10px',\s*borderRadius:\s*6,\s*background:\s*MEDICAL_TYPE\.statusCritical,\s*color:\s*'#fff',\s*border:\s*'none',\s*fontSize:\s*11,\s*fontWe[^}]+\}\}/g,
  'className="fj-btn-critical"',
);

// Toggle create form button
src = src.replace(
  /style=\{\{\s*padding:\s*'6px 12px',\s*borderRadius:\s*7,\s*background:\s*showCreateForm\s*\?\s*MEDICAL_THEME\.border\s*:\s*MEDICAL_THEME\.accent,\s*color:\s*showCreateF[^}]+\}\}/g,
  `className={\`fj-btn-toggle \${showCreateForm ? 'fj-btn-toggle--on' : 'fj-btn-toggle--off'}\`}`,
);

// Plan status badge
src = src.replace(
  /style=\{\{\s*fontSize:\s*11,\s*fontWeight:\s*700,\s*padding:\s*'2px 8px',\s*borderRadius:\s*4,\s*background:\s*overdue\s*\?\s*'rgba\(239,68,68,0\.12\)'\s*:\s*plan\.status\s*===[\s\S]*?\}\}/g,
  `className={\`fj-plan-status \${overdue ? 'fj-plan-status--overdue' : plan.status === 'ready' ? 'fj-plan-status--ready' : 'fj-plan-status--active'}\`}`,
);

// Actions row with conditional margin
src = src.replace(
  /style=\{\{\s*display:\s*'flex',\s*gap:\s*8,\s*marginTop:\s*10,\s*marginBottom:\s*plans\.length\s*>\s*0\s*\?\s*12\s*:\s*0\s*\}\}/g,
  `className="fj-actions-row" style={plans.length > 0 ? { marginBottom: 12 } : undefined}`,
);

// Remaining alert boxes looser
src = src.replace(
  /style=\{\{\s*padding:\s*'10px 14px',\s*borderRadius:\s*8,\s*background:\s*'rgba\(239,\s*68,\s*68,\s*0\.07\)'[^}]*\}\}/g,
  'className="fj-alert-box"',
);

// Remove unused STATUS_COLORS if no longer referenced
// Keep if still used

const remaining = (src.match(/style=\{\{/g) || []).length;
fs.writeFileSync(file, src);
console.log(JSON.stringify({ remainingStyleDoubleBrace: remaining, approxReplacements: n }, null, 2));
