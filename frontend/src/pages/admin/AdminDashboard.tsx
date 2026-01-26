import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { RequireRole } from '../../components/auth/RequireRole';
import { PageTransition } from '../../components/PageTransition';
import { announce } from '../../stores/announcer';
import './AdminDashboard.css';

// SVG Icons for admin navigation
const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-5 0-8 2.5-8 5v1h16v-1c0-2.5-3-5-8-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 8a3 3 0 100-6M20 14c2 .5 4 1.5 4 3v1h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ReceiptsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 3h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zm3 5h10m-10 4h10m-10 4h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const QueueIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 6h16M4 10h16M4 14h10M4 18h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 14l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DashboardIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 3h8v10H3V3zm10 0h8v6h-8V3zM3 15h8v6H3v-6zm10-4h8v10h-8V11z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChartIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 20V10m6 10V4m6 16v-6m6 6V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalReceipts: number;
  receiptsToday: number;
  queuePending: number;
  queueProcessing: number;
  queueFailed: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

interface AdminNavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  description: string;
}

const adminNavItems: AdminNavItem[] = [
  {
    label: 'Dashboard',
    path: '/admin',
    icon: <DashboardIcon />,
    description: 'System overview and stats',
  },
  {
    label: 'User Management',
    path: '/admin/users',
    icon: <UsersIcon />,
    description: 'Manage user accounts',
  },
  {
    label: 'Receipt Queue',
    path: '/admin/queue',
    icon: <QueueIcon />,
    description: 'Monitor processing queue',
  },
  {
    label: 'Analytics',
    path: '/admin/analytics',
    icon: <ChartIcon />,
    description: 'View system analytics',
  },
  {
    label: 'Settings',
    path: '/admin/settings',
    icon: <SettingsIcon />,
    description: 'System configuration',
  },
];

function AdminDashboardContent() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasAnnouncedRef = useRef(false);

  useEffect(() => {
    // Simulate fetching admin stats - in production this would be an API call
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        // Simulated stats data
        await new Promise(resolve => setTimeout(resolve, 500));
        setStats({
          totalUsers: 1247,
          activeUsers: 892,
          totalReceipts: 45678,
          receiptsToday: 234,
          queuePending: 12,
          queueProcessing: 3,
          queueFailed: 2,
          systemHealth: 'healthy',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    if (!hasAnnouncedRef.current && stats && !isLoading) {
      announce(
        `Admin dashboard loaded. ${stats.totalUsers} total users, ${stats.totalReceipts} receipts, ${stats.queuePending} items in queue.`
      );
      hasAnnouncedRef.current = true;
    }
  }, [stats, isLoading]);

  const getHealthStatusClass = (health: SystemStats['systemHealth']) => {
    switch (health) {
      case 'healthy':
        return 'status-healthy';
      case 'warning':
        return 'status-warning';
      case 'critical':
        return 'status-critical';
      default:
        return '';
    }
  };

  return (
    <PageTransition>
      <div className="admin-dashboard-page" role="region" aria-labelledby="admin-dashboard-title">
        <div className="admin-dashboard-header">
          <div>
            <h1 id="admin-dashboard-title">Admin Dashboard</h1>
            <p className="admin-dashboard-subtitle">
              System administration and monitoring
            </p>
          </div>
          {stats && (
            <div className={`system-health-badge ${getHealthStatusClass(stats.systemHealth)}`}>
              <span className="health-indicator" aria-hidden="true" />
              <span>System {stats.systemHealth}</span>
            </div>
          )}
        </div>

        <div className="admin-layout">
          {/* Admin Sidebar Navigation */}
          <nav className="admin-sidebar" aria-label="Admin navigation">
            <div className="admin-sidebar-section">
              <h2 className="admin-sidebar-title">Administration</h2>
              <ul className="admin-nav-list">
                {adminNavItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`admin-nav-item ${item.path === '/admin' ? 'active' : ''}`}
                      aria-current={item.path === '/admin' ? 'page' : undefined}
                    >
                      <span className="admin-nav-icon">{item.icon}</span>
                      <span className="admin-nav-content">
                        <span className="admin-nav-label">{item.label}</span>
                        <span className="admin-nav-description">{item.description}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Main Content Area */}
          <div className="admin-main-content">
            {/* Stats Cards */}
            <section className="admin-stats-section" aria-label="System statistics">
              <h2 className="sr-only">System Statistics</h2>
              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <div className="admin-stat-icon">
                    <UsersIcon />
                  </div>
                  <div className="admin-stat-content">
                    <span className="admin-stat-label">Total Users</span>
                    {isLoading ? (
                      <span className="admin-stat-skeleton" />
                    ) : (
                      <span className="admin-stat-value">{stats?.totalUsers.toLocaleString()}</span>
                    )}
                    {!isLoading && stats && (
                      <span className="admin-stat-subtext">
                        {stats.activeUsers.toLocaleString()} active
                      </span>
                    )}
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-icon">
                    <ReceiptsIcon />
                  </div>
                  <div className="admin-stat-content">
                    <span className="admin-stat-label">Total Receipts</span>
                    {isLoading ? (
                      <span className="admin-stat-skeleton" />
                    ) : (
                      <span className="admin-stat-value">{stats?.totalReceipts.toLocaleString()}</span>
                    )}
                    {!isLoading && stats && (
                      <span className="admin-stat-subtext">
                        {stats.receiptsToday} today
                      </span>
                    )}
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-icon">
                    <QueueIcon />
                  </div>
                  <div className="admin-stat-content">
                    <span className="admin-stat-label">Queue Status</span>
                    {isLoading ? (
                      <span className="admin-stat-skeleton" />
                    ) : (
                      <span className="admin-stat-value">{stats?.queuePending}</span>
                    )}
                    {!isLoading && stats && (
                      <span className="admin-stat-subtext">
                        {stats.queueProcessing} processing, {stats.queueFailed} failed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Links Section */}
            <section className="admin-quick-links-section">
              <h2>Quick Actions</h2>
              <div className="admin-quick-links-grid">
                <Link to="/admin/users" className="admin-quick-link">
                  <UsersIcon />
                  <span>Manage Users</span>
                </Link>
                <Link to="/admin/queue" className="admin-quick-link">
                  <QueueIcon />
                  <span>View Queue</span>
                </Link>
                <Link to="/admin/analytics" className="admin-quick-link">
                  <ChartIcon />
                  <span>View Analytics</span>
                </Link>
                <Link to="/admin/settings" className="admin-quick-link">
                  <SettingsIcon />
                  <span>System Settings</span>
                </Link>
              </div>
            </section>

            {/* Recent Activity Section */}
            <section className="admin-activity-section">
              <div className="admin-section-header">
                <h2>Recent System Activity</h2>
                <Link to="/admin/logs" className="admin-view-all-link">
                  View All Logs
                </Link>
              </div>
              <div className="admin-activity-list">
                {isLoading ? (
                  <>
                    <div className="admin-activity-skeleton" />
                    <div className="admin-activity-skeleton" />
                    <div className="admin-activity-skeleton" />
                  </>
                ) : (
                  <>
                    <div className="admin-activity-item">
                      <span className="admin-activity-badge badge-info">User</span>
                      <span className="admin-activity-text">New user registered: john.doe@example.com</span>
                      <span className="admin-activity-time">2 minutes ago</span>
                    </div>
                    <div className="admin-activity-item">
                      <span className="admin-activity-badge badge-success">Receipt</span>
                      <span className="admin-activity-text">Receipt batch processed: 15 items</span>
                      <span className="admin-activity-time">5 minutes ago</span>
                    </div>
                    <div className="admin-activity-item">
                      <span className="admin-activity-badge badge-warning">Queue</span>
                      <span className="admin-activity-text">Queue worker restarted</span>
                      <span className="admin-activity-time">12 minutes ago</span>
                    </div>
                    <div className="admin-activity-item">
                      <span className="admin-activity-badge badge-error">Error</span>
                      <span className="admin-activity-text">OCR processing failed for receipt #45632</span>
                      <span className="admin-activity-time">18 minutes ago</span>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

export function AdminDashboard() {
  return (
    <RequireRole
      allowedRoles={['admin', 'owner']}
      showForbidden={true}
      forbiddenMessage="You need administrator privileges to access this page."
    >
      <AdminDashboardContent />
    </RequireRole>
  );
}
