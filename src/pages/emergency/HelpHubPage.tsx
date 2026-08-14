import HelpHub from '../../components/help/HelpHub';
import { CareDroidPage } from '../../components/ui/CareDroidPrimitives';

export default function HelpHubPage() {
  return (
    <CareDroidPage
      className="help-hub-page"
      eyebrow="CareDroid Guide"
      title="Help Center"
      description="Role-based playbooks, screen procedures, and the full ED patient journey."
    >
      <HelpHub variant="page" />
    </CareDroidPage>
  );
}