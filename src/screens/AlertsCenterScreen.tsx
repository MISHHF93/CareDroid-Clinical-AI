import React from 'react';
import { AlertsCenterFeature } from '../features/alerts-center/AlertsCenterFeature';
import './screens.css';

export function AlertsCenterScreen() {
  return (
    <div className="cd-panel-screen">
      <AlertsCenterFeature />
    </div>
  );
}
