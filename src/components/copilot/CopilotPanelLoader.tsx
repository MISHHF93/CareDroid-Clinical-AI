import { Spinner } from '../ui/Spinner';
import './copilot-shell.css';

export default function CopilotPanelLoader() {
  return (
    <aside
      className="ed-copilot-panel ed-copilot-panel--loading"
      aria-label="Loading CareDroid Copilot"
    >
      <div className="ed-copilot-shell">
        <header className="ed-copilot-panel__header">
          <span aria-hidden className="ed-copilot-panel__live-dot" />
          <div className="ed-copilot-panel__identity">
            <span>CareDroid Copilot</span>
            {/* Spinner renders a <div> internally -- <strong> is phrasing
                content only, so div is the valid wrapper here. */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
              <Spinner size="sm" />
              Loading…
            </div>
          </div>
        </header>
        <div className="ed-copilot-panel__messages" role="status">
          <p className="ed-copilot-panel__policy">Preparing chat, context, and safety layers…</p>
        </div>
      </div>
    </aside>
  );
}
