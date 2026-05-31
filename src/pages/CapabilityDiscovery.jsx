import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { buildCapabilityDiscovery } from '../data/capabilityDiscoveryEngine';
import { buildUserToolProfile } from '../data/profileToolSegmentation';
import { getUserFacingToolRegistryProjection } from '../data/toolInventory';
import './CapabilityDiscovery.css';

export default function CapabilityDiscovery() {
  const { user } = useUser();
  const { account, preferences, activeWorkspace } = useUserIdentity();
  const toolPreferences = useToolPreferences();
  const tools = useMemo(() => getUserFacingToolRegistryProjection(), []);
  const profile = useMemo(
    () =>
      buildUserToolProfile({
        user,
        account,
        preferences,
        activeWorkspace,
        toolPreferences,
      }),
    [account, activeWorkspace, preferences, toolPreferences, user]
  );
  const discovery = useMemo(
    () =>
      buildCapabilityDiscovery({
        profile,
        tools,
        recentToolIds: toolPreferences.recentTools,
      }),
    [profile, tools, toolPreferences.recentTools]
  );

  return (
    <div className="capability-discovery">
      <header className="capability-discovery-hero">
        <div>
          <p className="capability-discovery-eyebrow">Capability discovery</p>
          <h1>Discover CareDroid Capabilities</h1>
          <p>
            Find new tools, personalized recommendations, underused capabilities, simulations,
            workflows, and protocols based on your profile and recent activity.
          </p>
        </div>
        <div className="capability-discovery-profile" aria-label="Discovery profile">
          <span>{profile.role}</span>
          <strong>{profile.specialty}</strong>
        </div>
      </header>

      <section className="capability-discovery-summary" aria-label="Discovery summary">
        <div>
          <span>Total discoveries</span>
          <strong>{discovery.summary.totalItems}</strong>
        </div>
        <div>
          <span>Recommended</span>
          <strong>{discovery.summary.recommended}</strong>
        </div>
        <div>
          <span>Underused</span>
          <strong>{discovery.summary.underused}</strong>
        </div>
        <div>
          <span>Simulations</span>
          <strong>{discovery.summary.simulations}</strong>
        </div>
        <div>
          <span>Workflows</span>
          <strong>{discovery.summary.workflows}</strong>
        </div>
        <div>
          <span>Protocols</span>
          <strong>{discovery.summary.protocols}</strong>
        </div>
      </section>

      <section className="capability-discovery-ai" aria-label="AI assistant suggestion">
        <h2>Did you know CareDroid can also...</h2>
        <p>
          The assistant can surface these discovery prompts during chat so users naturally find
          relevant platform capabilities without searching through every tool.
        </p>
      </section>

      <div className="capability-discovery-sections">
        {discovery.sections.map((section) => (
          <section key={section.id} className="capability-discovery-section">
            <header>
              <div>
                <h2>{section.title}</h2>
                <p>{section.description}</p>
              </div>
              <span>{section.items.length} matches</span>
            </header>

            <div className="capability-discovery-grid">
              {section.items.map((item) => (
                <article key={item.id} className="capability-discovery-card">
                  <div>
                    <p className="capability-discovery-card__category">{item.category}</p>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                  <p className="capability-discovery-card__reason">{item.reason}</p>
                  <Link to={item.path}>Open capability</Link>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
