/**
 * Drop-in route block for the new architecture screens.
 *
 * Usage inside src/app/router.tsx AppRoutes():
 *   import { NewScreenRoutes } from '../screens/NewScreenRoutes';
 *   ...
 *   <Routes>
 *     ...existing routes...
 *     <NewScreenRoutes />
 *   </Routes>
 *
 * All routes use the /v2/ prefix so they live alongside existing routes
 * without conflict. Swap individual routes to the canonical paths once
 * the new screen is validated.
 */
import React, { Suspense, lazy } from 'react';
import { Route } from 'react-router-dom';

const WhiteboardScreen    = lazy(() => import('./WhiteboardScreen').then((m) => ({ default: m.WhiteboardScreen })));
const TriageQueueScreen   = lazy(() => import('./TriageQueueScreen').then((m) => ({ default: m.TriageQueueScreen })));
const PatientDetailScreen = lazy(() => import('./PatientDetailScreen').then((m) => ({ default: m.PatientDetailScreen })));
const EmsScreen           = lazy(() => import('./EmsScreen').then((m) => ({ default: m.EmsScreen })));
const CopilotScreen       = lazy(() => import('./CopilotScreen').then((m) => ({ default: m.CopilotScreen })));
const CapacityScreen      = lazy(() => import('./CapacityScreen').then((m) => ({ default: m.CapacityScreen })));
const AlertsCenterScreen  = lazy(() => import('./AlertsCenterScreen').then((m) => ({ default: m.AlertsCenterScreen })));

function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--cd-text-disabled)', fontSize: 'var(--cd-text-sm)' }}>
      Loading…
    </div>
  );
}

export function NewScreenRoutes() {
  return (
    <>
      <Route path="/v2/whiteboard"         element={<Suspense fallback={<Loading />}><WhiteboardScreen /></Suspense>} />
      <Route path="/v2/queues"             element={<Suspense fallback={<Loading />}><TriageQueueScreen /></Suspense>} />
      <Route path="/v2/patients/:patientId" element={<Suspense fallback={<Loading />}><PatientDetailScreen /></Suspense>} />
      <Route path="/v2/ems"                element={<Suspense fallback={<Loading />}><EmsScreen /></Suspense>} />
      <Route path="/v2/copilot"            element={<Suspense fallback={<Loading />}><CopilotScreen /></Suspense>} />
      <Route path="/v2/capacity"           element={<Suspense fallback={<Loading />}><CapacityScreen /></Suspense>} />
      <Route path="/v2/alerts"             element={<Suspense fallback={<Loading />}><AlertsCenterScreen /></Suspense>} />
    </>
  );
}
