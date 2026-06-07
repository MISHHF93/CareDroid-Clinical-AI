import { useMemo, useState } from 'react';
import CrossModuleLinkPanel from '../components/CrossModuleLinkPanel';
import StateSourceNotice from '../components/StateSourceNotice';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import { DEMO_LIVE_STATES } from '../utils/demoLiveState';
import './SimulationLaboratoryViewer.css';

const MODELS = Object.freeze([
  {
    id: 'thorax-anatomy',
    name: 'Thorax Anatomy Placeholder',
    type: 'Anatomy',
    status: 'Demo placeholder',
    notes: 'No GLB/GLTF asset is imported. This panel is safe for Vercel builds.',
  },
  {
    id: 'cardiac-model',
    name: 'Cardiac Model Placeholder',
    type: 'Organ',
    status: 'Demo placeholder',
    notes: 'Use a committed model asset or remote viewer service before enabling real 3D loading.',
  },
  {
    id: 'radiology-volume',
    name: 'Radiology Volume Placeholder',
    type: 'DICOM/Volume',
    status: 'Not connected',
    notes: 'No DICOM renderer is present in the current dependencies.',
  },
]);

export default function Medical3DViewer() {
  const [activeModelId, setActiveModelId] = useState(MODELS[0].id);
  const [rotation, setRotation] = useState(28);
  const activeModel = useMemo(
    () => MODELS.find((model) => model.id === activeModelId) || MODELS[0],
    [activeModelId]
  );

  return (
    <main className="ops-demo-page medical-viewer-page">
      <section className="ops-demo-hero" aria-labelledby="viewer-title">
        <div className="ops-demo-hero__icon" aria-hidden>
          <NavIcon icon={CHROME_ICONS.artifacts} size={34} />
        </div>
        <div>
          <p className="ops-demo-eyebrow">Demo 3D viewer - No diagnostic imaging</p>
          <h1 id="viewer-title">3D Viewer</h1>
          <p>
            A safe model viewer shell for anatomy, organ, and radiology-volume workflows. The current
            codebase has no Three.js dependency or committed GLB/GLTF/DICOM assets, so this route uses
            a build-safe placeholder canvas.
          </p>
        </div>
        <span className="ops-demo-badge ops-demo-badge--warning">Asset-safe fallback</span>
      </section>

      <StateSourceNotice
        title="3D viewer source states"
        states={[
          DEMO_LIVE_STATES.DEMO,
          DEMO_LIVE_STATES.MOCK,
          DEMO_LIVE_STATES.BACKEND_UNAVAILABLE,
          DEMO_LIVE_STATES.UNSUPPORTED,
        ]}
        details="The canvas uses mock placeholder geometry only. No live imaging, DICOM renderer, GLB/GLTF asset manifest, or remote model service is connected; diagnostic image viewing and patient-specific model loading are unsupported."
      />

      <CrossModuleLinkPanel
        moduleId="medical-3d-viewer"
        title="3D Viewer connects back to simulation and lab context"
        description="Anatomy and model review stays linked to the training and diagnostic modules that explain why the viewer was opened."
      />

      <section className="ops-demo-layout ops-demo-layout--viewer">
        <div className="ops-demo-panel">
          <div className="ops-demo-panel__header">
            <div>
              <p className="ops-demo-eyebrow">Model canvas</p>
              <h2>{activeModel.name}</h2>
            </div>
            <span className="ops-demo-badge">{activeModel.status}</span>
          </div>
          <div className="medical-viewer-canvas" aria-label="Demo medical model canvas">
            <div className="medical-viewer-grid" aria-hidden />
            <div
              className="medical-viewer-model"
              style={{ transform: `rotateX(58deg) rotateZ(${rotation}deg)` }}
              aria-hidden
            >
              <span className="medical-viewer-model__core" />
              <span className="medical-viewer-model__orbit medical-viewer-model__orbit--one" />
              <span className="medical-viewer-model__orbit medical-viewer-model__orbit--two" />
            </div>
            <div className="medical-viewer-fallback">
              <strong>Fallback state active</strong>
              <span>No external model asset loaded.</span>
            </div>
          </div>
          <label className="ops-demo-range">
            Rotate placeholder model
            <input
              type="range"
              min="0"
              max="360"
              value={rotation}
              onChange={(event) => setRotation(Number(event.target.value))}
            />
          </label>
        </div>

        <aside className="ops-demo-panel">
          <div className="ops-demo-panel__header">
            <div>
              <p className="ops-demo-eyebrow">Model selector</p>
              <h2>Viewer sources</h2>
            </div>
          </div>
          <div className="ops-demo-stack">
            {MODELS.map((model) => (
              <button
                key={model.id}
                type="button"
                className={`ops-demo-select-card${model.id === activeModelId ? ' is-active' : ''}`}
                onClick={() => setActiveModelId(model.id)}
              >
                <strong>{model.name}</strong>
                <span>{model.type}</span>
                <small>{model.status}</small>
              </button>
            ))}
          </div>
          <div className="ops-demo-debrief">
            <strong>3D asset safety notes</strong>
            <p>{activeModel.notes}</p>
            <p>
              This page intentionally avoids importing missing local model files. Add a committed asset
              manifest or remote model service before enabling real rotate/zoom controls.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
