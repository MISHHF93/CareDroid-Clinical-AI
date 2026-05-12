import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navigation.css';
import { apiFetch } from '../../services/apiClient';
import logger from '../../utils/logger';

/**
 * Breadcrumbs Component
 * 
 * Shows navigation hierarchy (e.g., Home > Chat > Conversation Title)
 * Automatically generated from route location
 * 
 * @param {Array<{label, path}>} breadcrumbs - Manual breadcrumbs (optional)
 */
export const Breadcrumbs = ({ breadcrumbs: customBreadcrumbs }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Auto-generate breadcrumbs from current path
  const defaultBreadcrumbs = (() => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    const crumbs = [{ label: 'Home', path: '/dashboard' }];

    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label = segment
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
      crumbs.push({ label, path: currentPath });
    });

    return crumbs;
  })();

  const breadcrumbs = customBreadcrumbs || defaultBreadcrumbs;

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb navigation">
      <ol className="breadcrumbs-list">
        {breadcrumbs.map((crumb, index) => (
          <li key={index}>
            <button
              className={`breadcrumb-link ${index === breadcrumbs.length - 1 ? 'breadcrumb-active' : ''}`}
              onClick={() => navigate(crumb.path)}
              aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
            >
              {crumb.label}
            </button>
            {index < breadcrumbs.length - 1 && (
              <span className="breadcrumb-separator" aria-hidden="true">
                /
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

/**
 * TabNav Component
 * 
 * Horizontal tab switcher for organizing content sections
 * Used in settings, chat history, etc.
 * 
 * @param {Array<{id, label, icon}>} tabs - Array of tab definitions
 * @param {String} activeTab - Currently active tab ID
 * @param {Function} onTabChange - Callback when tab changes
 */
export const TabNav = ({ tabs, activeTab, onTabChange }) => {
  return (
    <nav className="tab-nav" role="tablist">
      <div className="tab-nav-list">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-nav-btn ${activeTab === tab.id ? 'tab-nav-active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tab-panel-${tab.id}`}
          >
            {tab.icon && <span className="tab-nav-icon">{tab.icon}</span>}
            <span className="tab-nav-label">{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="tab-nav-indicator"></div>
    </nav>
  );
};

/**
 * TabPanel Component
 * 
 * Container for tab content
 * Should be used alongside TabNav
 */
export const TabPanel = ({ id, activeTab, children }) => {
  return (
    <div
      className={`tab-panel ${activeTab === id ? 'tab-panel-active' : ''}`}
      id={`tab-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`tab-${id}`}
      hidden={activeTab !== id}
    >
      {children}
    </div>
  );
};

/**
 * UserMenu Component
 * 
 * Dropdown menu in header with user profile options
 * Shows name, email, role, and action links
 */
export const UserMenu = ({ user = {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('caredroid_access_token')}`,
        },
      });
    } catch (error) {
      logger.error('Logout error', { error });
    }

    localStorage.removeItem('caredroid_access_token');
    localStorage.removeItem('caredroid_user_profile');
    window.location.href = '/auth';
  };

  const menuItems = [
    { id: 'profile', label: 'Profile', icon: '👤', path: '/profile' },
    { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings' },
    { id: 'audit', label: 'Audit Logs', icon: '📋', path: '/audit-logs' },
  ];

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="user-menu" ref={containerRef}>
      {/* Trigger Button */}
      <button
        className="user-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title={`${user.name} (${user.role})`}
      >
        <div className="user-menu-avatar">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} />
          ) : (
            getInitials(user.name || 'User')
          )}
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="user-menu-dropdown" role="menu">
          {/* User Info */}
          <div className="user-menu-header">
            <div className="user-menu-avatar-large">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                getInitials(user.name || 'User')
              )}
            </div>
            <div className="user-menu-info">
              <h4 className="user-menu-name">{user.name || 'User'}</h4>
              <p className="user-menu-email">{user.email}</p>
              <span className="user-menu-role">{user.role || 'User'}</span>
            </div>
          </div>

          <div className="user-menu-divider"></div>

          {/* Menu Items */}
          <div className="user-menu-items">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className="user-menu-item"
                onClick={() => {
                  navigate(item.path);
                  setIsOpen(false);
                }}
                role="menuitem"
              >
                <span className="user-menu-item-icon">{item.icon}</span>
                <span className="user-menu-item-label">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="user-menu-divider"></div>

          {/* Logout Button */}
          <button
            className="user-menu-logout"
            onClick={handleLogout}
            role="menuitem"
          >
            <span className="user-menu-item-icon">🚪</span>
            <span className="user-menu-item-label">Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * MobileNav Component
 * 
 * Collapsible navigation menu for mobile devices
 * Integrated into main header for responsive design
 */
export const MobileNav = ({ navItems, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mobile-nav">
      <button
        className="mobile-nav-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle navigation menu"
        aria-expanded={isOpen}
      >
        <span className="mobile-nav-icon">☰</span>
      </button>

      {isOpen && (
        <nav className="mobile-nav-menu">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={item.path}
              className="mobile-nav-item"
              onClick={(e) => {
                e.preventDefault();
                onNavigate(item.path);
                setIsOpen(false);
              }}
            >
              {item.icon && <span className="mobile-nav-item-icon">{item.icon}</span>}
              <span className="mobile-nav-item-label">{item.label}</span>
            </a>
          ))}
        </nav>
      )}
    </div>
  );
};

/**
 * HeaderNav Component
 * 
 * Main application header with logo, breadcrumbs, notifications, and user menu
 * Combines multiple navigation elements
 */
export const HeaderNav = ({ user, notificationCount = 0, showBreadcrumbs = true }) => {
  const navigate = useNavigate();

  const navItems = [
    { id: 'chat', label: 'Dashboard', path: '/dashboard', icon: '💬' },
    { id: 'profile', label: 'Profile', path: '/profile', icon: '👤' },
    { id: 'team', label: 'Team', path: '/team', icon: '👥' },
    { id: 'settings', label: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  return (
    <header className="header-nav">
      <div className="header-nav-container">
        {/* Logo/Home */}
        <div className="header-nav-logo">
          <button
            className="header-logo-btn"
            onClick={() => navigate('/dashboard')}
            title="CareDroid-Clinical-AI Home"
          >
            <span className="header-logo-icon">🏥</span>
            <span className="header-logo-text">CareDroid-Clinical-AI</span>
          </button>
        </div>

        {/* Desktop Navigation */}
        <nav className="header-nav-desktop">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={item.path}
              className="header-nav-link"
              onClick={(e) => {
                e.preventDefault();
                navigate(item.path);
              }}
            >
              {item.icon && <span>{item.icon}</span>}
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        {/* Right Side - Notifications + User Menu */}
        <div className="header-nav-right">
          <button
            className="header-nav-notifications"
            title={`Notifications ${notificationCount > 0 ? `(${notificationCount} unread)` : ''}`}
          >
            <span className="header-notifications-icon">🔔</span>
            {notificationCount > 0 && (
              <span className="header-notifications-badge">{notificationCount > 9 ? '9+' : notificationCount}</span>
            )}
          </button>
          <UserMenu user={user} />
        </div>

        {/* Mobile Navigation */}
        <MobileNav navItems={navItems} onNavigate={(path) => navigate(path)} />
      </div>

      {/* Breadcrumbs - only show on desktop */}
      {showBreadcrumbs && (
        <div className="header-nav-breadcrumbs">
          <Breadcrumbs />
        </div>
      )}
    </header>
  );
};
