import { PublicPageTemplate } from '../components/ui/CareDroidPrimitives';
import { CANONICAL_ROUTES } from '../config/routes.config';

export default function GDPRNotice() {
  return (
    <PublicPageTemplate
      eyebrow="Compliance"
      title="GDPR notice"
      description="General Data Protection Regulation (GDPR) compliance information for EU residents."
      backHref={CANONICAL_ROUTES.legalPrivacyPolicy}
    >
      <article className="cdl-public-page__prose cdl-zone cdl-zone--active-work">
        <section>
          <h2>1. Data protection rights</h2>
          <p>Under GDPR, you have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Rectify inaccurate data</li>
            <li>Request deletion (Right to be Forgotten)</li>
            <li>Restrict data processing</li>
            <li>Data portability</li>
            <li>Object to processing</li>
            <li>Withdraw consent at any time</li>
          </ul>
        </section>

        <section>
          <h2>2. Data processing</h2>
          <p>
            We process personal data only with your explicit consent. Medical and clinical data is
            encrypted and stored securely according to GDPR Article 32 requirements.
          </p>
        </section>

        <section>
          <h2>3. Data retention</h2>
          <p>
            Your data is retained only as long as necessary for the purposes stated. You can request
            deletion at any time, and we will comply within 30 days unless legal obligations require
            retention.
          </p>
        </section>

        <section>
          <h2>4. International transfers</h2>
          <p>
            If your data is transferred outside the EU/EEA, we ensure adequate safeguards are in
            place as per GDPR Chapter 5.
          </p>
        </section>

        <section className="cdl-surface cdl-surface--information">
          <h3>Contact our Data Protection Officer</h3>
          <p>
            For GDPR-related inquiries:{' '}
            <a href="mailto:dpo@caredroid.ai">dpo@caredroid.ai</a>
          </p>
        </section>

        <p className="cdl-type-muted">
          Last updated: February 2026 · See also{' '}
          <a href={CANONICAL_ROUTES.legalPrivacyPolicy}>Privacy Policy</a>
        </p>
      </article>
    </PublicPageTemplate>
  );
}