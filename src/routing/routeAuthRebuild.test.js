import { readFileSync } from 'fs';
import { join } from 'path';

const appSource = readFileSync(join(__dirname, '..', 'App.jsx'), 'utf8');

describe('canonical route/auth architecture', () => {
  it('defines canonical auth and alias redirects', () => {
    expect(appSource).toMatch(
      /path:\s*'\/auth'[\s\S]*<AuthShell>[\s\S]*<AuthPage \/>[\s\S]*<\/AuthShell>[\s\S]*publicOnly:\s*true/
    );
    expect(appSource).toContain("pathname: '/auth'");
  });

  it('keeps one canonical tools and calculators route system', () => {
    expect(appSource).toMatch(
      /path:\s*'\/tools'[\s\S]*<AppShellPage>[\s\S]*<ToolsOverview \/>[\s\S]*<\/AppShellPage>[\s\S]*requiresAuth:\s*true/
    );
    expect(appSource).toMatch(
      /path:\s*'\/tools\/calculators'[\s\S]*<AppShellPage>[\s\S]*<Calculators \/>[\s\S]*<\/AppShellPage>[\s\S]*requiresAuth:\s*true/
    );
    expect(appSource).toMatch(
      /path:\s*'\/tools\/calculators\/:slug'[\s\S]*<AppShellPage>[\s\S]*<Calculators \/>[\s\S]*<\/AppShellPage>[\s\S]*requiresAuth:\s*true/
    );
  });

  it('uses redirects for auth aliases and login aliases', () => {
    expect(appSource).toContain('...AUTH_PATH_ALIASES.map((path) => ({');
    expect(appSource).toMatch(
      /path:\s*'\/chat'[\s\S]*element:\s*<LegacyProtectedRouteRedirect to="\/assistant" \/>[\s\S]*requiresAuth:\s*true/
    );
  });

  it('ensures unknown protected routes render not found in app shell', () => {
    expect(appSource).toMatch(
      /path:\s*'\/tools\/\*'[\s\S]*<AppShellPage>[\s\S]*<ToolNotFound \/>[\s\S]*<\/AppShellPage>[\s\S]*requiresAuth:\s*true/
    );
    expect(appSource).toContain('title="Page not found"');
  });
});
