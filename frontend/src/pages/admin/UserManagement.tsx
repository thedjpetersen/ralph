import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { RequireRole } from '../../components/auth/RequireRole';
import { PageTransition } from '../../components/PageTransition';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, Pagination } from '../../components/ui/Table';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { announce } from '../../stores/announcer';
import './UserManagement.css';

// SVG Icons
const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-5 0-8 2.5-8 5v1h16v-1c0-2.5-3-5-8-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M19 12H5m0 0l7 7m-7-7l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Types matching backend
type UserRole = 'user' | 'admin';
type UserStatus = 'active' | 'suspended' | 'pending';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  suspendedAt?: string;
  suspendReason?: string;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  pendingUsers: number;
  adminUsers: number;
}

// Mock data for demo purposes - replace with actual API calls
const mockStats: UserStats = {
  totalUsers: 1247,
  activeUsers: 1189,
  suspendedUsers: 23,
  pendingUsers: 35,
  adminUsers: 8,
};

const mockUsers: User[] = [
  { id: 'usr-001', email: 'john.doe@example.com', name: 'John Doe', role: 'user', status: 'active', createdAt: '2024-01-15T10:30:00Z', updatedAt: '2024-01-20T14:22:00Z', lastLoginAt: '2024-01-20T09:15:00Z' },
  { id: 'usr-002', email: 'jane.smith@example.com', name: 'Jane Smith', role: 'admin', status: 'active', createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-19T16:45:00Z', lastLoginAt: '2024-01-20T11:30:00Z' },
  { id: 'usr-003', email: 'bob.wilson@example.com', name: 'Bob Wilson', role: 'user', status: 'suspended', createdAt: '2024-01-08T14:20:00Z', updatedAt: '2024-01-18T10:00:00Z', lastLoginAt: '2024-01-17T15:20:00Z', suspendedAt: '2024-01-18T10:00:00Z', suspendReason: 'Violation of terms of service' },
  { id: 'usr-004', email: 'alice.johnson@example.com', name: 'Alice Johnson', role: 'user', status: 'active', createdAt: '2024-01-05T09:15:00Z', updatedAt: '2024-01-20T08:30:00Z', lastLoginAt: '2024-01-20T08:30:00Z' },
  { id: 'usr-005', email: 'charlie.brown@example.com', name: 'Charlie Brown', role: 'user', status: 'pending', createdAt: '2024-01-20T07:00:00Z', updatedAt: '2024-01-20T07:00:00Z' },
  { id: 'usr-006', email: 'diana.prince@example.com', name: 'Diana Prince', role: 'admin', status: 'active', createdAt: '2023-12-01T12:00:00Z', updatedAt: '2024-01-19T18:00:00Z', lastLoginAt: '2024-01-19T18:00:00Z' },
  { id: 'usr-007', email: 'evan.rogers@example.com', name: 'Evan Rogers', role: 'user', status: 'active', createdAt: '2024-01-12T11:45:00Z', updatedAt: '2024-01-18T09:20:00Z', lastLoginAt: '2024-01-18T09:20:00Z' },
  { id: 'usr-008', email: 'fiona.green@example.com', name: 'Fiona Green', role: 'user', status: 'suspended', createdAt: '2024-01-03T16:30:00Z', updatedAt: '2024-01-15T14:00:00Z', lastLoginAt: '2024-01-14T10:00:00Z', suspendedAt: '2024-01-15T14:00:00Z', suspendReason: 'Account abuse detected' },
  { id: 'usr-009', email: 'george.harris@example.com', name: 'George Harris', role: 'user', status: 'active', createdAt: '2024-01-18T10:00:00Z', updatedAt: '2024-01-20T10:15:00Z', lastLoginAt: '2024-01-20T10:15:00Z' },
  { id: 'usr-010', email: 'helen.clark@example.com', name: 'Helen Clark', role: 'user', status: 'pending', createdAt: '2024-01-19T15:30:00Z', updatedAt: '2024-01-19T15:30:00Z' },
];

function getStatusBadgeVariant(status: UserStatus): 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'active': return 'success';
    case 'suspended': return 'danger';
    case 'pending': return 'warning';
    default: return 'default';
  }
}

function getRoleBadgeVariant(role: UserRole): 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  switch (role) {
    case 'admin': return 'primary';
    case 'user': return 'default';
    default: return 'default';
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`;
  return date.toLocaleDateString();
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function UserManagementContent() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showUnsuspendDialog, setShowUnsuspendDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [isSuspending, setIsSuspending] = useState(false);
  const [isUnsuspending, setIsUnsuspending] = useState(false);
  const [isChangingRole, setIsChangingRole] = useState(false);
  const hasAnnouncedRef = useRef(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Simulate API call - replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 500));
      setStats(mockStats);
      setUsers(mockUsers);
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!hasAnnouncedRef.current && stats && !isLoading) {
      announce(
        `User management loaded. ${stats.totalUsers} total users: ${stats.activeUsers} active, ${stats.suspendedUsers} suspended, ${stats.pendingUsers} pending.`
      );
      hasAnnouncedRef.current = true;
    }
  }, [stats, isLoading]);

  const handleRefresh = () => {
    fetchData(true);
    announce('Refreshing user data');
  };

  const handleSuspendUser = async () => {
    if (!selectedUser) return;
    setIsSuspending(true);
    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      announce(`User ${selectedUser.email} has been suspended`);
      setShowSuspendDialog(false);
      setSuspendReason('');
      setSelectedUser(null);
      fetchData(true);
    } finally {
      setIsSuspending(false);
    }
  };

  const handleUnsuspendUser = async () => {
    if (!selectedUser) return;
    setIsUnsuspending(true);
    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      announce(`User ${selectedUser.email} has been unsuspended`);
      setShowUnsuspendDialog(false);
      setSelectedUser(null);
      fetchData(true);
    } finally {
      setIsUnsuspending(false);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser) return;
    setIsChangingRole(true);
    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      announce(`User ${selectedUser.email} role changed to ${newRole}`);
      setShowRoleDialog(false);
      setSelectedUser(null);
      fetchData(true);
    } finally {
      setIsChangingRole(false);
    }
  };

  const openSuspendDialog = (user: User) => {
    setSelectedUser(user);
    setSuspendReason('');
    setShowSuspendDialog(true);
  };

  const openUnsuspendDialog = (user: User) => {
    setSelectedUser(user);
    setShowUnsuspendDialog(true);
  };

  const openRoleDialog = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role === 'admin' ? 'user' : 'admin');
    setShowRoleDialog(true);
  };

  // Filter users based on search, status, and role
  const filteredUsers = users.filter(user => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        user.email.toLowerCase().includes(query) ||
        user.name.toLowerCase().includes(query) ||
        user.id.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    // Status filter
    if (statusFilter !== 'all' && user.status !== statusFilter) return false;
    // Role filter
    if (roleFilter !== 'all' && user.role !== roleFilter) return false;
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <PageTransition>
      <div className="user-management-page" role="region" aria-labelledby="user-management-title">
        <div className="user-management-header">
          <div className="user-header-left">
            <Link to="/admin" className="user-back-link">
              <BackIcon />
              <span>Admin Dashboard</span>
            </Link>
            <h1 id="user-management-title">User Management</h1>
            <p className="user-management-subtitle">
              Manage user accounts, roles, and permissions
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            loading={isRefreshing}
            leftIcon={<RefreshIcon />}
          >
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <section className="user-stats-section" aria-label="User statistics">
          <h2 className="sr-only">User Statistics</h2>
          <div className="user-stats-grid">
            <div className="user-stat-card">
              <div className="user-stat-icon user-stat-icon-total">
                <UsersIcon />
              </div>
              <div className="user-stat-content">
                <span className="user-stat-label">Total Users</span>
                {isLoading ? (
                  <span className="user-stat-skeleton" />
                ) : (
                  <span className="user-stat-value">{stats?.totalUsers.toLocaleString() ?? 0}</span>
                )}
                <span className="user-stat-subtext">{stats?.adminUsers ?? 0} admins</span>
              </div>
            </div>

            <div className="user-stat-card">
              <div className="user-stat-icon user-stat-icon-active">
                <UsersIcon />
              </div>
              <div className="user-stat-content">
                <span className="user-stat-label">Active</span>
                {isLoading ? (
                  <span className="user-stat-skeleton" />
                ) : (
                  <span className="user-stat-value">{stats?.activeUsers.toLocaleString() ?? 0}</span>
                )}
                <span className="user-stat-subtext">users enabled</span>
              </div>
            </div>

            <div className="user-stat-card">
              <div className="user-stat-icon user-stat-icon-suspended">
                <UsersIcon />
              </div>
              <div className="user-stat-content">
                <span className="user-stat-label">Suspended</span>
                {isLoading ? (
                  <span className="user-stat-skeleton" />
                ) : (
                  <span className="user-stat-value">{stats?.suspendedUsers ?? 0}</span>
                )}
                <span className="user-stat-subtext">users disabled</span>
              </div>
            </div>

            <div className="user-stat-card">
              <div className="user-stat-icon user-stat-icon-pending">
                <UsersIcon />
              </div>
              <div className="user-stat-content">
                <span className="user-stat-label">Pending</span>
                {isLoading ? (
                  <span className="user-stat-skeleton" />
                ) : (
                  <span className="user-stat-value">{stats?.pendingUsers ?? 0}</span>
                )}
                <span className="user-stat-subtext">awaiting verification</span>
              </div>
            </div>
          </div>
        </section>

        {/* Users Table */}
        <section className="user-list-section">
          <div className="user-list-header">
            <h2>All Users</h2>
          </div>

          <div className="user-list-filters">
            <div className="user-search">
              <SearchIcon />
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="user-search-input"
                aria-label="Search users"
              />
            </div>
            <div className="user-filter">
              <label htmlFor="status-filter">Status:</label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as UserStatus | 'all');
                  setCurrentPage(1);
                }}
                className="user-filter-select"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="user-filter">
              <label htmlFor="role-filter">Role:</label>
              <select
                id="role-filter"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value as UserRole | 'all');
                  setCurrentPage(1);
                }}
                className="user-filter-select"
              >
                <option value="all">All</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="user-list-loading">
              <div className="user-list-skeleton" />
              <div className="user-list-skeleton" />
              <div className="user-list-skeleton" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="user-list-empty">
              <p>No users found matching the current filters.</p>
            </div>
          ) : (
            <>
              <Table striped hoverable>
                <Table.Head>
                  <Table.Row>
                    <Table.Header>User</Table.Header>
                    <Table.Header>Role</Table.Header>
                    <Table.Header>Status</Table.Header>
                    <Table.Header>Created</Table.Header>
                    <Table.Header>Last Login</Table.Header>
                    <Table.Header>Actions</Table.Header>
                  </Table.Row>
                </Table.Head>
                <Table.Body>
                  {paginatedUsers.map(user => (
                    <Table.Row key={user.id}>
                      <Table.Cell>
                        <div className="user-cell">
                          <div className="user-avatar">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="user-info">
                            <span className="user-name">{user.name}</span>
                            <span className="user-email">{user.email}</span>
                          </div>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge variant={getRoleBadgeVariant(user.role)} size="sm">
                          {user.role}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge variant={getStatusBadgeVariant(user.status)} size="sm">
                          {user.status}
                        </Badge>
                        {user.suspendReason && (
                          <span className="user-suspend-reason" title={user.suspendReason}>
                            {user.suspendReason}
                          </span>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <span title={formatFullDate(user.createdAt)}>
                          {formatDate(user.createdAt)}
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        {user.lastLoginAt ? (
                          <span title={formatFullDate(user.lastLoginAt)}>
                            {formatDate(user.lastLoginAt)}
                          </span>
                        ) : (
                          <span className="user-no-login">Never</span>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <div className="user-actions">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openRoleDialog(user)}
                            leftIcon={<EditIcon />}
                            title={`Change role to ${user.role === 'admin' ? 'user' : 'admin'}`}
                          >
                            Role
                          </Button>
                          {user.status === 'suspended' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openUnsuspendDialog(user)}
                            >
                              Enable
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openSuspendDialog(user)}
                            >
                              Disable
                            </Button>
                          )}
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>

              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredUsers.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                />
              )}
            </>
          )}
        </section>

        {/* Suspend User Dialog */}
        <ConfirmDialog
          isOpen={showSuspendDialog}
          onClose={() => {
            setShowSuspendDialog(false);
            setSelectedUser(null);
            setSuspendReason('');
          }}
          onConfirm={handleSuspendUser}
          title="Suspend User"
          description={`Are you sure you want to suspend ${selectedUser?.email}? This will prevent the user from accessing their account.`}
          confirmLabel="Suspend User"
          variant="danger"
          isLoading={isSuspending}
        >
          <div className="suspend-reason-field">
            <label htmlFor="suspend-reason">Reason (optional):</label>
            <textarea
              id="suspend-reason"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Enter reason for suspension..."
              rows={3}
            />
          </div>
        </ConfirmDialog>

        {/* Unsuspend User Dialog */}
        <ConfirmDialog
          isOpen={showUnsuspendDialog}
          onClose={() => {
            setShowUnsuspendDialog(false);
            setSelectedUser(null);
          }}
          onConfirm={handleUnsuspendUser}
          title="Enable User"
          description={`Are you sure you want to enable ${selectedUser?.email}? This will restore their access to the account.`}
          confirmLabel="Enable User"
          variant="warning"
          isLoading={isUnsuspending}
        />

        {/* Change Role Dialog */}
        <ConfirmDialog
          isOpen={showRoleDialog}
          onClose={() => {
            setShowRoleDialog(false);
            setSelectedUser(null);
          }}
          onConfirm={handleChangeRole}
          title="Change User Role"
          description={`Are you sure you want to change ${selectedUser?.email}'s role from "${selectedUser?.role}" to "${newRole}"?${newRole === 'admin' ? ' This will grant them full administrative privileges.' : ' This will remove their administrative privileges.'}`}
          confirmLabel={`Make ${newRole}`}
          variant="warning"
          isLoading={isChangingRole}
        />
      </div>
    </PageTransition>
  );
}

export function UserManagement() {
  return (
    <RequireRole
      allowedRoles={['admin', 'owner']}
      showForbidden={true}
      forbiddenMessage="You need administrator privileges to access user management."
    >
      <UserManagementContent />
    </RequireRole>
  );
}
