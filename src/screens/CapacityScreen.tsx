import React from 'react';
import { CapacityFeature } from '../features/capacity/CapacityFeature';
import './screens.css';

export function CapacityScreen() {
  return (
    <div className="cd-screen">
      <div className="cd-screen__header">
        <span className="cd-screen__title">Capacity Dashboard</span>
      </div>
      <div className="cd-screen__body" style={{ overflowY: 'auto' }}>
        <CapacityFeature />
      </div>
    </div>
  );
}
