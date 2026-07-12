import React from 'react';
import {
  Ambulance,
  BadgeCheck,
  ClipboardPlus,
  Pin,
  ScanLine,
  ShieldAlert,
  Stethoscope,
  UserRoundPlus,
} from 'lucide-react';
import useReceptionPinnedActions from '../../hooks/useReceptionPinnedActions';
import { RECEPTION_COPY } from './receptionCopy';
import type { ReceptionJourneyStage } from './ReceptionJourneyTimeline';
import './ReceptionDeskToolbar.css';

type QueueTabId = 'ems' | 'verification' | 'pretriage';

/**
 * Front-desk command strip — three logical groups:
 *  1. Primary Actions (register, verify, arrivals, escalate)
 *  2. Operational Filters (queue focus tabs with pin)
 *  3. Patient Flow Status (stage counts with avg wait)
 */
export default function ReceptionDeskToolbar({
  canCreatePatient = false,
  canVerifyIntake = false,
  canEscalateToNurse = false,
  canOpenPrepareChooser = false,
  canOpenSmartIntake = false,
  activeQueueTab = 'ems',
  journeyStages = [],
  onRegisterWalkIn,
  onCheckIdentity,
  onOtherArrivals,
  onEscalate,
  onFocusEms,
  onFocusVerification,
  onFocusPretriage,
  onSelectStage,
  className = '',
}: {
  canCreatePatient?: boolean;
  canVerifyIntake?: boolean;
  canEscalateToNurse?: boolean;
  canOpenPrepareChooser?: boolean;
  canOpenSmartIntake?: boolean;
  activeQueueTab?: QueueTabId;
  journeyStages?: ReceptionJourneyStage[];
  onRegisterWalkIn?: () => void;
  onCheckIdentity?: () => void;
  onOtherArrivals?: () => void;
  onEscalate?: () => void;
  onFocusEms?: () => void;
  onFocusVerification?: () => void;
  onFocusPretriage?: () => void;
  onSelectStage?: (queueTab: string) => void;
  className?: string;
}) {
  const { pinnedQueueTab, togglePinnedQueueTab } = useReceptionPinnedActions();

  const queueTabs: {
    id: QueueTabId;
    label: string;
    onClick?: () => void;
    icon: typeof Ambulance;
  }[] = [
    { id: 'ems', label: RECEPTION_COPY.queues.tabs.ems, onClick: onFocusEms, icon: Ambulance },
    {
      id: 'verification',
      label: RECEPTION_COPY.queues.tabs.verification,
      onClick: onFocusVerification,
      icon: BadgeCheck,
    },
    {
      id: 'pretriage',
      label: RECEPTION_COPY.queues.tabs.pretriage,
      onClick: onFocusPretriage,
      icon: Stethoscope,
    },
  ];

  return (
    <div
      className={['reception-desk-toolbar', className].filter(Boolean).join(' ')}
      aria-label="Registration desk command strip"
    >
      {/* ── Group 1: Primary Actions ──────────────────────────── */}
      <section
        className="reception-desk-toolbar__group"
        role="group"
        aria-labelledby="reception-toolbar-actions-label"
      >
        <div className="reception-desk-toolbar__group-header">
          <span className="reception-desk-toolbar__section-label" id="reception-toolbar-actions-label">
            Primary Actions
          </span>
          <strong className="reception-desk-toolbar__section-title">
            Choose the next arrival action
          </strong>
        </div>
        <div className="reception-desk-toolbar__actions">
          {canCreatePatient ? (
            <button
              type="button"
              className="reception-desk-toolbar__action reception-desk-toolbar__action--primary"
              onClick={onRegisterWalkIn}
            >
              <span className="reception-desk-toolbar__action-icon" aria-hidden="true">
                <UserRoundPlus size={20} />
              </span>
              <span className="reception-desk-toolbar__action-copy">
                <strong>{RECEPTION_COPY.workspace.registerWalkIn}</strong>
                <small>Start a new arrival record</small>
              </span>
            </button>
          ) : null}
          {canVerifyIntake ? (
            <button
              type="button"
              className="reception-desk-toolbar__action"
              onClick={onCheckIdentity}
              disabled={!canOpenSmartIntake}
            >
              <span className="reception-desk-toolbar__action-icon" aria-hidden="true">
                <ScanLine size={20} />
              </span>
              <span className="reception-desk-toolbar__action-copy">
                <strong>{RECEPTION_COPY.workspace.checkIdentity}</strong>
                <small>Scan or confirm patient identity</small>
              </span>
            </button>
          ) : null}
          {canOpenPrepareChooser ? (
            <button
              type="button"
              className="reception-desk-toolbar__action"
              onClick={onOtherArrivals}
            >
              <span className="reception-desk-toolbar__action-icon" aria-hidden="true">
                <ClipboardPlus size={20} />
              </span>
              <span className="reception-desk-toolbar__action-copy">
                <strong>{RECEPTION_COPY.workspace.otherArrivals}</strong>
                <small>EMS, transfer, or unknown patient</small>
              </span>
            </button>
          ) : null}
          {canEscalateToNurse ? (
            <button
              type="button"
              className="reception-desk-toolbar__action reception-desk-toolbar__action--escalate"
              onClick={onEscalate}
            >
              <span className="reception-desk-toolbar__action-icon" aria-hidden="true">
                <ShieldAlert size={20} />
              </span>
              <span className="reception-desk-toolbar__action-copy">
                <strong>{RECEPTION_COPY.escalation.openAction}</strong>
                <small>Send directly to the nursing team</small>
              </span>
            </button>
          ) : null}
        </div>
      </section>

      {/* ── Group 2: Operational Filters ──────────────────────── */}
      <section
        className="reception-desk-toolbar__group"
        role="group"
        aria-labelledby="reception-toolbar-filters-label"
      >
        <div className="reception-desk-toolbar__group-header">
          <span className="reception-desk-toolbar__section-label" id="reception-toolbar-filters-label">
            Operational Filters
          </span>
        </div>
        <div className="reception-desk-toolbar__filter-row">
          <div className="reception-desk-toolbar__queues" role="tablist" aria-label="Waiting lists">
            {queueTabs.map((tab) => {
              const Icon = tab.icon;
              const isPinned = pinnedQueueTab === tab.id;
              const isActive = activeQueueTab === tab.id;
              return (
                <span key={tab.id} className="reception-desk-toolbar__queue-tab-wrap">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive ? 'true' : 'false'}
                    className={[
                      'reception-desk-toolbar__queue-tab',
                      isActive ? 'reception-desk-toolbar__action--active' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={tab.onClick}
                  >
                    <Icon size={15} aria-hidden="true" />
                    {tab.label}
                  </button>
                  <button
                    type="button"
                    className={[
                      'reception-desk-toolbar__pin',
                      isPinned ? 'reception-desk-toolbar__pin--active' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-pressed={isPinned ? 'true' : 'false'}
                    aria-label={
                      isPinned
                        ? `Unpin ${tab.label} as default list`
                        : `Pin ${tab.label} as default list`
                    }
                    title={
                      isPinned
                        ? 'Pinned as default list on open'
                        : 'Pin as default list on open'
                    }
                    onClick={() => togglePinnedQueueTab(tab.id)}
                  >
                    <Pin size={13} aria-hidden="true" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Group 3: Patient Flow Status ──────────────────────── */}
      {journeyStages.length > 0 ? (
        <section
          className="reception-desk-toolbar__group"
          role="group"
          aria-labelledby="reception-toolbar-flow-label"
        >
          <div className="reception-desk-toolbar__group-header">
            <span className="reception-desk-toolbar__section-label" id="reception-toolbar-flow-label">
              Patient Flow Status
            </span>
          </div>
          <div className="reception-desk-toolbar__flow-row" aria-label="Patient flow stages">
            {journeyStages.map((stage) => {
              const clickable = Boolean(stage.queueTab && onSelectStage);
              const isActive =
                Boolean(stage.queueTab) && stage.queueTab === activeQueueTab;
              const Element = clickable ? 'button' : 'div';

              return (
                <Element
                  key={stage.id}
                  type={clickable ? 'button' : undefined}
                  className={[
                    'reception-desk-toolbar__flow-step',
                    `reception-desk-toolbar__flow-step--${stage.tone}`,
                    isActive ? 'reception-desk-toolbar__flow-step--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  {...(isActive ? { 'aria-current': 'step' as const } : {})}
                  onClick={
                    clickable
                      ? () => onSelectStage?.(stage.queueTab as string)
                      : undefined
                  }
                >
                  <span className="reception-desk-toolbar__flow-label">
                    {stage.label}
                  </span>
                  <span className="reception-desk-toolbar__flow-count" aria-live="polite">
                    {stage.count}
                  </span>
                  <span className="reception-desk-toolbar__flow-meta">
                    {stage.avgWaitMinutes != null
                      ? `Avg wait ${stage.avgWaitMinutes}m`
                      : 'Not yet waiting'}
                    {stage.badge ? (
                      <strong className="reception-desk-toolbar__flow-badge">
                        {stage.badge}
                      </strong>
                    ) : null}
                  </span>
                </Element>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
