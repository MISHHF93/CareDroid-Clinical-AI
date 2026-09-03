import useLivingDocumentation from '../../hooks/useLivingDocumentation';
import ContextualGuidance from '../ui/ContextualGuidance';

/** Renders route-linked contextual guidance when a living help entry exists. */
export default function LivingContextualHelpBanner() {
  const { contextualHelp } = useLivingDocumentation();
  if (!contextualHelp) return null;

  return (
    <ContextualGuidance
      id={contextualHelp.guidanceId}
      title={contextualHelp.title}
      detail={contextualHelp.detail}
      tone={contextualHelp.tone}
      helpTopicId={contextualHelp.helpTopicId}
    />
  );
}
