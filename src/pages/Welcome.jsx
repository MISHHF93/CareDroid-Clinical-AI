import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Card from '../components/ui/card';
import Button from '../components/ui/button';
import { useNotificationActions } from '../hooks/useNotificationActions';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { resolvePostAuthDestination } from '../auth/authSession';
import { useUser } from '../contexts/UserContext';

const steps = [
  {
    id: 'workflow',
    title: 'Set your focus',
    description: 'Pick the clinical areas you use most. This does not change your assigned role.',
    options: ['Emergency', 'ICU', 'Primary Care', 'Cardiology'],
  },
  {
    id: 'safety',
    title: 'Safety & compliance',
    description: 'Always verify medical information before action.',
    options: ['I understand and agree'],
  },
];

const Welcome = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [selection, setSelection] = useState({});
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { success, error } = useNotificationActions();
  const { updateProfile, savePreferences } = useUserIdentity();
  const { user } = useUser();
  const step = steps[stepIndex];

  const handleNext = async () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
      return;
    }

    setSaving(true);
    const focusArea = selection[0] || 'Emergency';

    const profileResult = await updateProfile({
      onboardingStatus: 'complete',
      clinicalInterests: [focusArea],
    });
    await savePreferences({
      defaultDashboard: focusArea.toLowerCase().includes('emergency') ? 'command' : 'workspace',
    });
    setSaving(false);

    if (!profileResult?.ok) {
      error('Could not save onboarding', profileResult?.message || 'Try again from profile settings.');
      return;
    }

    success('Welcome complete', 'Profile preferences saved.');
    navigate(
      resolvePostAuthDestination({
        user,
        profile: profileResult.data,
        returnUrl: '/',
      }),
      { replace: true },
    );
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
      }}
    >
      <Card style={{ width: '100%', maxWidth: '720px' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted-text)', marginBottom: '6px' }}>
            Step {stepIndex + 1} of {steps.length}
          </div>
          <h2 style={{ margin: 0 }}>{step.title}</h2>
          <p style={{ marginTop: '8px', color: 'var(--muted-text)', fontSize: '14px' }}>
            {step.description}
          </p>
        </div>
        <div style={{ display: 'grid', gap: '10px' }}>
          {step.options.map((option) => (
            <Button
              key={option}
              onClick={() => setSelection({ ...selection, [stepIndex]: option })}
              style={{
                padding: '12px',
                textAlign: 'left',
                borderRadius: '12px',
                border:
                  selection[stepIndex] === option
                    ? '1px solid #00FF88'
                    : '1px solid var(--panel-border)',
                background:
                  selection[stepIndex] === option ? 'rgba(0, 255, 136, 0.12)' : 'transparent',
                color: 'var(--text-color)',
                cursor: 'pointer',
              }}
            >
              {option}
            </Button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <Button
            onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
            disabled={stepIndex === 0 || saving}
            variant="secondary"
            style={{ flex: 1 }}
          >
            Back
          </Button>
          <Button onClick={handleNext} variant="primary" style={{ flex: 1 }} loading={saving}>
            {stepIndex === steps.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </div>
        <div style={{ marginTop: '18px', fontSize: '12px', color: 'var(--muted-text)' }}>
          Your SaaS role remains admin-assigned.{' '}
          <Link to="/onboarding" style={{ color: '#00FF88', textDecoration: 'none' }}>
            Set up a hospital organization →
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Welcome;
