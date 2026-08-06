# Reception Header & Layout Integration Guide

## Overview

New organized header and layout components have been created to improve the visual structure of the reception workspace. This guide explains how to integrate them.

## New Components Created

### 1. ReceptionHeader Component
**Location:** `src/components/reception/ReceptionHeader.tsx`

A clean, hierarchical header with:
- Top bar: Branding and user info
- Metrics bar: Key statistics (queue size, critical alerts, etc.)
- Situation brief: Current status and next actions
- Action bar: Primary actions and queue navigation tabs

### 2. ReceptionPageLayout Component
**Location:** `src/components/reception/ReceptionPageLayout.tsx`

A structured page layout with:
- Fixed header at top
- Main content area with optional sidebar
- Optional footer for action bars
- Responsive grid and card components

### 3. CSS Files
- `src/pages/emergency/ReceptionWorkspace.new-header.css` - Header styles
- `src/components/reception/ReceptionPageLayout.css` - Layout styles

## Integration Steps

### Step 1: Import New Components

```tsx
import ReceptionHeader, { ReceptionHeaderActionButton } from '../../components/reception/ReceptionHeader';
import ReceptionPageLayout, { 
  ReceptionContentSection, 
  ReceptionCard, 
  ReceptionGrid 
} from '../../components/reception/ReceptionPageLayout';
```

### Step 2: Replace EmergencyRoutePage with ReceptionPageLayout

**Before:**
```tsx
return (
  <EmergencyRoutePage
    surfaceClassName="reception-workspace"
    title={RECEPTION_COPY.workspace.title}
    // ... other props
  >
    {/* content */}
  </EmergencyRoutePage>
);
```

**After:**
```tsx
return (
  <ReceptionPageLayout
    header={
      <ReceptionHeader
        eyebrow={RECEPTION_COPY.workspace.eyebrow}
        title={RECEPTION_COPY.workspace.title}
        userName={currentUserName}
        userRole={emergencyRole.roleLabel || 'Registration Clerk'}
        userStatus={shiftStatus}
        hospitalSite={hospitalSite}
        metrics={[
          {
            label: RECEPTION_COPY.metrics.queueSize,
            value: receptionQueueAll.length,
            tone: 'neutral',
          },
          {
            label: 'Critical',
            value: criticalAlerts.length,
            tone: criticalAlerts.length > 0 ? 'critical' : 'neutral',
          },
        ]}
        situation={{
          status: `${receptionQueueAll.length} patient${receptionQueueAll.length === 1 ? '' : 's'} in reception`,
          attention: criticalAlerts.length
            ? `${criticalAlerts.length} critical alert${criticalAlerts.length === 1 ? '' : 's'}`
            : 'No critical arrivals flagged',
          owner: `${currentUserName} · ${emergencyRole.roleLabel || 'Registration Clerk'}`,
          nextAction: result
            ? RECEPTION_COPY.workspace.registerNext
            : RECEPTION_COPY.workspace.registerWalkIn,
          tone: situationTone,
        }}
        primaryActions={
          <>
            <ReceptionHeaderActionButton
              primary
              onClick={resetForNextPatient}
            >
              Register Walk-In
            </ReceptionHeaderActionButton>
            <ReceptionHeaderActionButton
              onClick={() => setShowChooser(true)}
            >
              Other Arrivals
            </ReceptionHeaderActionButton>
          </>
        }
        queueTabs={[
          {
            id: 'ems',
            label: 'EMS',
            count: filterQueueByTab(receptionQueueAll, 'ems').length,
            active: activeQueueTab === 'ems',
            onClick: () => focusQueueTab('ems'),
          },
          {
            id: 'verification',
            label: 'Verification',
            count: filterQueueByTab(receptionQueueAll, 'verification').length,
            active: activeQueueTab === 'verification',
            onClick: () => focusQueueTab('verification'),
          },
          {
            id: 'pretriage',
            label: 'Pre-Triage',
            count: filterQueueByTab(receptionQueueAll, 'pretriage').length,
            active: activeQueueTab === 'pretriage',
            onClick: () => focusQueueTab('pretriage'),
          },
        ]}
      />
    }
    mainContent={
      <ReceptionContentSection title="Patient Intake">
        <Stepper draft={draft} aiAssist={aiAssist} result={result} />
        <ReceptionCard padding="normal">
          <UnifiedIntakePanel
            draft={draft}
            onDraftChange={updateDraft}
            aiAssist={aiAssist}
            onAiAssistChange={setAiAssist}
            result={result}
            canCreatePatient={canCreatePatient}
            submitting={submitting}
            onSaveDraft={saveDraft}
            onRoute={createAndRoute}
            onReset={resetForNextPatient}
            showQueueRail={false}
          />
        </ReceptionCard>
      </ReceptionContentSection>
    }
    sidebar={
      <ReceptionOperationalRail
        queue={receptionQueue}
        criticalAlerts={criticalAlerts}
        selectedPatient={selectedPatient}
        now={now}
        onSelectPatient={(patientId) => {
          selectPatient(patientId);
          setPatientDetailOpen(true);
        }}
        // ... other props
      />
    }
    footer={
      result && (
        <div className="reception-command-selected">
          <strong>Routed: {patientDisplayName(result.patient)}</strong>
          <button onClick={() => profileNavigate(result.nextRoute)}>
            Continue to triage
          </button>
          <button onClick={resetForNextPatient}>
            {RECEPTION_COPY.workspace.registerNext}
          </button>
        </div>
      )
    }
  />
);
```

## Benefits

1. **Clear Visual Hierarchy**
   - Header is organized into logical sections
   - Metrics are prominently displayed
   - Actions are grouped logically

2. **Better Responsive Design**
   - Header adapts to different screen sizes
   - Sidebar moves below content on mobile
   - Actions stack vertically on small screens

3. **Consistent Styling**
   - All components use the radical light theme
   - Minimal borders and shadows
   - Clean white backgrounds

4. **Improved Maintainability**
   - Separated concerns (header, layout, content)
   - Reusable components
   - Easy to modify individual sections

## Next Steps

1. Update `ReceptionWorkspace.tsx` to use new components
2. Test on different screen sizes
3. Verify all functionality works correctly
4. Remove old header code once migration is complete

## Notes

- The new header is sticky and stays at the top when scrolling
- The sidebar is also sticky on desktop views
- All existing functionality is preserved
- The radical light theme is maintained throughout
