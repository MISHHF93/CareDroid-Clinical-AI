import React from 'react';
import { RECEPTION_PIPELINE_STAGES, RECEPTION_PIPELINE_STAGE } from '../../config/emergencyPipelineModel';
import './ReceptionPipelineShell.css';

type ReceptionPipelineStageId = typeof RECEPTION_PIPELINE_STAGE[keyof typeof RECEPTION_PIPELINE_STAGE];

type ReceptionPipelineShellProps = {
  activeStage?: ReceptionPipelineStageId;
  onStageChange?: (stage: ReceptionPipelineStageId) => void;
  showStageRail?: boolean;
  children: React.ReactNode;
};

export default function ReceptionPipelineShell({
  activeStage,
  onStageChange,
  showStageRail = true,
  children,
}: ReceptionPipelineShellProps) {
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
              {...(active ? { 'aria-current': 'step' as const } : {})}
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
