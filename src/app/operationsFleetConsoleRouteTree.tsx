import type { ComponentType, ReactNode } from 'react';
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { OPERATIONS_FLEET_CONSOLE_ROUTES } from '../config/operationsFleetConsoleRoutes';

const lazyRoute = lazyWithRetry;

const HospitalMapDashboardPage = lazyRoute(() => import('../pages/operations/HospitalMapDashboard'));
const MedicalIotDashboardPage = lazyRoute(() => import('../pages/operations/MedicalIotDashboard'));
const DeviceFleetManagementPage = lazyRoute(() => import('../pages/operations/DeviceFleetManagement'));
const OperationsHubPage = lazyRoute(() => import('../pages/operations/Operations'));
const RouteOptimizerPage = lazyRoute(() => import('../pages/fleet/RouteOptimizer'));
const PredictiveMaintenancePage = lazyRoute(() => import('../pages/fleet/PredictiveMaintenance'));
const FleetDashboardPage = lazyRoute(() => import('../pages/fleet/FleetDashboard'));
const FleetLiveMapPage = lazyRoute(() => import('../pages/fleet/FleetLiveMap'));
const LiveTrackingMapPage = lazyRoute(() => import('../pages/operations/LiveTrackingMap'));

const OPERATIONS_FLEET_PAGE_COMPONENTS = Object.freeze({
  hospitalMap: HospitalMapDashboardPage,
  medicalIot: MedicalIotDashboardPage,
  deviceFleet: DeviceFleetManagementPage,
  operationsHub: OperationsHubPage,
  routeOptimizer: RouteOptimizerPage,
  predictiveMaintenance: PredictiveMaintenancePage,
  fleetDashboard: FleetDashboardPage,
  fleetLiveMap: FleetLiveMapPage,
  liveTrackingMap: LiveTrackingMapPage,
} as const);

type LazyRouteProps = {
  children: ReactNode;
  label: string;
};

export function renderOperationsFleetConsoleRoutes(LazyRoute: ComponentType<LazyRouteProps>) {
  return (
    <>
      {OPERATIONS_FLEET_CONSOLE_ROUTES.map((route) => {
        const Page =
          OPERATIONS_FLEET_PAGE_COMPONENTS[
            route.componentKey as keyof typeof OPERATIONS_FLEET_PAGE_COMPONENTS
          ];
        return (
          <Route
            key={route.path}
            path={route.path}
            element={
              <LazyRoute label={`Loading ${route.label}...`}>
                <Page />
              </LazyRoute>
            }
          />
        );
      })}
    </>
  );
}