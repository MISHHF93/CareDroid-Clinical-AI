import { useState } from 'react';
import { PublicPageTemplate } from '../components/ui/CareDroidPrimitives';
import { CANONICAL_ROUTES } from '../config/routes.config';

const FAQ_SECTIONS = [
  {
    title: 'Getting Started',
    items: [
      {
        q: 'How do I get started with CareDroid?',
        a: 'Open the platform entry hub or land directly in the ED demo. Use the demo persona panel to switch between reception, triage, physician, EMS, and admin views without signing in.',
      },
      {
        q: 'What is CareDroid?',
        a: 'CareDroid is a reception-first emergency department operating platform. The whiteboard, patient cards, role-based suites, and case-aware Copilot give ED teams shared operational awareness from arrival through disposition.',
      },
      {
        q: 'Is my data secure?',
        a: 'CareDroid is designed with encryption, audit logging, and governance controls. Production deployments require customer-specific compliance validation.',
      },
    ],
  },
  {
    title: 'ED Operations',
    items: [
      {
        q: 'How do I open the emergency whiteboard?',
        a: 'Land on /emergency/whiteboard or use the Whiteboard item in the sidebar. Reception prepares patient cards first; triage, charge, and bedside teams consume the shared board state.',
      },
      {
        q: 'How does CareDroid Copilot work?',
        a: 'Open Copilot from the header or patient detail drawer. Copilot is case-aware decision support — it surfaces routing, evidence, and workflow prompts without making autonomous clinical decisions.',
      },
      {
        q: 'Where do I manage referrals and boarding?',
        a: 'Use Referrals (/emergency/referrals) for specialty coordination and Boarding (/emergency/boarding) for inpatient bed pressure. Both surfaces tie back to the whiteboard patient card.',
      },
    ],
  },
  {
    title: 'Account & Compliance',
    items: [
      {
        q: 'How do I export my data?',
        a: 'Open Platform Settings (/settings) and use the privacy drawer to request a compliance export when the backend capability is enabled.',
      },
      {
        q: 'Where are privacy policies?',
        a: 'Review the privacy policy at /legal/privacy-policy, GDPR notice at /legal/gdpr, and HIPAA notice at /legal/hipaa.',
      },
    ],
  },
];

export default function HelpCenter() {
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  return (
    <PublicPageTemplate
      className="help-center-page"
      eyebrow="CareDroid support"
      title="Help center"
      description="Operational FAQs for ED staff, administrators, and evaluators using the CareDroid platform."
      backHref={CANONICAL_ROUTES.emergencyHelp}
    >
      <div className="cdl-public-faq cdl-zone cdl-zone--active-work">
        {FAQ_SECTIONS.map((section, sectionIndex) => {
          const isOpen = expandedSection === sectionIndex;
          return (
            <section
              key={section.title}
              className={['cdl-public-faq__section', isOpen ? 'cdl-public-faq__section--open' : '']
                .filter(Boolean)
                .join(' ')}
            >
              {isOpen ? (
                <button
                  type="button"
                  className="cdl-public-faq__trigger"
                  aria-expanded="true"
                  onClick={() => setExpandedSection(isOpen ? null : sectionIndex)}
                >
                  <span>{section.title}</span>
                  <span className="cdl-public-faq__chevron" aria-hidden>
                    ▾
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  className="cdl-public-faq__trigger"
                  aria-expanded="false"
                  onClick={() => setExpandedSection(isOpen ? null : sectionIndex)}
                >
                  <span>{section.title}</span>
                  <span className="cdl-public-faq__chevron" aria-hidden>
                    ▾
                  </span>
                </button>
              )}
              {isOpen ? (
                <div className="cdl-public-faq__panel">
                  {section.items.map((item) => (
                    <article key={item.q} className="cdl-public-faq__item">
                      <h3>Q: {item.q}</h3>
                      <p>A: {item.a}</p>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <aside className="cdl-public-page__cta cdl-zone cdl-zone--supporting-context">
        <h2>Need more help?</h2>
        <p>Contact support for deployment, governance, or clinical workflow questions.</p>
        <p>
          Email: <a href="mailto:support@caredroid.ai">support@caredroid.ai</a>
        </p>
      </aside>
    </PublicPageTemplate>
  );
}
