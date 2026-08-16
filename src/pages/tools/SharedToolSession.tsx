import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import useProfileNavigate from '../../hooks/useProfileNavigate';
import { getSharedSession } from '../../utils/sharedSessions';
import { toolRegistryById } from '../../data/toolRegistry';
import { NavIcon } from '../../navigation/NavIcon';
import { getToolIcon } from '../../navigation/iconRegistry';
import './SharedToolSession.css';

const SharedToolSession = () => {
  const { shareId } = useParams();
  const { profileNavigate } = useProfileNavigate();
  // HEAL-224: getSharedSession() isn't a pure read -- once a session is
  // past its expiresAt, it deletes the entry and persists the trimmed
  // object back to localStorage as a side effect. Calling it directly in
  // the render body ran that write on every render (including renders
  // React can discard before committing, e.g. Strict Mode's dev
  // double-invoke or a concurrent render that never lands), permanently
  // destroying a valid shared session's localStorage entry for a screen
  // the user may never have actually seen change. Moving the read into
  // useEffect means it only runs once per shareId, after a render has
  // actually committed, and an unrelated ancestor re-render can no
  // longer silently re-trigger it either.
  const [session, setSession] = useState<any>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setSession(getSharedSession(shareId));
    setChecked(true);
  }, [shareId]);

  const tool = session?.toolId ? toolRegistryById[session.toolId] : null;

  if (!checked) {
    return null;
  }

  if (!session) {
    return (
      <div className="shared-session">
        <div className="shared-session-card">
          <h1>Session Not Found</h1>
          <p>This shared session link is invalid or has expired.</p>
          <button type="button" onClick={() => profileNavigate('/tools')}>Browse Tools</button>
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
          <button type="button" onClick={() => profileNavigate('/dashboard')}>Open Dashboard</button>
          {tool && (
            <button type="button" onClick={() => profileNavigate(tool.path)}>Open Tool</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SharedToolSession;
