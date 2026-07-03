import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { resolveLivingDocumentationForPath } from '../services/livingDocumentationService';
import { getLivingDocumentationSnapshot } from '../store/livingDocumentationStore';
import { resolveLivingContextualHelpForPath } from '../config/livingDocumentationContextualHelp';

export function useLivingDocumentation() {
  const { pathname } = useLocation();

  const snapshot = useMemo(() => getLivingDocumentationSnapshot(), []);

  const pageContext = useMemo(
    () => resolveLivingDocumentationForPath(pathname, snapshot),
    [pathname, snapshot],
  );

  const contextualHelp = useMemo(
    () => resolveLivingContextualHelpForPath(pathname),
    [pathname],
  );

  return useMemo(
    () =>
      Object.freeze({
        snapshot,
        pageContext,
        contextualHelp,
        metrics: snapshot.metrics,
        supersededDocs: snapshot.supersededDocs,
      }),
    [contextualHelp, pageContext, snapshot],
  );
}

export default useLivingDocumentation;