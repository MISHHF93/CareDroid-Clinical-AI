import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../components/ui/card';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import './ProfileIdentityPages.css';

export default function ProfilePreferences() {
  const { preferences, aiPersonalization, savePreferences, isLoading } = useUserIdentity();
  const [form, setForm] = useState({
    theme: 'system',
    language: 'en',
    defaultDashboard: 'command',
    compactMode: false,
    responseStyle: 'concise',
    citationLevel: 'standard',
    safetyTone: 'standard',
  });
  const [status, setStatus] = useState('');

  useEffect(() => {
    setForm({
      theme: preferences?.theme || 'system',
      language: preferences?.language || 'en',
      defaultDashboard: preferences?.defaultDashboard || 'command',
      compactMode: Boolean(preferences?.compactMode),
      responseStyle: preferences?.aiAssistantPreferences?.responseStyle || 'concise',
      citationLevel: preferences?.aiAssistantPreferences?.citationLevel || 'standard',
      safetyTone: preferences?.aiAssistantPreferences?.safetyTone || 'standard',
    });
  }, [preferences]);

  const recommendations = useMemo(
    () => aiPersonalization?.recommendedWorkflows || [],
    [aiPersonalization?.recommendedWorkflows],
  );

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setStatus('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await savePreferences({
      theme: form.theme,
      language: form.language,
      defaultDashboard: form.defaultDashboard,
      compactMode: form.compactMode,
      aiAssistantPreferences: {
        responseStyle: form.responseStyle,
        citationLevel: form.citationLevel,
        safetyTone: form.safetyTone,
      },
    });
    setStatus(result.ok ? 'Preferences saved.' : result.message || 'Unable to save preferences.');
  };

  return (
    <main className="profile-identity-page">
      <div className="profile-identity-page__inner">
        <header className="profile-identity-page__header">
          <h1>Profile Preferences</h1>
          <p>Personalize dashboards, theme, accessibility mode, calculators, notifications, and AI behavior.</p>
        </header>

        <Card>
          <form className="profile-identity-form" onSubmit={handleSubmit}>
            <label>
              Theme
              <select value={form.theme} onChange={(event) => updateField('theme', event.target.value)}>
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label>
              Language
              <input value={form.language} onChange={(event) => updateField('language', event.target.value)} />
            </label>
            <label>
              Default dashboard
              <select
                value={form.defaultDashboard}
                onChange={(event) => updateField('defaultDashboard', event.target.value)}
              >
                <option value="command">Command</option>
                <option value="assistant">Assistant</option>
                <option value="operations">Operations</option>
                <option value="fleet">Fleet</option>
                <option value="iot">Medical IoT</option>
                <option value="research">Research</option>
              </select>
            </label>
            <label>
              AI response style
              <select value={form.responseStyle} onChange={(event) => updateField('responseStyle', event.target.value)}>
                <option value="concise">Concise</option>
                <option value="stepwise">Stepwise</option>
                <option value="evidence_first">Evidence first</option>
                <option value="teaching">Teaching</option>
              </select>
            </label>
            <label>
              Citation level
              <select value={form.citationLevel} onChange={(event) => updateField('citationLevel', event.target.value)}>
                <option value="minimal">Minimal</option>
                <option value="standard">Standard</option>
                <option value="full">Full</option>
              </select>
            </label>
            <label>
              Safety tone
              <select value={form.safetyTone} onChange={(event) => updateField('safetyTone', event.target.value)}>
                <option value="standard">Standard</option>
                <option value="strict">Strict</option>
              </select>
            </label>
            <label>
              <span>
                <input
                  type="checkbox"
                  checked={form.compactMode}
                  onChange={(event) => updateField('compactMode', event.target.checked)}
                />{' '}
                Compact mode
              </span>
            </label>
            <div className="profile-identity-actions">
              <button type="submit" className="profile-identity-button" disabled={isLoading}>
                Save preferences
              </button>
              {status ? <span className="profile-identity-muted">{status}</span> : null}
            </div>
          </form>
        </Card>

        <section className="profile-identity-card">
          <h3>AI Recommendations</h3>
          <div className="profile-identity-list">
            {recommendations.map((workflow) => (
              <div key={workflow.id || workflow.title} className="profile-identity-row">
                <div>
                  <strong>{workflow.title}</strong>
                  <span>{workflow.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
