import { readFileSync } from 'fs';
import { join } from 'path';
import { AppController } from './app.controller';
import {
  resolveFrontendDistPath,
  resolveFrontendIndexPath,
  STATIC_ASSET_EXCLUDES,
  STATIC_ASSET_RENDER_PATH,
} from './static-asset-excludes';
import { SWAGGER_DOCS_PATH } from './server-routes';

describe('AppModule rate-limit configuration (2026-08-07)', () => {
  // Regression guard for a real doc/code mismatch found by live-testing the
  // running backend: the comment above ThrottlerModule.forRoot() said "100
  // requests per 15 minutes" while the actual configured window (ttl) was
  // 60000ms (1 minute) -- a 15x discrepancy that had existed since the line
  // was first added (confirmed via git history, not introduced by a later
  // edit). Fixed the comment to match the real, verified-live behavior
  // rather than guessing which value was "intended" and changing the
  // actual security-relevant runtime behavior. This test guards against
  // either the comment or the real ttl/limit silently drifting again
  // without the other being updated to match.

  const source = readFileSync(join(__dirname, 'app.module.ts'), 'utf8');

  it('does not claim a 15-minute rate-limit window anywhere near ThrottlerModule', () => {
    const throttlerBlockStart = source.indexOf('ThrottlerModule.forRoot');
    expect(throttlerBlockStart).toBeGreaterThan(-1);
    const nearbyText = source.slice(Math.max(0, throttlerBlockStart - 400), throttlerBlockStart);
    expect(nearbyText).not.toMatch(/15 minutes/);
  });

  it('the actual configured ttl/limit match what the comment now claims (100 requests per 60s)', () => {
    const throttlerBlock = source.slice(
      source.indexOf('ThrottlerModule.forRoot'),
      source.indexOf('ThrottlerModule.forRoot') + 200,
    );
    expect(throttlerBlock).toMatch(/ttl:\s*60000/);
    expect(throttlerBlock).toMatch(/limit:\s*100/);
  });
});

describe('AppModule static asset routing', () => {
  it('keeps API and operational routes out of the production SPA fallback', () => {
    expect(STATIC_ASSET_EXCLUDES).toEqual(
      expect.arrayContaining(['/api', '/api/(.*)', '/health', '/metrics', '/metrics/(.*)']),
    );
    expect(STATIC_ASSET_RENDER_PATH.test('/dashboard')).toBe(true);
    expect(STATIC_ASSET_RENDER_PATH.test('/tools/calculators')).toBe(true);
    expect(STATIC_ASSET_RENDER_PATH.test('/api/ai/remaining-queries')).toBe(false);
    expect(STATIC_ASSET_RENDER_PATH.test('/health')).toBe(false);
    expect(STATIC_ASSET_RENDER_PATH.test('/metrics')).toBe(false);
    expect(resolveFrontendDistPath(join('repo', 'backend', 'src'))).toBe(join('repo', 'dist'));
    expect(resolveFrontendDistPath(join('repo', 'backend', 'dist', 'backend', 'src'))).toBe(
      join('repo', 'dist'),
    );
    expect(resolveFrontendIndexPath(join('repo', 'backend', 'dist', 'backend', 'src'))).toBe(
      join('repo', 'dist', 'index.html'),
    );
    expect(SWAGGER_DOCS_PATH).toBe('api/docs');
    expect(Object.getOwnPropertyNames(AppController.prototype)).not.toContain('getSpaRoutes');
  });
});
