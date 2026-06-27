import React from 'react';
import { CopilotFeature } from '../features/copilot/CopilotFeature';
import './screens.css';

export function CopilotScreen() {
  return (
    <div className="cd-panel-screen">
      <CopilotFeature />
    </div>
  );
}
