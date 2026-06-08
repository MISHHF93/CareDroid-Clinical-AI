import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useConversation } from '../contexts/ConversationContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS, getToolIcon } from '../navigation/iconRegistry';
import {
  DashboardGrid,
  DashboardSection,
  MetricCard,
  PageShell,
} from '../components/ui/CareDroidPrimitives';
import {
  LOCAL_MEMORY_DASHBOARD,
  LOCAL_MEMORY_FABRIC_CONTEXT,
  fetchMemoryDashboard,
  fetchMemoryFabricContext,
  persistShortMemory,
  recordMemorySignal,
} from '../services/memoryApi';
import './MemoryDashboard.css';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatDate(value) {
  if (!value) return 'Now';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function compactText(value, fallback = 'No details captured yet.') {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || fallback;
  return Object.entries(value)
    .slice(0, 3)
    .map(([key, item]) => `${key}: ${Array.isArray(item) ? item.join(', ') : item}`)
    .join(' | ');
}

function memoryCount(aiContext) {
  const shortTerm = aiContext?.shortTerm || {};
  const longTerm = aiContext?.longTerm || {};
  const clinical = aiContext?.clinical || {};
  return {
    shortTerm: Object.values(shortTerm).filter(Boolean).length,
    longTerm: ['preferences', 'history', 'savedTools'].reduce(
      (sum, key) => sum + (longTerm[key]?.length || 0),
      0
    ),
    clinical: ['findings', 'summaries', 'scores'].reduce(
      (sum, key) => sum + (clinical[key]?.length || 0),
      0
    ),
  };
}

function buildSessionActivity({ activeConversation, messages, recentTools, activeWorkspace }) {
  const latestAssistant = [...messages].reverse().find((message) => message.role === 'assistant');
  const items = [];
  if (activeConversation) {
    items.push({
      id: `session-conversation-${activeConversation.id}`,
      source: 'current-session',
      type: 'active_conversation',
      title: activeConversation.title || 'Active conversation',
      occurredAt: activeConversation.date || new Date().toISOString(),
      metadata: {
        messageCount: messages.length,
        latestAssistant: latestAssistant?.content,
      },
    });
  }
  recentTools.slice(0, 4).forEach((toolId, index) => {
    items.push({
      id: `session-tool-${toolId}`,
      source: 'current-session',
      type: index === 0 ? 'active_calculator' : 'saved_tools',
      title: toolId,
      occurredAt: new Date(Date.now() - index * 60_000).toISOString(),
      metadata: { toolId, workspace: activeWorkspace?.name },
    });
  });
  return items;
}

function mergeById(primary = [], secondary = []) {
  const seen = new Set();
  return [...primary, ...secondary].filter((item) => {
    const key = item.id || `${item.source}:${item.type}:${item.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function ActivityItem({ item }) {
  const toolId = item.metadata?.toolId || item.metadata?.calculatorId;
  return (
    <li className="memory-activity-item">
      <span className="memory-activity-item__icon" aria-hidden>
        <NavIcon icon={toolId ? getToolIcon(toolId) : CHROME_ICONS.clock} size={18} />
      </span>
      <span>
        <strong>{item.title}</strong>
        <small>
          {item.source} · {item.type} · {formatDate(item.occurredAt)}
        </small>
        <em>{compactText(item.metadata?.latestAssistant || item.metadata)}</em>
      </span>
    </li>
  );
}

function MemoryCard({ title, entries, empty }) {
  return (
    <DashboardSection className="memory-panel" title={title} actions={<span>{entries.length}</span>}>
      {entries.length > 0 ? (
        <div className="memory-card-list">
          {entries.map((entry) => (
            <article className="memory-card" key={entry.id || entry.title}>
              <strong>{entry.title}</strong>
              <p>{compactText(entry.content || entry.metadata)}</p>
              <small>{formatDate(entry.updatedAt || entry.createdAt || entry.occurredAt)}</small>
            </article>
          ))}
        </div>
      ) : (
        <p className="memory-empty">{empty}</p>
      )}
    </DashboardSection>
  );
}

export default function MemoryDashboard() {
  const { conversations, activeConversationId, messages, selectedTool } = useConversation();
  const toolPreferences = useToolPreferences();
  const { recentTools, pinned } = toolPreferences;
  const { activeWorkspace, aiPersonalization, preferences, roleProfile, organization } = useUserIdentity();
  const [dashboard, setDashboard] = useState(LOCAL_MEMORY_DASHBOARD);
  const [fabricContext, setFabricContext] = useState(LOCAL_MEMORY_FABRIC_CONTEXT);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) || conversations[0],
    [activeConversationId, conversations]
  );
  const workspaceId = UUID_RE.test(activeWorkspace?.id || '') ? activeWorkspace.id : undefined;
  const sessionActivity = useMemo(
    () => buildSessionActivity({ activeConversation, messages, recentTools, activeWorkspace }),
    [activeConversation, activeWorkspace, messages, recentTools]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadMemory() {
      setLoading(true);
      const [result, fabricResult] = await Promise.all([
        fetchMemoryDashboard(),
        fetchMemoryFabricContext(),
      ]);
      if (cancelled) return;
      setDashboard({
        recentActivity: result.recentActivity,
        recentConversations: result.recentConversations,
        recentTools: result.recentTools,
        savedWorkflows: result.savedWorkflows,
        aiContext: result.aiContext,
      });
      setFabricContext(fabricResult.ok ? fabricResult : LOCAL_MEMORY_FABRIC_CONTEXT);
      setNotice(
        result.ok && fabricResult.ok
          ? ''
          : `Using live session memory. ${result.message || fabricResult.message}`
      );
      setLoading(false);
    }
    loadMemory();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    persistShortMemory({
      type: 'active_dashboard',
      title: 'Memory dashboard',
      workspaceId,
      content: {
        route: '/ai-memory',
        routeAliases: ['/memory'],
        sections: ['recent conversations', 'saved workflows', 'recent tools', 'ai context'],
      },
    });
  }, [workspaceId]);

  useEffect(() => {
    if (!activeConversation) return;
    persistShortMemory({
      type: 'active_conversation',
      title: activeConversation.title || 'Active conversation',
      workspaceId,
      content: {
        conversationId: activeConversation.id,
        messageCount: messages.length,
        latestMessage: messages[messages.length - 1]?.content,
      },
    });
  }, [activeConversation, messages, workspaceId]);

  useEffect(() => {
    const activeTool = selectedTool || recentTools[0];
    if (!activeTool) return;
    persistShortMemory({
      type: 'active_calculator',
      title: activeTool,
      workspaceId,
      content: { toolId: activeTool },
    });
  }, [recentTools, selectedTool, workspaceId]);

  useEffect(() => {
    recordMemorySignal({
      scope: 'user',
      signalType: 'preferences',
      title: 'User memory preferences',
      workspaceId,
      content: {
        defaultDashboard: preferences?.defaultDashboard,
        pinnedToolIds: pinned || [],
        recentToolIds: recentTools || [],
        roleProfileId: roleProfile?.id,
        organizationId: organization?.id,
      },
      tags: ['preferences', 'tool-preferences'],
    });
  }, [organization?.id, pinned, preferences?.defaultDashboard, recentTools, roleProfile?.id, workspaceId]);

  useEffect(() => {
    const activeTool = selectedTool || recentTools[0];
    if (!activeTool) return;
    recordMemorySignal({
      scope: 'workspace',
      signalType: 'recent_asset',
      title: activeTool,
      workspaceId,
      assetId: activeTool,
      content: { assetId: activeTool, source: 'memory-dashboard' },
      tags: ['recent-asset'],
    });
  }, [recentTools, selectedTool, workspaceId]);

  const aiContext = dashboard.aiContext || LOCAL_MEMORY_DASHBOARD.aiContext;
  const counts = memoryCount(aiContext);
  const recentActivity = mergeById(sessionActivity, dashboard.recentActivity)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 12);
  const savedWorkflows = mergeById(
    dashboard.savedWorkflows,
    (aiPersonalization?.recommendedWorkflows || []).map((workflow) => ({
      id: workflow.id,
      title: workflow.title,
      content: { reason: workflow.reason, toolId: workflow.toolId },
      updatedAt: new Date().toISOString(),
    }))
  );
  const recentConversations = mergeById(
    activeConversation
      ? [
          {
            id: `current-conversation-${activeConversation.id}`,
            title: activeConversation.title || 'Active conversation',
            content: {
              messageCount: messages.length,
              latestMessage: messages[messages.length - 1]?.content,
            },
            updatedAt: activeConversation.date || new Date().toISOString(),
          },
        ]
      : [],
    dashboard.recentConversations || []
  ).slice(0, 8);
  const recentToolEntries = mergeById(
    (recentTools || []).slice(0, 6).map((toolId) => ({
      id: `session-tool-card-${toolId}`,
      title: toolId,
      content: { toolId, source: 'current session' },
      updatedAt: new Date().toISOString(),
    })),
    dashboard.recentTools || []
  ).slice(0, 8);
  const shortEntries = Object.values(aiContext.shortTerm || {}).filter(Boolean);
  const clinicalEntries = [
    ...(aiContext.clinical?.findings || []),
    ...(aiContext.clinical?.summaries || []),
    ...(aiContext.clinical?.scores || []),
  ];
  const fabricCards = [
    {
      title: 'Organization Memory',
      entries: [
        ...(fabricContext.organizationMemory?.commonSearches || []),
        ...(fabricContext.organizationMemory?.successfulWorkflows || []),
      ],
      empty: 'Organization-scoped searches and workflows will appear after safe memory signals are recorded.',
    },
    {
      title: 'Workspace Memory',
      entries: (fabricContext.workspaceMemory?.recentAssets || []).map((assetId) => ({
        id: `workspace-${assetId}`,
        title: assetId,
        content: { assetId },
      })),
      empty: 'Workspace recent assets will appear here.',
    },
    {
      title: 'Role Memory',
      entries: (fabricContext.roleMemory?.preferredAssetIds || []).map((assetId) => ({
        id: `role-${assetId}`,
        title: assetId,
        content: { role: fabricContext.roleMemory?.role, assetId },
      })),
      empty: 'Role-fit assets and role profile signals will appear here.',
    },
    {
      title: 'User Memory',
      entries: [
        ...(fabricContext.userMemory?.pinnedAssets || []).map((assetId) => ({
          id: `pinned-${assetId}`,
          title: assetId,
          content: { kind: 'pinned asset', assetId },
        })),
        ...(fabricContext.userMemory?.recentAssets || []).map((assetId) => ({
          id: `recent-${assetId}`,
          title: assetId,
          content: { kind: 'recent asset', assetId },
        })),
      ],
      empty: 'Pinned and recent user assets will appear here.',
    },
    {
      title: 'AI Memory',
      entries: Object.entries(fabricContext.aiMemory?.shortTerm || {})
        .filter(([, value]) => Boolean(value))
        .map(([key, value]) => ({
          id: `ai-${key}`,
          title: value.title || key,
          content: value.content || value,
        })),
      empty: 'AI-safe short-term context will appear here.',
    },
    {
      title: 'Artifact Memory',
      entries: fabricContext.artifactMemory?.references || [],
      empty: 'Artifact references, versions, tags, and relationships will appear here.',
    },
  ];

  return (
    <PageShell
      className="memory-dashboard"
      eyebrow="CareDroid memory architecture"
      title="Memory Dashboard"
      titleId="memory-dashboard-title"
      description="Tracks the active clinical session, long-term user context, and clinical memory used to ground CareDroid responses."
      leadingIcon={<NavIcon icon={CHROME_ICONS.brain} size={28} />}
    >

      {notice ? <p className="memory-notice">{notice}</p> : null}

      <DashboardGrid variant="metrics" className="memory-stats" aria-label="Memory summary">
        <MetricCard label="Short-term slots" value={counts.shortTerm} />
        <MetricCard label="Long-term memories" value={counts.longTerm} />
        <MetricCard label="Clinical memories" value={counts.clinical} />
        <MetricCard label="Fabric assets" value={fabricContext.workspaceMemory?.visibleAssetIds?.length || 0} />
      </DashboardGrid>

      <DashboardGrid className="memory-context-grid" aria-label="AI memory fabric">
        {fabricCards.map((card) => (
          <MemoryCard
            key={card.title}
            title={card.title}
            entries={card.entries}
            empty={card.empty}
          />
        ))}
      </DashboardGrid>

      <DashboardGrid className="memory-layout">
        <MemoryCard
          title="Recent Conversations"
          entries={recentConversations}
          empty="Recent assistant conversations will appear here as short-term memory."
        />

        <DashboardSection
          className="memory-panel memory-panel--activity"
          aria-labelledby="memory-activity-title"
          title="Recent Activity"
          titleId="memory-activity-title"
          actions={<span>{loading ? 'Loading' : `${recentActivity.length} items`}</span>}
        >
          {recentActivity.length > 0 ? (
            <ul className="memory-activity-list">
              {recentActivity.map((item) => (
                <ActivityItem key={item.id} item={item} />
              ))}
            </ul>
          ) : (
            <p className="memory-empty">No memory activity has been captured yet.</p>
          )}
        </DashboardSection>
      </DashboardGrid>

      <DashboardGrid className="memory-layout">
        <MemoryCard
          title="Saved Workflows"
          entries={savedWorkflows}
          empty="Save tools or recommended workflows to make them available here."
        />

        <MemoryCard
          title="Recent Tools"
          entries={recentToolEntries}
          empty="Recently used assistant tools and calculators will appear here."
        />
      </DashboardGrid>

      <DashboardGrid className="memory-context-grid" aria-label="AI context">
        <MemoryCard
          title="AI Context"
          entries={shortEntries}
          empty="Short-term active conversation, calculator, and dashboard context will appear here."
        />
        <MemoryCard
          title="Clinical Memory"
          entries={clinicalEntries}
          empty="Findings, summaries, and scores will appear after clinical memory is recorded."
        />
        <DashboardSection className="memory-panel" title="Long-Term Context" actions={<span>{counts.longTerm}</span>}>
          <p className="memory-empty">
            Preferences, history, and saved tools become durable context for future sessions.
          </p>
          <Link className="memory-link" to="/profile/preferences">
            Review preferences
          </Link>
        </DashboardSection>
      </DashboardGrid>
    </PageShell>
  );
}
