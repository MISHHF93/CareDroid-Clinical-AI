import type { ReactNode } from 'react';
import './copilot-shell.css';

export type CopilotShellTab = 'chat' | 'context' | 'safety';

type CopilotShellTabConfig = {
  id: CopilotShellTab;
  label: string;
  badge?: number;
};

type CopilotShellProps = {
  header: ReactNode;
  activeTab: CopilotShellTab;
  onTabChange: (tab: CopilotShellTab) => void;
  tabs?: CopilotShellTabConfig[];
  chatContent: ReactNode;
  contextContent: ReactNode;
  safetyContent: ReactNode;
  footer?: ReactNode;
};

const DEFAULT_TABS: CopilotShellTabConfig[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'context', label: 'Context' },
  { id: 'safety', label: 'Safety' },
];

export default function CopilotShell({
  header,
  activeTab,
  onTabChange,
  tabs = DEFAULT_TABS,
  chatContent,
  contextContent,
  safetyContent,
  footer,
}: CopilotShellProps) {
  const tabPanels: Record<CopilotShellTab, ReactNode> = {
    chat: chatContent,
    context: contextContent,
    safety: safetyContent,
  };

  return (
    <div className="ed-copilot-shell">
      {header}

      <div className="ed-copilot-shell__tabs" role="tablist" aria-label="Copilot panel sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`ed-copilot-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`ed-copilot-panel-${tab.id}`}
            className="ed-copilot-shell__tab"
            data-active={activeTab === tab.id ? 'true' : 'false'}
            onClick={() => onTabChange(tab.id)}
          >
            <span>{tab.label}</span>
            {typeof tab.badge === 'number' && tab.badge > 0 ? (
              <span className="ed-copilot-shell__tab-badge" aria-label={`${tab.badge} items`}>
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="ed-copilot-shell__body">
        {tabs.map((tab) => (
          <section
            key={tab.id}
            id={`ed-copilot-panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`ed-copilot-tab-${tab.id}`}
            hidden={activeTab !== tab.id}
            className={[
              'ed-copilot-shell__panel',
              `ed-copilot-shell__panel--${tab.id}`,
            ].join(' ')}
          >
            {tabPanels[tab.id]}
          </section>
        ))}
      </div>

      {activeTab === 'chat' && footer ? (
        <div className="ed-copilot-shell__footer">{footer}</div>
      ) : null}
    </div>
  );
}