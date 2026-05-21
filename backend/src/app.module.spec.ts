import { join } from 'path';
import { AppController } from './app.controller';
import {
  resolveFrontendDistPath,
  resolveFrontendIndexPath,
  STATIC_ASSET_EXCLUDES,
  STATIC_ASSET_RENDER_PATH,
} from './static-asset-excludes';
import { SWAGGER_DOCS_PATH } from './server-routes';

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
    expect(resolveFrontendDistPath(join('repo', 'backend', 'dist', 'src'))).toBe(
      join('repo', 'dist'),
    );
    expect(resolveFrontendIndexPath(join('repo', 'backend', 'dist', 'src'))).toBe(
      join('repo', 'dist', 'index.html'),
    );
    expect(SWAGGER_DOCS_PATH).toBe('api/docs');
    expect(Object.getOwnPropertyNames(AppController.prototype)).not.toContain('getSpaRoutes');
  });
});
