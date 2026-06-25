import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const path = join(process.cwd(), 'src/styles/theme-tokens.css');
let css = readFileSync(path, 'utf8');

css = css.replace(/html\[data-theme='dark'\][\s\S]*?\n\}\n\n/, '');
css = css.replace(
  /^html \{[\s\S]*?\n\}\n\nhtml\[data-theme='light'\]/m,
  "html,\nhtml[data-theme='light']",
);
css = css.replace(
  /\/\*\*[\s\S]*?CareDroid ships one standard light medical theme\.[\s\S]*?\*\/\n/,
  `/**
 * Semantic palette (--app-*). CareDroid standard medical theme on every layer.
 */
`,
);

writeFileSync(path, css);
console.log('theme-tokens consolidated');