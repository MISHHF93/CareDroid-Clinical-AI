import { isPractitionerCleanupEnabled } from '../config/practitionerCleanup.config';
import {
  ED_EXTENSION_ROUTE_REDIRECTS,
  isEdSingleApplicationMode,
  resolveEdExtensionRedirect,
} from '../config/edApplication.config';

/** @deprecated Use ED_EXTENSION_ROUTE_REDIRECTS from edApplication.config */
export const PILOT_EXTENSION_ROUTE_REDIRECTS = ED_EXTENSION_ROUTE_REDIRECTS;

export function resolvePilotExtensionRedirect(pathname = '') {
  if (isEdSingleApplicationMode()) {
    return resolveEdExtensionRedirect(pathname);
  }

  if (!isPractitionerCleanupEnabled()) {
    return null;
  }

  const normalized = pathname.split('?')[0].split('#')[0];
  for (const entry of ED_EXTENSION_ROUTE_REDIRECTS) {
    if (normalized === entry.prefix || normalized.startsWith(`${entry.prefix}/`)) {
      return entry.to;
    }
  }

  return null;
}