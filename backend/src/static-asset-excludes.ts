import { join, normalize, sep } from 'path';

export const STATIC_ASSET_EXCLUDES = ['/api', '/api/(.*)', '/health', '/metrics', '/metrics/(.*)'];

export const STATIC_ASSET_RENDER_PATH = /^\/(?!api(?:\/|$)|health$|metrics(?:\/|$)).*/;

export const resolveFrontendDistPath = (compiledSrcDir = __dirname) => {
  const normalizedCompiledSrcDir = normalize(compiledSrcDir);
  const backendSegment = `${sep}backend${sep}`;
  const backendSegmentIndex = normalizedCompiledSrcDir.indexOf(backendSegment);

  if (backendSegmentIndex >= 0) {
    return join(normalizedCompiledSrcDir.slice(0, backendSegmentIndex), 'dist');
  }

  return join(compiledSrcDir, '..', '..', 'dist');
};

export const resolveFrontendIndexPath = (compiledSrcDir = __dirname) =>
  join(resolveFrontendDistPath(compiledSrcDir), 'index.html');
