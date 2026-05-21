import { join } from 'path';

export const STATIC_ASSET_EXCLUDES = ['/api', '/api/(.*)', '/health', '/metrics', '/metrics/(.*)'];

export const STATIC_ASSET_RENDER_PATH = /^\/(?!api(?:\/|$)|health$|metrics(?:\/|$)).*/;

export const resolveFrontendDistPath = (compiledSrcDir = __dirname) =>
  join(compiledSrcDir, '..', '..', '..', 'dist');

export const resolveFrontendIndexPath = (compiledSrcDir = __dirname) =>
  join(resolveFrontendDistPath(compiledSrcDir), 'index.html');
