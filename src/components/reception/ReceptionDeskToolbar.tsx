import React from 'react';
import { RECEPTION_COPY } from './receptionCopy';
import './ReceptionDeskToolbar.css';

/**
 * Front-desk action strip — register, verify, arrivals, escalate.
 */
export default function ReceptionDeskToolbar({
  canCreatePatient = false,
  canVerifyIntake = false,
  canEscalateToNurse = false,
  canOpenPrepareChooser = false,
  canOpenSmartIntake = false,
  activeQueueTab = 'ems',
  onRegisterWalkIn,
  onCheckIdentity,
  onOtherArrivals,
  onEscalate,
  onFocusEms,
  onFocusVerification,
  onFocusPretriage,
  className = '',
}) {
  const queueTabs = [
    { id: 'ems', label: RECEPTION_COPY.queues.tabs.ems, onClick: onFocusEms },
    { id: 'verification', label: RECEPTION_COPY.queues.tabs.verification, onClick: onFocusVerification },
    { id: 'pretriage', label: RECEPTION_COPY.queues.tabs.pretriage, onClick: onFocusPretriage },
  ];

  return (
    <section
      className={['reception-desk-toolbar', className].filter(Boolean).join(' ')}
      aria-label="Registration desk actions"
    >
      <div className="reception-desk-toolbar__actions">
        {canCreatePatient ? (
          <button
            type="button"
            className="reception-desk-toolbar__action reception-desk-toolbar__action--primary"
            onClick={onRegisterWalkIn}
          >
            {RECEPTION_COPY.workspace.registerWalkIn}
          </button>
        ) : null}
        {canVerifyIntake ? (
          <button
            type="button"
            className="reception-desk-toolbar__action"
            onClick={onCheckIdentity}
            disabled={!canOpenSmartIntake}
          >
            {RECEPTION_COPY.workspace.checkIdentity}
          </button>
        ) : null}
        {canOpenPrepareChooser ? (
          <button type="button" className="reception-desk-toolbar__action" onClick={onOtherArrivals}>
            {RECEPTION_COPY.workspace.otherArrivals}
          </button>
        ) : null}
        {canEscalateToNurse ? (
          <button
            type="button"
            className="reception-desk-toolbar__action reception-desk-toolbar__action--escalate"
            onClick={onEscalate}
          >
            {RECEPTION_COPY.escalation.openAction}
          </button>
        ) : null}
      </div>
      <div className="reception-desk-toolbar__queues" role="tablist" aria-label="Waiting lists">
        {queueTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            {...((activeQueueTab === tab.id) ? { 'aria-selected': 'true' as const } : { 'aria-selected': 'false' as const })}
            className={[
              'reception-desk-toolbar__queue-tab',
              activeQueueTab === tab.id ? 'reception-desk-toolbar__action--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={tab.onClick}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </section>
  );
}