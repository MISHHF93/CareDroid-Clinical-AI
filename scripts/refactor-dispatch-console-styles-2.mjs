import fs from 'node:fs';

const file = 'src/pages/emergency/DispatchConsole.tsx';
let src = fs.readFileSync(file, 'utf8');

src = src.replace(/style=\{inputStyle\}/g, 'className="dc-field-input"');
src = src.replace(/style=\{labelStyle\}/g, 'className="dc-field-label"');

// Remove leftover style object definitions if any
src = src.replace(
  /\n\s*const inputStyle: React\.CSSProperties = \{[\s\S]*?\};\n\s*const labelStyle: React\.CSSProperties = \{[\s\S]*?\};\n/g,
  '\n',
);

const pairs = [
  [
    /style=\{\{\s*padding:\s*'8px 12px',\s*borderRadius:\s*8,\s*background:\s*isPriorityCritical\s*\?\s*'rgba\(239,68,68,0\.08\)'\s*:\s*'rgba\(245,158,11,0\.08\)'[\s\S]*?\}\}/g,
    'className={isPriorityCritical ? "dc-alert-soft" : "dc-success-panel"}',
  ],
  [
    /style=\{\{\s*padding:\s*14,\s*display:\s*'flex',\s*flexDirection:\s*'column',\s*gap:\s*8,?\s*\}\}/g,
    'className="dc-call-card"',
  ],
  [
    /style=\{\{\s*padding:\s*16,\s*display:\s*'flex',\s*flexDirection:\s*'column',\s*gap:\s*10\s*\}\}/g,
    'className="dc-panel u-flex-col-gap-10"',
  ],
  [
    /style=\{\{\s*display:\s*'flex',\s*gap:\s*8,\s*flexWrap:\s*'wrap',\s*marginTop:\s*4\s*\}\}/g,
    'className="dc-row-gap-8-wrap u-mt-4"',
  ],
  [
    /style=\{\{\s*display:\s*'flex',\s*gap:\s*8,\s*marginTop:\s*4\s*\}\}/g,
    'className="u-flex u-gap-8 u-mt-4"',
  ],
  [
    /style=\{\{\s*fontSize:\s*11,\s*color:\s*MEDICAL_THEME\.inkSubtle\s*\}\}/g,
    'className="fj-caption-11"',
  ],
  [
    /style=\{\{\s*fontSize:\s*18\s*\}\}/g,
    'className="fj-critical-banner__icon"',
  ],
  [
    /style=\{\{\s*color:\s*MEDICAL_TYPE\.statusCritical,\s*fontSize:\s*14\s*\}\}/g,
    'className="dc-title-14-critical"',
  ],
  [
    /style=\{\{\s*fontSize:\s*14,\s*fontWeight:\s*700,\s*marginBottom:\s*14\s*\}\}/g,
    'className="dc-title-14 u-mb-16"',
  ],
  [
    /style=\{\{\s*padding:\s*40,\s*textAlign:\s*'center',\s*color:\s*MEDICAL_THEME\.inkSubtle,\s*fontSize:\s*14\s*\}\}/g,
    'className="dc-muted u-ta-center" style={{ padding: 40, fontSize: 14 }}',
  ],
  [
    /style=\{\{\s*padding:\s*'10px 14px',\s*fontSize:\s*12,\s*color:\s*MEDICAL_THEME\.inkSubtle\s*\}\}/g,
    'className="dc-muted-12" style={{ padding: "10px 14px" }}',
  ],
  [
    /style=\{\{\s*padding:\s*'10px 16px',\s*borderRadius:\s*8,\s*background:\s*'#10B981',\s*color:\s*'#fff'[\s\S]*?\}\}/g,
    'className="dc-btn-primary" style={{ background: "#10B981" }}',
  ],
  [
    /style=\{\{\s*padding:\s*'4px 10px',\s*borderRadius:\s*6,\s*background:\s*'#10B981',\s*color:\s*'#fff'[\s\S]*?\}\}/g,
    'className="dc-btn-primary" style={{ padding: "4px 10px", background: "#10B981", fontSize: 12 }}',
  ],
  [
    /style=\{\{\s*padding:\s*'4px 10px',\s*borderRadius:\s*20,\s*border:\s*`1px solid \$\{resources\.includes\(r\) \? MEDICAL_THEME\.accent : MEDICAL_THEME\.border\}`[\s\S]*?\}\}/g,
    'className={`dc-resource-chip ${resources.includes(r) ? "dc-resource-chip--on" : ""}`}',
  ],
  [
    /style=\{\{\s*padding:\s*'4px 10px',\s*borderRadius:\s*20,\s*border:\s*`1px solid \$\{specialtyTeams\.includes\(s\) \? '#8B5CF6' : MEDICAL_THEME\.border\}`[\s\S]*?\}\}/g,
    'className={`dc-resource-chip ${specialtyTeams.includes(s) ? "dc-resource-chip--on" : ""}`}',
  ],
  [
    /style=\{\{\s*display:\s*'block',\s*fontSize:\s*12,\s*fontWeight:\s*700,\s*color:\s*MEDICAL_THEME\.inkSubtle,\s*marginBottom:\s*4\s*\}\}/g,
    'className="dc-field-label"',
  ],
  [
    /style=\{\{\s*fontSize:\s*11,\s*fontWeight:\s*700,\s*color:\s*isOverTarget \? MEDICAL_TYPE\.statusCritical : MEDICAL_THEME\.inkSubtle,?\s*\}\}/g,
    'className={isOverTarget ? "dc-critical-11" : "dc-meta-caps"}',
  ],
  [
    /style=\{\{\s*padding:\s*'2px 6px',\s*borderRadius:\s*4,\s*background:\s*call\.status === s \? MEDICAL_THEME\.accent : 'transparent'[\s\S]*?\}\}/g,
    'className={`dc-chip ${call.status === s ? "dc-resource-chip--on" : ""}`}',
  ],
  [
    /style=\{\{\s*fontSize:\s*12,\s*padding:\s*'4px 8px',\s*borderRadius:\s*6,\s*border:\s*`1px solid \$\{MEDICAL_THEME\.border\}`[\s\S]*?\}\}/g,
    'className="dc-field-input" style={{ fontSize: 12, padding: "4px 8px" }}',
  ],
  [
    /style=\{\{\s*padding:\s*'4px 10px',\s*borderRadius:\s*6,\s*background:\s*call\.callPriority === 'Echo' \|\| call\.callPriority === 'Delta' \? MEDICAL_TYPE\.statusCritical[\s\S]*?\}\}/g,
    'className={`dc-btn-primary ${call.callPriority === "Echo" || call.callPriority === "Delta" ? "dc-btn-primary--critical" : ""}`} style={{ padding: "4px 10px", fontSize: 12 }}',
  ],
  [
    /style=\{\{\s*padding:\s*16,\s*borderRadius:\s*10,\s*border:\s*`2px solid \$\{isCritical \? MEDICAL_TYPE\.statusCritical : MEDICAL_THEME\.border\}`[\s\S]*?\}\}/g,
    'className={`dc-panel ${isCritical ? "dc-call-card--critical" : ""}`}',
  ],
  [
    /style=\{\{\s*display:\s*'flex',\s*alignItems:\s*'center',\s*gap:\s*8,\s*padding:\s*'6px 10px',\s*borderRadius:\s*6,\s*border:\s*`1px solid \$\{selectedUnitId === unit\.id \? MEDICAL_THEME\.accent : MEDICAL_THEME\.border\}`[\s\S]*?\}\}/g,
    'className={`dc-resource-chip ${selectedUnitId === unit.id ? "dc-resource-chip--on" : ""}`} style={{ display: "flex", width: "100%", justifyContent: "flex-start", borderRadius: 6, padding: "6px 10px" }}',
  ],
  [
    /style=\{\{\s*padding:\s*'10px 16px',\s*background:\s*'rgba\(239,68,68,0\.08\)'[\s\S]*?\}\}/g,
    'className="dc-alert-soft"',
  ],
  [
    /style=\{\{\s*padding:\s*20\s*\}\}/g,
    'className="u-pad-16"',
  ],
];

let hits = 0;
for (const [re, to] of pairs) {
  const before = src;
  src = src.replace(re, to);
  if (src !== before) {
    hits += 1;
    console.log('ok', String(re).slice(0, 50));
  }
}

fs.writeFileSync(file, src);
console.log('remaining style={{', (src.match(/style=\{\{/g) || []).length);
console.log('hits', hits);
