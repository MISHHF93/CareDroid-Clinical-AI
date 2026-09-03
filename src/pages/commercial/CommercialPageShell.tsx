import { CareDroidPage } from '../../components/ui/CareDroidPrimitives';

export default function CommercialPageShell({
  title,
  subtitle,
  children = undefined,
  actions = null,
}) {
  return (
    <CareDroidPage
      as="div"
      className="commercial-page"
      headerClassName="commercial-header"
      contentClassName="cd-page-stack cd-page-stack--compact commercial-page__content"
      title={title}
      description={subtitle}
      actions={actions}
    >
      {children}
    </CareDroidPage>
  );
}
