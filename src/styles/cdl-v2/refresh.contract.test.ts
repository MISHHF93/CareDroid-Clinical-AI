import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const refreshCss = readFileSync(join(__dirname, 'refresh.css'), 'utf8');
const mainSource = readFileSync(join(__dirname, '../../main.tsx'), 'utf8');
const authSource = readFileSync(join(__dirname, '../../pages/auth/AuthPage.tsx'), 'utf8');

describe('CDL 2.1 visual authority', () => {
  it('loads after the application graph so shared chrome has deterministic precedence', () => {
    expect(mainSource).toContain("import './styles/cdl-v2/refresh.css'");
    expect(mainSource.indexOf("import App from './app/App'")).toBeLessThan(
      mainSource.indexOf("import './styles/cdl-v2/refresh.css'"),
    );
  });

  it('defines one structural sidebar and one route identity band', () => {
    expect(refreshCss).toContain('--cdl-shell-sidebar-ink');
    expect(refreshCss).toContain('.sidebar-nav-item--active');
    expect(refreshCss).toContain('.app-chrome-context__h1');
    expect(refreshCss).toContain('var(--cdl-route-tab-height)');
  });

  it('uses brand tokens for shared primitives instead of black hover overrides', () => {
    expect(refreshCss).toContain('.btn-primary');
    expect(refreshCss).toContain('var(--cdl-brand-600');
    expect(refreshCss).not.toMatch(/\.btn-primary:hover\s*\{[^}]*#111827/s);
  });

  it('gives authentication a product story and secure access surface', () => {
    expect(authSource).toContain('auth-page__story');
    expect(authSource).toContain('auth-page__workspace-preview');
    expect(authSource).toContain('auth-page__access');
    expect(authSource).toContain('Human-reviewed decisions');
  });
});
