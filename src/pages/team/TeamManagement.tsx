import { useState, useEffect } from 'react';
import './TeamManagement.css';
import { apiFetch, apiFetchJson, getStoredAccessToken } from '../../services/apiClient';
import {
  isBackendCapabilityEnabled,
  UNSUPPORTED_CAPABILITY_MESSAGE,
} from '../../config/backendApiCapabilities';
import { makeDisabledCapabilityResponse } from '../../services/disabledBackendMocks';
import { reportApiError } from '../../services/apiErrorHandling';

/**
 * TeamManagement Page Component
 *
 * Full page for managing team members, roles, and permissions
 * Located at /team
 */
export const TeamManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const teamApiEnabled = isBackendCapabilityEnabled('teamManagement');

  const requireTeamApi = () => {
    if (teamApiEnabled) return true;
    const fallback = makeDisabledCapabilityResponse('teamManagement', '/api/team/users', {
      users: [],
    } as any);
    setError(UNSUPPORTED_CAPABILITY_MESSAGE);
    reportApiError({
      title: 'Team management unavailable',
      message: fallback.message,
      endpoint: fallback.endpoint,
    });
    return false;
  };

  const fetchUsers = async () => {
    if (!teamApiEnabled) {
      const fallback = makeDisabledCapabilityResponse('teamManagement', '/api/team/users', {
        users: [],
      } as any);
      setLoading(false);
      setError(UNSUPPORTED_CAPABILITY_MESSAGE);
      setUsers([]);
      reportApiError({
        title: 'Team users API unavailable',
        message: fallback.message,
        endpoint: fallback.endpoint,
      });
      return;
    }

    try {
      setLoading(true);
      const { response, data } = await apiFetchJson('/api/team/users', {
        headers: {
          'Authorization': `Bearer ${getStoredAccessToken() || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to fetch users');
      }
      setUsers(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      reportApiError({
        title: 'Team users load failed',
        message: err.message,
        error: err,
        endpoint: '/api/team/users',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (typeof aValue === 'string') {
      return sortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleEditUser = (user) => {
    if (!requireTeamApi()) return;
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleSaveUser = async (updatedUser) => {
    if (!requireTeamApi()) return;

    try {
      const response = await apiFetch(`/api/team/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getStoredAccessToken() || ''}`,
        },
        body: JSON.stringify(updatedUser),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      setUsers(prev =>
        prev.map(u => (u.id === selectedUser.id ? { ...u, ...updatedUser } : u))
      );
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (err: any) {
      setError(err.message);
      reportApiError({
        title: 'Team user update failed',
        message: err.message,
        error: err,
        endpoint: `/api/team/users/${selectedUser.id}`,
      });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!requireTeamApi()) return;

    if (!confirm('Are you sure you want to remove this user from the team?')) {
      return;
    }

    try {
      const response = await apiFetch(`/api/team/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getStoredAccessToken() || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      setError(err.message);
      reportApiError({
        title: 'Team user delete failed',
        message: err.message,
        error: err,
        endpoint: `/api/team/users/${userId}`,
      });
    }
  };

  const handleInviteUser = async () => {
    if (!requireTeamApi()) return;
    if (!inviteEmail) return;

    try {
      const response = await apiFetch('/api/team/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getStoredAccessToken() || ''}`,
        },
        body: JSON.stringify({ email: inviteEmail }),
      });

      if (!response.ok) {
        throw new Error('Failed to send invitation');
      }

      setInviteEmail('');
      setShowInviteModal(false);
      // Refresh users list
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
      reportApiError({
        title: 'Team invitation failed',
        message: err.message,
        error: err,
        endpoint: '/api/team/invite',
      });
    }
  };

  return (
    <div className="team-management">
      <div className="team-header">
        <div className="team-header-content">
          <h1>Team Management</h1>
          <p>Manage team members, roles, and permissions</p>
        </div>
        <button type="button"
          className="btn-invite"
          onClick={() => {
            if (requireTeamApi()) setShowInviteModal(true);
          }}
          disabled={!teamApiEnabled}
          title={teamApiEnabled ? undefined : 'Team API is not available on this server'}
        >
          + Invite Member
        </button>
      </div>

      {error && (
        <div className="team-error">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="team-search">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="team-search-input"
          aria-label="Search team members"
        />
      </div>

      {loading ? (
        <div className="team-loading">
          <div className="spinner"></div>
          <p>Loading team members...</p>
        </div>
      ) : sortedUsers.length > 0 ? (
        <UserTable
          users={sortedUsers}
          sortConfig={sortConfig}
          onSort={handleSort}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
          actionsDisabled={!teamApiEnabled}
        />
      ) : (
        <div className="team-empty">
          <p>No team members found</p>
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')}>Clear search</button>
          )}
        </div>
      )}

      {/* Modals */}
      {showEditModal && (
        <EditUserModal
          user={selectedUser}
          onSave={handleSaveUser}
          onCancel={() => setShowEditModal(false)}
          disabled={!teamApiEnabled}
        />
      )}

      {showInviteModal && (
        <InviteUserModal
          email={inviteEmail}
          onEmailChange={setInviteEmail}
          onInvite={handleInviteUser}
          onCancel={() => setShowInviteModal(false)}
          disabled={!teamApiEnabled}
        />
      )}
    </div>
  );
};

/**
 * UserTable Component
 *
 * Sortable table displaying team members with their roles and status
 */
const UserTable = ({ users, sortConfig, onSort, onEdit, onDelete, actionsDisabled = false }) => {
  const getRoleColor = (role) => {
    const colors = {
      'Admin': { bg: 'var(--app-danger)', text: 'Admin' },
      'Physician': { bg: 'var(--accent-2)', text: 'Physician' },
      'Nurse': { bg: 'var(--accent-1)', text: 'Nurse' },
      'Student': { bg: 'var(--semantic-ai-assistance)', text: 'Student' },
    };
    return colors[role] || colors['Student'];
  };

  const getStatusIndicator = (status) => {
    const indicators = {
      active: '🟢',
      inactive: '⚫',
      pending: '🟡',
    };
    return indicators[status] || '⚫';
  };

  const TableHeaderCell = ({ label, sortKey }) => (
    <th>
      <button type="button"
        className={`table-sort-btn ${sortConfig.key === sortKey ? 'table-sort-active' : ''}`}
        onClick={() => onSort(sortKey)}
        aria-label={`Sort by ${label}`}
      >
        {label}
        {sortConfig.key === sortKey && (
          <span className="sort-indicator">
            {sortConfig.direction === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </button>
    </th>
  );

  return (
    <div className="user-table-wrapper">
      <table className="user-table">
        <thead>
          <tr>
            <TableHeaderCell label="Name" sortKey="name" />
            <TableHeaderCell label="Role" sortKey="role" />
            <TableHeaderCell label="Email" sortKey="email" />
            <TableHeaderCell label="Joined" sortKey="joinedDate" />
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td className="table-name">
                <div className="user-info">
                  <div className="user-avatar">{user.initials}</div>
                  <span className="user-name">{user.name}</span>
                </div>
              </td>
              <td>
                <span
                  className="role-badge"
                  style={{ backgroundColor: `${getRoleColor(user.role).bg}20` }}
                  title={user.role}
                >
                  {user.role}
                </span>
              </td>
              <td className="table-email">{user.email}</td>
              <td className="table-date">
                {new Date(user.joinedDate).toLocaleDateString()}
              </td>
              <td className="table-status">
                <span className="status-indicator" title={user.status}>
                  {getStatusIndicator(user.status)}
                </span>
              </td>
              <td className="table-actions">
                <button type="button"
                  className="action-btn action-edit"
                  onClick={() => onEdit(user)}
                  title="Edit user"
                  aria-label={`Edit ${user.name}`}
                  disabled={actionsDisabled}
                >
                  ✎
                </button>
                <button type="button"
                  className="action-btn action-delete"
                  onClick={() => onDelete(user.id)}
                  title="Remove user"
                  aria-label={`Remove ${user.name}`}
                  disabled={actionsDisabled}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * EditUserModal Component
 *
 * Modal for editing user role and permissions
 */
const EditUserModal = ({ user, onSave, onCancel, disabled = false }) => {
  const [role, setRole] = useState(user.role);
  const [permissions] = useState(user.permissions || []);
  const [saving, setSaving] = useState(false);

  const roleDefinitions = {
    'Admin': ['Read All', 'Write All', 'Delete All', 'Manage Users', 'View Audit Logs'],
    'Physician': ['Read PHI', 'Write Clinical Notes', 'Prescribe Medications', 'Order Tests'],
    'Nurse': ['Read PHI', 'Update Vitals', 'Document Care', 'Assist Physician'],
    'Student': ['Read Clinical Scenarios', 'View Guidelines', 'Educational Resources'],
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ role, permissions });
    } finally {
      setSaving(false);
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- click-outside-to-dismiss backdrop; the real Close button below is the keyboard-accessible dismiss control
    <div className="modal-overlay" onClick={onCancel}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- onClick only stops propagation to the backdrop's close handler, it is not an interactive control itself */}
      <div className="edit-user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit User</h2>
          <button type="button" className="modal-close" onClick={onCancel}>✕</button>
        </div>

        <div className="modal-body">
          <div className="edit-user-info">
            <div className="user-avatar-large">{user.initials}</div>
            <div className="edit-user-details">
              <h3>{user.name}</h3>
              <p>{user.email}</p>
            </div>
          </div>

          <div className="edit-role-section">
            <label htmlFor="role-select">Role</label>
            <RoleSelector
              value={role}
              onChange={setRole}
            />
          </div>

          <div className="edit-permissions-section">
            <h4>Permissions for {role}</h4>
            <div className="permissions-list">
              {roleDefinitions[role]?.map(permission => (
                <div key={permission} className="permission-item">
                  <span className="permission-check">✓</span>
                  <span className="permission-name">{permission}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button"
            className="btn-cancel"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="button"
            className="btn-save"
            onClick={handleSave}
            disabled={saving || disabled}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * RoleSelector Component
 *
 * Dropdown for selecting user roles with descriptions
 */
const RoleSelector = ({ value, onChange }) => {
  const roles = [
    { id: 'Student', label: 'Student', description: 'View-only access to clinical content' },
    { id: 'Nurse', label: 'Nurse', description: 'Complete documentation and vital entry' },
    { id: 'Physician', label: 'Physician', description: 'Full clinical decision support' },
    { id: 'Admin', label: 'Admin', description: 'Complete system access and management' },
  ];

  return (
    <select
      className="role-selector"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Select user role"
    >
      {roles.map(role => (
        <option key={role.id} value={role.id}>
          {role.label} — {role.description}
        </option>
      ))}
    </select>
  );
};

/**
 * InviteUserModal Component
 *
 * Modal for inviting new team members
 */
const InviteUserModal = ({ email, onEmailChange, onInvite, onCancel, disabled = false }) => {
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    setLoading(true);
    try {
      await onInvite();
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- click-outside-to-dismiss backdrop; the real Close button below is the keyboard-accessible dismiss control
    <div className="modal-overlay" onClick={onCancel}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- onClick only stops propagation to the backdrop's close handler, it is not an interactive control itself */}
      <div className="invite-user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Invite Team Member</h2>
          <button type="button" className="modal-close" onClick={onCancel}>✕</button>
        </div>

        <div className="modal-body">
          <p className="invite-description">
            Send an invitation to join your team. They'll receive an email with a link to create their account.
          </p>

          <div className="invite-input-group">
            <label htmlFor="invite-email">Email Address</label>
            <input
              id="invite-email"
              type="email"
              placeholder="colleague@hospital.org"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              className="invite-email-input"
            />
            {email && !isValidEmail && (
              <p className="invite-error">Please enter a valid email address</p>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button"
            className="btn-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button type="button"
            className="btn-invite"
            onClick={handleInvite}
            disabled={!isValidEmail || loading || disabled}
          >
            {loading ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </div>
    </div>
  );
};
