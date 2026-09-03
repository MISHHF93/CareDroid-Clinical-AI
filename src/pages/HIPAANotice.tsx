import { PublicPageTemplate } from '../components/ui/CareDroidPrimitives';
import { CANONICAL_ROUTES } from '../config/routes.config';

export default function HIPAANotice() {
  return (
    <PublicPageTemplate
      eyebrow="Compliance"
      title="HIPAA notice"
      description="Health Insurance Portability and Accountability Act (HIPAA) compliance information."
      backHref={CANONICAL_ROUTES.legalPrivacyPolicy}
    >
      <article className="cdl-public-page__prose cdl-zone cdl-zone--active-work">
        <section>
          <h2>1. Protected health information (PHI)</h2>
          <p>
            CareDroid is designed to handle Protected Health Information (PHI) in compliance with
            HIPAA regulations. Medical records, clinical documentation, and patient identifiers are
            encrypted and secured.
          </p>
        </section>

        <section>
          <h2>2. Privacy safeguards</h2>
          <p>We implement the following HIPAA Privacy Rule safeguards:</p>
          <ul>
            <li>Administrative safeguards: policies and procedures for access controls</li>
            <li>Physical safeguards: facility and equipment access controls</li>
            <li>Technical safeguards: encryption, authentication, audit controls</li>
            <li>Transmission security: encrypted communications</li>
          </ul>
        </section>

        <section>
          <h2>3. Breach notification</h2>
          <p>
            In the unlikely event of a breach of unsecured PHI, we will notify affected individuals,
            HHS, and if applicable, the media, without unreasonable delay but no later than 60
            calendar days after discovery.
          </p>
        </section>

        <section>
          <h2>4. Patient rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Request access to your PHI</li>
            <li>Receive an accounting of disclosures</li>
            <li>Request amendment of your records</li>
            <li>Request restrictions on use and disclosure</li>
            <li>Request confidential communications</li>
          </ul>
        </section>

        <section className="cdl-surface cdl-surface--information">
          <h3>HIPAA Privacy Officer</h3>
          <p>
            For HIPAA-related inquiries: <a href="mailto:hipaa@caredroid.ai">hipaa@caredroid.ai</a>
          </p>
        </section>

        <p className="cdl-type-muted">
          Last updated: February 2026 · CareDroid can execute Business Associate Agreements (BAA)
          upon request for production deployments.
        </p>
      </article>
    </PublicPageTemplate>
  );
}
