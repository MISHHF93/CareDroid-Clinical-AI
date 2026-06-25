import HelpHub from '../../components/help/HelpHub';
import { PageShell } from '../../components/ui/CareDroidPrimitives';

export default function HelpHubPage() {
  return (
    <div className="help-hub-page">
      <PageShell
        eyebrow="CareDroid Guide"
        title="Process & procedures"
        description="Role-based playbooks, screen procedures, and the full ED patient journey."
      >
        <HelpHub variant="page" />
      </PageShell>
    </div>
  );
}