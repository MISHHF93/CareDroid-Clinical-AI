import React from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import {
  resolveEmergencySurfacePath,
  shouldRedirectEmergencySurface,
} from '../../services/navigateToEmergencySurface';
import { readPatientRouteContext } from '../../utils/receptionQueryParams';

export { shouldRedirectEmergencySurface };

export default function EmergencySurfaceRedirect({ surfaceId, children }) {
  const emergencyRole = useEmergencyRolePermissions();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  if (!shouldRedirectEmergencySurface(surfaceId, emergencyRole.role)) {
    return children;
  }

  const { contextPatientId, queuePatientId } = readPatientRouteContext(searchParams);
  const target = resolveEmergencySurfacePath(surfaceId, {
    role: emergencyRole.role,
    patientId: contextPatientId || queuePatientId || undefined,
    query: searchParams.get('q') || searchParams.get('patientSearch') || undefined,
    queue: searchParams.get('queue') || 'pretriage',
    intakeOptions: {
      step: searchParams.get('step') || undefined,
      mode: searchParams.get('mode') || undefined,
      patientId: contextPatientId || undefined,
      emsArrivalId: searchParams.get('emsArrivalId') || undefined,
    },
    resetReceptionQuery: false,
  });

  const current = `${location.pathname}${location.search}`;
  if (target === location.pathname || target === current) {
    return children;
  }

  return <Navigate to={target} replace />;
}
