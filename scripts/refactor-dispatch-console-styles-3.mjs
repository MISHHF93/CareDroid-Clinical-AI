import fs from 'node:fs';

const file = 'src/pages/emergency/DispatchConsole.tsx';
let s = fs.readFileSync(file, 'utf8');

const reps = [
  [
    'style={{ display: "flex", width: "100%", justifyContent: "flex-start", borderRadius: 6, padding: "6px 10px" }}',
    'className="dc-unit-option"',
  ],
  ['style={{ background: "#10B981" }}', 'className="dc-btn-success"'],
  ['style={{ fontSize: 12, padding: "4px 8px" }}', 'className="dc-select-sm"'],
  [
    'style={{ padding: "4px 10px", background: "#10B981", fontSize: 12 }}',
    'className="dc-btn-primary dc-btn-sm dc-btn-success"',
  ],
  ['style={{ padding: 40, fontSize: 14 }}', 'className="dc-empty-pad"'],
  ['style={{ padding: "10px 14px" }}', 'className="dc-pad-note"'],
];

for (const [a, b] of reps) {
  if (s.includes(a)) {
    s = s.split(a).join(b);
    console.log('ok', a.slice(0, 40));
  } else {
    console.warn('miss', a.slice(0, 40));
  }
}

s = s.replace(
  /style=\{\{\s*padding:\s*'4px 10px',\s*borderRadius:\s*6,\s*background:\s*call\.callPriority === 'Echo' \|\| call\.callPriority === 'Delta' \? MEDICAL_TYPE\.statusCritical : MEDICAL_THEME\.accent[\s\S]*?\}\}/,
  'className={`dc-btn-primary dc-btn-sm ${call.callPriority === "Echo" || call.callPriority === "Delta" ? "dc-btn-primary--critical" : ""}`}',
);

fs.writeFileSync(file, s);
console.log('remaining', (s.match(/style=\{\{/g) || []).length);
