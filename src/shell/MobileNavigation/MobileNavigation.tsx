/**
 * MobileNavigation Component
 *
 * Bottom navigation bar for mobile devices (< 768px).
 * Replaces the sidebar on mobile with a compact tab bar.
 *
 * Shows the top 5 navigation items as icons with labels.
 * A "More" button opens a bottom sheet with remaining items.
 */

import React, { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { NavigationItem } from '../../config/unified-navigation.config';

export interface MobileNavigationProps {
  navigationItems: readonly NavigationItem[];
  className?: string;
}

export function MobileNavigation({ navigationItems, className }: MobileNavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  // Show top 5 items in the bar, rest in "More"
  const primaryItems = navigationItems.slice(0, 5);
  const secondaryItems = navigationItems.slice(5);

  const handleNavClick = useCallback((path: string) => {
    navigate(path);
    setMoreOpen(false);
  }, [navigate]);

  return (
    <nav
      className={`shell__mobile-nav ${className || ''}`}
      aria-label="Mobile navigation"
      role="navigation"
    >
      {primaryItems.map((item) => {
        const isActive = location.pathname === item.path ||
          location.pathname.startsWith(item.path + '/');
        return (
          <button
            key={item.id}
            type="button"
            className={`shell__mobile-nav-item ${isActive ? 'shell__mobile-nav-item--active' : ''}`}
            onClick={() => handleNavClick(item.path)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
          >
            <span className="shell__mobile-nav-icon" aria-hidden="true">
              {item.icon || '📄'}
            </span>
            <span className="shell__mobile-nav-label">
              {item.label}
            </span>
          </button>
        );
      })}

      {secondaryItems.length > 0 && (
        <>
          <button
            type="button"
            className="shell__mobile-nav-item shell__mobile-nav-item--more"
            onClick={() => setMoreOpen(!moreOpen)}
            aria-expanded={moreOpen}
            aria-label="More navigation"
          >
            <span className="shell__mobile-nav-icon" aria-hidden="true">
              ⋯
            </span>
            <span className="shell__mobile-nav-label">
              More
            </span>
          </button>

          {moreOpen && (
            <div className="shell__mobile-nav-more" role="dialog" aria-label="More navigation">
              {secondaryItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`shell__mobile-nav-more-item ${isActive ? 'shell__mobile-nav-more-item--active' : ''}`}
                    onClick={() => handleNavClick(item.path)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span aria-hidden="true">{item.icon || '📄'}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </nav>
  );
}

export default MobileNavigation;
