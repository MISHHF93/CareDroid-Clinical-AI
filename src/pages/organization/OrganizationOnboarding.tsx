import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/card';
import Button from '../../components/ui/button';
import { CareDroidPage } from '../../components/ui/CareDroidPrimitives';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import { ProductCatalogApi } from '../../services/productCatalogApi';
import {
  CLINIC_ONBOARDING_STEPS,
  CLINIC_ONBOARDING_STEP_IDS,
} from '../../config/clinicOnboardingModel';
import './OrganizationPages.css';

const ORGANIZATION_TYPES = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'academic_medical_center', label: 'Academic medical center' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'ems', label: 'EMS' },
  { value: 'research_institute', label: 'Research institute' },
  { value: 'research_center', label: 'Research center' },
  { value: 'health_system', label: 'Health system' },
  { value: 'long_term_care', label: 'Long-term care' },
  { value: 'home_care', label: 'Home care' },
  { value: 'telehealth', label: 'Telehealth' },
  { value: 'university', label: 'University' },
  { value: 'racetrack', label: 'Racetrack' },
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function OrganizationOnboarding() {
  const navigate = useNavigate();
  const { refreshPlatformContext } = useUserIdentity();
  const [form, setForm] = useState({
    name: '',
    slug: '',
    organizationType: 'hospital',
    country: '',
  });
  const [slugTouched, setSlugTouched] = useState(false);
  // `status` was one string doing three jobs -- progress, success and failure --
  // rendered into a bare <p>, so a failure was visually and semantically
  // indistinguishable from a success and neither reached assistive tech.
  const [status, setStatus] = useState<{
    tone: 'progress' | 'success' | 'error';
    message: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [organizationCreated, setOrganizationCreated] = useState(false);

  const remainingSteps = CLINIC_ONBOARDING_STEPS.filter(
    (step) => step.id !== CLINIC_ONBOARDING_STEP_IDS.ORGANIZATION,
  );

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }));
  };

  const submit = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      setStatus({ tone: 'error', message: 'Organization name and URL slug are both required.' });
      return;
    }
    setSubmitting(true);
    setStatus({ tone: 'progress', message: 'Creating organization…' });
    try {
      await ProductCatalogApi.completeOnboarding({
        name: form.name.trim(),
        slug: form.slug.trim(),
        organizationType: form.organizationType,
        country: form.country.trim() || undefined,
      });
      await refreshPlatformContext();
      // Previously this navigated straight to /tenant-admin, which threw away
      // every remaining setup step the moment the one automated step finished
      // -- the user landed on an unrelated admin page with no idea that five
      // more configuration steps existed or where they lived. Stay put, mark
      // this step done, and hand over an explicit next action instead.
      setOrganizationCreated(true);
      setStatus({
        tone: 'success',
        message: `${form.name.trim()} created. Continue with the remaining setup steps below.`,
      });
    } catch (error: any) {
      setStatus({ tone: 'error', message: error?.message || 'Could not create the organization.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CareDroidPage
      className="org-page"
      contentClassName="cd-page-stack cd-page-stack--compact org-page__content"
      title="Organization onboarding"
      description={`Step 1 of ${CLINIC_ONBOARDING_STEPS.length} — create the organization, then work through the remaining setup below.`}
    >
      <Card className="org-card">
        <h2>
          {organizationCreated ? 'Organization details — done' : 'Step 1 · Organization details'}
        </h2>
        <label>
          Organization name <span aria-hidden="true">*</span>
          <input
            value={form.name}
            required
            aria-required="true"
            disabled={organizationCreated}
            onChange={(e) => handleNameChange(e.target.value)}
          />
        </label>
        <label>
          URL slug <span aria-hidden="true">*</span>
          <input
            value={form.slug}
            required
            aria-required="true"
            disabled={organizationCreated}
            onChange={(e) => {
              setSlugTouched(true);
              setForm((prev) => ({ ...prev, slug: slugify(e.target.value) }));
            }}
          />
        </label>
        <label>
          Organization type
          <select
            value={form.organizationType}
            disabled={organizationCreated}
            onChange={(e) => setForm((prev) => ({ ...prev, organizationType: e.target.value }))}
          >
            {ORGANIZATION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Country (optional)
          <input
            value={form.country}
            disabled={organizationCreated}
            onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
          />
        </label>
        {!organizationCreated ? (
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create organization'}
          </Button>
        ) : null}
      </Card>

      {status ? (
        <p
          className={`org-status org-status--${status.tone}`}
          role={status.tone === 'error' ? 'alert' : 'status'}
        >
          {status.message}
        </p>
      ) : null}

      {/* The remaining steps were previously mentioned only in this page's own
          subtitle -- "configured afterward from Tenant admin and Emergency
          settings" -- with no list, no order, no progress and no links, so the
          setup that the onboarding model actually defines was invisible. The
          model already carries each step's label and destination; show them. */}
      <Card className="org-card">
        <h2>Remaining setup</h2>
        <ol className="org-onboarding-steps">
          {remainingSteps.map((step, index) => (
            <li key={step.id} className="org-onboarding-step">
              <div>
                <strong>
                  Step {index + 2} · {step.label}
                </strong>
                <span className="org-chip">
                  {step.automated ? 'Provisioned by default' : 'Needs your input'}
                </span>
              </div>
              {organizationCreated ? (
                <Link to={step.route} className="org-card__link">
                  Open
                </Link>
              ) : (
                <span className="org-onboarding-step__pending">
                  Available once the organization exists
                </span>
              )}
            </li>
          ))}
        </ol>
      </Card>

      {organizationCreated ? (
        <Button onClick={() => navigate('/tenant-admin')}>Go to Tenant admin</Button>
      ) : null}
    </CareDroidPage>
  );
}
