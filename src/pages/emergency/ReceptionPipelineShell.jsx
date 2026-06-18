import React from 'react';
import { RECEPTION_PIPELINE_STAGES } from '../../config/emergencyPipelineModel';
import './ReceptionPipelineShell.css';

export default function ReceptionPipelineShell({
  activeStage,
  onStageChange,
  showStageRail = true,
  children,
}) {
  if (!showStageRail) {
    return <div className="reception-pipeline-shell">{children}</div>;
  }

  return (
    <div className="reception-pipeline-shell">
      <nav className="reception-pipeline-shell__rail" aria-label="Reception workflow stages">
        {RECEPTION_PIPELINE_STAGES.map((stage) => {
          const active = stage.id === activeStage;
          const label = stage.label;
          return (
            <button
              key={stage.id}
              type="button"
              className={[
                'reception-pipeline-shell__stage',
                active ? 'reception-pipeline-shell__stage--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={active ? 'step' : undefined}
              onClick={() => onStageChange?.(stage.id)}
            >
              {label}
            </button>
          );
        })}
      </nav>
      <div className="reception-pipeline-shell__panel">{children}</div>
    </div>
  );
}
