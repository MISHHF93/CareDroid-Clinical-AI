import { PageShell } from '../../components/ui/CareDroidPrimitives';

export default function CommercialPageShell({ title, subtitle, children, actions = null }) {
  return (
    <PageShell
      as="div"
      className="commercial-page"
      headerClassName="commercial-header"
      contentClassName="cd-page-stack cd-page-stack--compact commercial-page__content"
      title={title}
      description={subtitle}
      actions={actions}
    >
      {children}
    </PageShell>
  );
}
