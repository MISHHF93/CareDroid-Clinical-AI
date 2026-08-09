import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/card';
import Button from '../../components/ui/button';
import { CareDroidPage } from '../../components/ui/CareDroidPrimitives';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import { ProductCatalogApi } from '../../services/productCatalogApi';
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
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }));
  };

  const submit = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      setStatus('Organization name and slug are required.');
      return;
    }
    setSubmitting(true);
    setStatus('Creating organization…');
    try {
      await ProductCatalogApi.completeOnboarding({
        name: form.name.trim(),
        slug: form.slug.trim(),
        organizationType: form.organizationType,
        country: form.country.trim() || undefined,
      });
      await refreshPlatformContext();
      setStatus('Organization created.');
      navigate('/tenant-admin');
    } catch (error: any) {
      setStatus(error?.message || 'Onboarding failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CareDroidPage
      className="org-page"
      contentClassName="cd-page-stack cd-page-stack--compact org-page__content"
      title="Organization onboarding"
      description="Create a new CareDroid organization. Staff roster, queue targets, thresholds, alert rules, and role assignments are configured afterward from Tenant admin and Emergency settings."
    >
      <Card className="org-card">
        <h2>Organization details</h2>
        <label>
          Organization name
          <input value={form.name} onChange={(e) => handleNameChange(e.target.value)} />
        </label>
        <label>
          URL slug
          <input
            value={form.slug}
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
            onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
          />
        </label>
        <Button onClick={submit} disabled={submitting}>
          {submitting ? 'Creating…' : 'Create organization'}
        </Button>
      </Card>

      {status && <p className="org-status">{status}</p>}
    </CareDroidPage>
  );
}
