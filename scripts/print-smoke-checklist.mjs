#!/usr/bin/env node
/**
 * Local wiring smoke checklist (manual). Run: npm run smoke
 */
const lines = [
  'CareDroid wiring smoke checklist',
  '================================',
  '',
  '1. Start API and UI',
  '   npm run start:all',
  '   (app http://localhost:5180 — Vite proxies /api to Nest :3340; see vite.config.ts)',
  '',
  '2. Sign in, open Dashboard',
  '   Send a chat message; expect 200 on POST /api/chat/message (Network tab).',
  '',
  '3. Tool recommendations (NLU)',
  '   Type a clinical query; expect 200 on POST /api/chat/intent-classify.',
  '',
  '4. Tool execution',
  '   Open a tool from sidebar (?tool=), run SOFA (Calculators) or Lab Interpreter.',
  '   Expect 200 on POST /api/tools/sofa-calculator/execute or .../lab-interpreter/execute.',
  '',
  '5. Production / split deploy',
  '   Set VITE_API_URL to your API origin if the SPA is not same-origin.',
  '   Ensure Nest CORS allows the SPA origin.',
  '',
  '6. Phone / tablet on your LAN',
  '   npm run dev:lan   (or: vite --port 5180 --host)',
  '   Open http://<your-PC-LAN-IP>:5180 on the device (not localhost).',
  '   Resize desktop browser under 900px width: hamburger menu, stacked dashboard tool panel.',
  '',
];

console.log(lines.join('\n'));
