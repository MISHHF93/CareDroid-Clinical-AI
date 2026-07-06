/** Normalize artifact-router text so train and inference share the same label-type signal. */
export function inferRouterLabelType(text: string): 'name' | 'route' {
  const trimmed = text.trim();
  if (trimmed.startsWith('/')) return 'route';
  return 'name';
}

export function formatArtifactRouterInput(
  text: string,
  labelType?: 'name' | 'route',
  artifactType?: string,
): string {
  const kind = labelType ?? inferRouterLabelType(text);
  const trimmed = text.trim().replace(/^(name|route):\s+/i, '');
  const typeHint =
    artifactType && ['platform', 'api-endpoint', 'backend-service'].includes(artifactType)
      ? `${artifactType} | `
      : '';
  return `${kind}: ${typeHint}${trimmed}`;
}