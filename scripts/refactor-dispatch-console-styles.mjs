/**
 * Replace DispatchConsole MEDICAL_THEME inline styles with CSS classes.
 */
import fs from 'node:fs';

const file = 'src/pages/emergency/DispatchConsole.tsx';
let src = fs.readFileSync(file, 'utf8');
let n = 0;

function rep(from, to, label) {
  if (!src.includes(from)) {
    console.warn('miss', label);
    return;
  }
  const c = src.split(from).length - 1;
  src = src.split(from).join(to);
  n += c;
  console.log('ok', c, label);
}

// Helpers
rep(
  `function PriorityBadge({ priority }: { priority: CallPriority }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.06em',
        color: '#fff',
        background: CALL_PRIORITY_COLORS[priority],
      }}
    >
      {priority}
    </span>
  );
}`,
  `function PriorityBadge({ priority }: { priority: CallPriority }) {
  return (
    <span className="dc-priority-badge" data-priority={priority}>
      {priority}
    </span>
  );
}`,
  'PriorityBadge',
);

rep(
  `function SummaryCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={\`dispatch-console__summary-card\${highlight && value > 0 ? ' dispatch-console__summary-card--highlight' : ''}\`}
      style={{
        padding: '12px 16px',
        minWidth: 90,
        border: highlight && value > 0 ? \`1px solid \${MEDICAL_TYPE.statusCritical}\` : undefined,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, color: highlight && value > 0 ? MEDICAL_TYPE.statusCritical : MEDICAL_THEME.ink }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: MEDICAL_THEME.inkSubtle, fontWeight: 600 }}>{label}</div>
    </div>
  );
}`,
  `function SummaryCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={\`dispatch-console__summary-card\${highlight && value > 0 ? ' dispatch-console__summary-card--highlight' : ''}\`}
    >
      <div className="dispatch-console__summary-card__value">{value}</div>
      <div className="dispatch-console__summary-card__label">{label}</div>
    </div>
  );
}`,
  'SummaryCard',
);

// Remove inputStyle / labelStyle objects and usages
rep(
  `  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: \`1px solid \${MEDICAL_THEME.border}\`,
    background: MEDICAL_THEME.surfacePage,
    color: MEDICAL_THEME.ink,
    fontSize: 14,
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: MEDICAL_THEME.inkSubtle,
    marginBottom: 4,
  };

`,
  '',
  'style objects',
);

src = src.replace(/style=\{labelStyle\}/g, 'className="dc-field-label"');
src = src.replace(/style=\{inputStyle\}/g, 'className="dc-field-input"');

// Generic regex replacements
const regs = [
  [
    /style=\{\{\s*fontSize:\s*12,\s*fontWeight:\s*700,\s*color:\s*MEDICAL_THEME\.inkSubtle,\s*marginBottom:\s*6\s*\}\}/g,
    'className="dc-field-label-mb6"',
  ],
  [
    /style=\{\{\s*fontSize:\s*13,\s*color:\s*MEDICAL_THEME\.accent,\s*textDecoration:\s*'none',\s*fontWeight:\s*600\s*\}\}/g,
    'className="dc-link-accent"',
  ],
  [/style=\{\{\s*color:\s*MEDICAL_THEME\.inkSubtle\s*\}\}/g, 'className="dc-muted"'],
  [/style=\{\{\s*textDecoration:\s*'none',\s*fontSize:\s*13\s*\}\}/g, 'className="dc-link-plain"'],
  [
    /style=\{\{\s*fontSize:\s*12,\s*color:\s*MEDICAL_THEME\.inkSubtle\s*\}\}/g,
    'className="dc-muted-12"',
  ],
  [
    /style=\{\{\s*fontSize:\s*12,\s*color:\s*MEDICAL_THEME\.inkSubtle,\s*marginTop:\s*4\s*\}\}/g,
    'className="dc-muted-12-mt4"',
  ],
  [
    /style=\{\{\s*fontSize:\s*12,\s*color:\s*MEDICAL_THEME\.inkSubtle,\s*marginTop:\s*2\s*\}\}/g,
    'className="dc-muted-12-mt"',
  ],
  [
    /style=\{\{\s*fontSize:\s*12,\s*color:\s*MEDICAL_TYPE\.statusCritical,\s*fontWeight:\s*700\s*\}\}/g,
    'className="dc-critical-12"',
  ],
  [
    /style=\{\{\s*fontSize:\s*11,\s*color:\s*MEDICAL_TYPE\.statusCritical,\s*fontWeight:\s*700\s*\}\}/g,
    'className="dc-critical-11"',
  ],
  [
    /style=\{\{\s*fontSize:\s*12,\s*fontWeight:\s*800,\s*color:\s*MEDICAL_TYPE\.statusCritical\s*\}\}/g,
    'className="dc-critical-12-badge"',
  ],
  [/style=\{\{\s*display:\s*'flex',\s*gap:\s*16\s*\}\}/g, 'className="dc-row-gap-16"'],
  [
    /style=\{\{\s*display:\s*'flex',\s*gap:\s*12,\s*flexWrap:\s*'wrap'\s*\}\}/g,
    'className="dc-row-gap-12-wrap"',
  ],
  [
    /style=\{\{\s*display:\s*'flex',\s*gap:\s*8,\s*flexWrap:\s*'wrap'\s*\}\}/g,
    'className="dc-row-gap-8-wrap"',
  ],
  [
    /style=\{\{\s*display:\s*'flex',\s*gap:\s*8,\s*marginTop:\s*10,\s*flexWrap:\s*'wrap'\s*\}\}/g,
    'className="dc-row-gap-8-wrap-mt"',
  ],
  [
    /style=\{\{\s*display:\s*'flex',\s*gap:\s*4,\s*fontSize:\s*11,\s*flexWrap:\s*'wrap',\s*marginTop:\s*2\s*\}\}/g,
    'className="dc-row-gap-4-wrap"',
  ],
  [
    /style=\{\{\s*display:\s*'flex',\s*justifyContent:\s*'space-between',\s*alignItems:\s*'flex-start'\s*\}\}/g,
    'className="dc-row-between"',
  ],
  [
    /style=\{\{\s*padding:\s*'8px 12px',\s*borderRadius:\s*8,\s*background:\s*'rgba\(239,68,68,0\.08\)',\s*border:\s*'1px solid rgba\(239,68,68,0\.[^']+\)'[^}]*\}\}/g,
    'className="dc-alert-soft"',
  ],
  [
    /style=\{\{\s*padding:\s*'12px 16px',\s*borderRadius:\s*10,\s*background:\s*'rgba\(16,185,129,0\.08\)',\s*border:\s*'1px solid rgba\(16,185,129,0\.[^']+\)'[^}]*\}\}/g,
    'className="dc-success-panel"',
  ],
  [
    /style=\{\{\s*fontWeight:\s*700,\s*color:\s*'#10B981',\s*fontSize:\s*14\s*\}\}/g,
    'className="dc-success-title"',
  ],
  [
    /style=\{\{\s*fontWeight:\s*700,\s*color:\s*MEDICAL_THEME\.inkSubtle\s*\}\}/g,
    'className="dc-muted-strong"',
  ],
  [
    /style=\{\{\s*fontSize:\s*14,\s*color:\s*isCritical\s*\?\s*MEDICAL_TYPE\.statusCritical\s*:\s*MEDICAL_THEME\.ink\s*\}\}/g,
    `className={isCritical ? 'dc-title-14-critical' : 'dc-title-14'}`,
  ],
  [
    /style=\{\{\s*fontSize:\s*15,\s*fontWeight:\s*700,\s*color:\s*MEDICAL_THEME\.ink,\s*marginTop:\s*2\s*\}\}/g,
    'className="dc-title-15"',
  ],
  [
    /style=\{\{\s*fontSize:\s*11,\s*fontWeight:\s*700,\s*color:\s*MEDICAL_THEME\.inkSubtle,\s*letterSpacing:\s*'0\.06em'\s*\}\}/g,
    'className="dc-meta-caps"',
  ],
  [
    /style=\{\{\s*display:\s*'flex',\s*flexDirection:\s*'column',\s*alignItems:\s*'flex-end',\s*gap:\s*4\s*\}\}/g,
    'className="dc-col-end"',
  ],
  [
    /style=\{\{\s*display:\s*'block',\s*fontSize:\s*12,\s*fontWeight:\s*700,\s*color:\s*MEDICAL_THEME\.inkSubtle,\s*marginBottom:\s*6\s*\}\}/g,
    'className="dc-field-label-mb6"',
  ],
  [
    /style=\{\{\s*width:\s*'100%',\s*padding:\s*'8px 10px',\s*borderRadius:\s*8,\s*border:\s*`1px solid \$\{MEDICAL_THEME\.border\}`[^}]*\}\}/g,
    'className="dc-field-input"',
  ],
  [
    /style=\{\{\s*padding:\s*16,\s*borderRadius:\s*10,\s*border:\s*`1px solid \$\{MEDICAL_THEME\.border\}`[^}]*\}\}/g,
    'className="dc-panel"',
  ],
  [/style=\{\{\s*fontSize:\s*14\s*\}\}/g, 'className="dc-title-14"'],
];

for (const [re, to] of regs) {
  const before = src;
  src = src.replace(re, to);
  if (src !== before) {
    console.log('regex', String(re).slice(0, 40));
    n += 1;
  }
}

// Priority-sensitive submit buttons — class variants
src = src.replace(
  /style=\{\{\s*padding:\s*'10px 16px',\s*borderRadius:\s*8,\s*background:\s*isPriorityCritical\s*&&\s*complaint\.trim\(\)\s*\?\s*MEDICAL_TYPE\.statusCritical\s*:\s*MEDICAL_THEME\.accent[^}]*\}\}/g,
  `className={\`dc-btn-primary\${isPriorityCritical && complaint.trim() ? ' dc-btn-primary--critical' : ''}\${submitting ? ' dc-btn-primary--disabled' : ''}\`}`,
);

src = src.replace(
  /style=\{\{\s*padding:\s*'10px 16px',\s*borderRadius:\s*8,\s*background:\s*isCritical\s*\?\s*MEDICAL_TYPE\.statusCritical\s*:\s*MEDICAL_THEME\.accent[^}]*\}\}/g,
  `className={\`dc-btn-primary\${isCritical ? ' dc-btn-primary--critical' : ''}\`}`,
);

// Resource/specialty toggle chips
src = src.replace(
  /style=\{\{\s*padding:\s*'4px 10px',\s*borderRadius:\s*999,\s*border:\s*`1px solid \$\{[^}]+\?[^:]+:\s*MEDICAL_THEME\.border\}`[^}]*\}\}/g,
  (match) => {
    // detect variable - resources.includes or specialty
    if (match.includes('resources.includes') || match.includes('activatedResources')) {
      return `className={\`dc-resource-chip \${resources.includes(r) ? 'dc-resource-chip--on' : ''}\`}`;
    }
    if (match.includes('specialties.includes') || match.includes('specialty')) {
      return `className={\`dc-resource-chip \${specialties.includes(s) ? 'dc-resource-chip--on' : ''}\`}`;
    }
    return match;
  },
);

const remaining = (src.match(/style=\{\{/g) || []).length;
const styleProp = (src.match(/style=\{/g) || []).length;
fs.writeFileSync(file, src);
console.log(
  JSON.stringify(
    { replacements: n, remainingDoubleBrace: remaining, styleEquals: styleProp },
    null,
    2,
  ),
);
