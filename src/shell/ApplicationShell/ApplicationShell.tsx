/**
 * ApplicationShell — Canonical Layout Component
 *
 * The single source of truth for the application layout.
 * Every authenticated page renders inside this shell.
 *
 * Architecture:
 * - Sidebar (role-filtered navigation)
 * - Main column:
 *   - ApplicationHeader (global platform controls)
 *   - WorkspaceHeader (role-specific context)
 *   - Optional PageCommandBar (page title, breadcrumbs, actions)
 *   - Content (sole scrollport)
 * - Mobile bottom navigation (replaces sidebar on mobile)
 * - Overlay anchor (modals, drawers, popovers render here)
 * - Skip link (accessibility)
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './shell.css';

import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import useRouteScreenMode from '../../hooks/useRouteScreenMode';
import { useScreenModeCapabilities } from '../../hooks/useScreenModeCapabilities';
import { useEmergencyStore } from '../../store/emergencyStore';
import { getVisibleNavigation } from '../../config/unified-navigation.config';
import { getRouteMetadata } from '../../config/routeMetadata';
import { Sidebar } from '../../components/Sidebar';
import { MobileNavigation } from '../MobileNavigation/MobileNavigation';

export interface ApplicationShellProps {
  children: React.ReactNode;
}

export function ApplicationShell({ children }: ApplicationShellProps) {
  const location = useLocation();
  const emergencyRole = useEmergencyRolePermissions();
  const screenMode = useRouteScreenMode();
  const capabilities = useScreenModeCapabilities();
  const patients = useEmergencyStore((s) => s.patients);
  const contentRef = useRef<HTMLDivElement>(null);

  // Resolve navigation items for current role
  const navigationItems = useMemo(() => {
    return getVisibleNavigation(emergencyRole.role, {
      saasRole: emergencyRole.canonicalProfile?.saasRole,
      compiledProfile: emergencyRole.canonicalProfile,
    });
  }, [emergencyRole.role, emergencyRole.canonicalProfile]);

  // Resolve route metadata for current path
  const routeMetadata = useMemo(() => {
    return getRouteMetadata(location.pathname);
  }, [location.pathname]);

  // Determine density class
  const densityClass = capabilities.headerDensity === 'compact' ? 'shell--compact' : '';

  return (
    <div className={`shell ${densityClass}`}>
      {/* Skip link for keyboard navigation */}
      <a href="#shell-content" className="shell__skip-link">
        Skip to content
      </a>

      {/* Sidebar navigation */}
      <Sidebar navigationItems={navigationItems} />

      {/* Main column */}
      <div className="shell__main">
        {/* Application header — global platform controls */}
        <div className="shell__header" role="banner" aria-label="Application header">
          {/* Brand */}
          <div className="shell__header-brand">
            <img src="/logo.svg" alt="" aria-hidden="true" width="28" height="28" />
            <span className="shell__header-brand-text">CareDroid</span>
          </div>

          {/* Facility selector */}
          <div className="shell__header-facility">
            {emergencyRole.canonicalProfile?.hospitalSite || 'Virtual City Hospital'}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Global search */}
          <button
            type="button"
            className="shell__header-search"
            aria-label="Search (Ctrl+K)"
          >
            <span aria-hidden="true">🔍</span>
            <span>Search</span>
            <kbd>⌘K</kbd>
          </button>

          {/* System health */}
          <div className="shell__header-health" aria-label="System health: connected">
            <span className="shell__header-health-dot" aria-hidden="true" />
          </div>

          {/* Notifications */}
          <button
            type="button"
            className="shell__header-notifications"
            aria-label="Notifications"
          >
            <span aria-hidden="true">🔔</span>
          </button>

          {/* Help */}
          <button
            type="button"
            className="shell__header-help"
            aria-label="Help"
          >
            <span aria-hidden="true">?</span>
          </button>

          {/* User menu */}
          <button
            type="button"
            className="shell__header-user"
            aria-label={`User menu: ${emergencyRole.canonicalProfile?.preferredName || 'User'}`}
          >
            <span className="shell__header-user-avatar" aria-hidden="true">
              {(emergencyRole.canonicalProfile?.preferredName || 'U').charAt(0)}
            </span>
          </button>
        </div>

        {/* Workspace header — role-specific context */}
        <div className="shell__workspace" role="region" aria-label="Workspace context">
          {/* Role indicator */}
          <div className="shell__workspace-role">
            <span className="shell__workspace-role-name">
              {emergencyRole.roleLabel || 'Emergency'}
            </span>
          </div>

          {/* Workspace navigation tabs */}
          <nav className="shell__workspace-nav" aria-label="Workspace navigation">
            {/* Role-specific navigation items rendered here */}
          </nav>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Quick actions */}
          <div className="shell__workspace-actions">
            {/* Permission-aware quick actions rendered here */}
          </div>
        </div>

        {/* Page content — sole scrollport */}
        <div
          id="shell-content"
          ref={contentRef}
          className="shell__content"
          role="main"
          aria-label={routeMetadata?.title || 'Page content'}
        >
          <div className="shell__content-inner">
            {children}
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNavigation navigationItems={navigationItems} />

      {/* Overlay anchor for modals, drawers, popovers */}
      <div className="shell__overlay-anchor" aria-live="polite" />
    </div>
  );
}

export default ApplicationShell;
