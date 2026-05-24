import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSharedSession } from '../../utils/sharedSessions';
import { toolRegistryById } from '../../data/toolRegistry';
import { NavIcon } from '../../navigation/NavIcon';
import { getToolIcon } from '../../navigation/iconRegistry';
import './SharedToolSession.css';

const SharedToolSession = () => {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const session = getSharedSession(shareId);
  const tool = session?.toolId ? toolRegistryById[session.toolId] : null;

  if (!session) {
    return (
      <div className="shared-session">
        <div className="shared-session-card">
          <h1>Session Not Found</h1>
          <p>This shared session link is invalid or has expired.</p>
          <button onClick={() => navigate('/tools')}>Browse Tools</button>
        </div>
      </div>
    );
  }

  return (
    <div className="shared-session">
      <div className="shared-session-card">
        <span className="shared-tag">Local Shared Session</span>
        <h1 className="shared-session-title">
          <span className="shared-session-title-icon" aria-hidden>
            <NavIcon icon={getToolIcon(session.toolId)} size={28} />
          </span>
          <span>{session.toolName || 'Clinical Tool'}</span>
        </h1>
        <p>{session.toolDescription || 'Shared tool session from CareDroid.'}</p>
        <p>
          This link is stored locally in the browser that created it. Export results for
          portable sharing outside this device.
        </p>
        <div className="shared-meta">
          <span>Created: {new Date(session.createdAt).toLocaleString()}</span>
          {session.expiresAt && <span>Expires: {new Date(session.expiresAt).toLocaleDateString()}</span>}
          <span>Tool: {session.toolId}</span>
        </div>
        {session.results && (
          <pre className="shared-session-results">
            {JSON.stringify(session.results, null, 2)}
          </pre>
        )}
        <div className="shared-actions">
          <button onClick={() => navigate('/home')}>Open Home</button>
          {tool && (
            <button onClick={() => navigate(tool.path)}>Open Tool</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SharedToolSession;
