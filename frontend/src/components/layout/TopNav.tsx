import { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../../stores/user';
import './TopNav.css';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface TopNavProps {
  breadcrumbs?: BreadcrumbItem[];
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

// SVG Icons
const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M9 17A8 8 0 109 1a8 8 0 000 16zm8-2l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M15 6.5a5 5 0 00-10 0c0 5.5-2 7-2 7h14s-2-1.5-2-7zM8.5 17a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ProfileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M10 10a3 3 0 100-6 3 3 0 000 6zm0 2c-4 0-6 2-6 4v1h12v-1c0-2-2-4-6-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M16.5 10a6.5 6.5 0 01-1.07 3.57l1.07 1.93-2 2-1.93-1.07A6.5 6.5 0 0110 17.5a6.5 6.5 0 01-3.57-1.07l-1.93 1.07-2-2 1.07-1.93A6.5 6.5 0 013.5 10a6.5 6.5 0 011.07-3.57L3.5 4.5l2-2 1.93 1.07A6.5 6.5 0 0110 2.5a6.5 6.5 0 013.57 1.07L15.5 2.5l2 2-1.07 1.93A6.5 6.5 0 0116.5 10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3m6 12l4-4-4-4m4 4H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function TopNav({ breadcrumbs = [], onMobileMenuToggle, isMobileMenuOpen = false }: TopNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useUserStore();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [userMenuIndex, setUserMenuIndex] = useState(-1);
  const [notificationCount] = useState(0); // Placeholder for future notification count

  const userMenuRef = useRef<HTMLDivElement>(null);
  const userTriggerRef = useRef<HTMLButtonElement>(null);

  // Generate breadcrumbs from location if not provided
  const displayBreadcrumbs = breadcrumbs.length > 0 ? breadcrumbs : generateBreadcrumbsFromPath(location.pathname);

  const handleLogout = useCallback(() => {
    logout();
    setIsUserMenuOpen(false);
    setUserMenuIndex(-1);
    navigate('/');
  }, [logout, navigate]);

  const handleUserMenuItemClick = useCallback((path: string) => {
    navigate(path);
    setIsUserMenuOpen(false);
    setUserMenuIndex(-1);
  }, [navigate]);

  // Keyboard navigation for user menu
  const userMenuItems = ['profile', 'settings', 'api-keys', 'logout'];
  const handleUserMenuKeyDown = useCallback((event: React.KeyboardEvent) => {
    const menuItemsCount = userMenuItems.length;

    switch (event.key) {
      case 'Escape': {
        setIsUserMenuOpen(false);
        setUserMenuIndex(-1);
        userTriggerRef.current?.focus();
        event.preventDefault();
        break;
      }
      case 'ArrowDown': {
        event.preventDefault();
        if (!isUserMenuOpen) {
          setIsUserMenuOpen(true);
          setUserMenuIndex(0);
        } else {
          setUserMenuIndex(prev => (prev + 1) % menuItemsCount);
        }
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        if (!isUserMenuOpen) {
          setIsUserMenuOpen(true);
          setUserMenuIndex(menuItemsCount - 1);
        } else {
          setUserMenuIndex(prev => (prev - 1 + menuItemsCount) % menuItemsCount);
        }
        break;
      }
      case 'Enter':
      case ' ': {
        if (!isUserMenuOpen) {
          event.preventDefault();
          setIsUserMenuOpen(true);
          setUserMenuIndex(0);
        }
        break;
      }
      case 'Tab': {
        if (isUserMenuOpen) {
          setIsUserMenuOpen(false);
          setUserMenuIndex(-1);
        }
        break;
      }
    }
  }, [isUserMenuOpen, userMenuItems.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
        setUserMenuIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="topnav" role="banner">
      <div className="topnav-content">
        {/* Mobile menu toggle */}
        <button
          className="topnav-mobile-toggle"
          onClick={onMobileMenuToggle}
          aria-expanded={isMobileMenuOpen}
          aria-controls="sidebar-mobile"
          aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        {/* Breadcrumbs */}
        <nav className="topnav-breadcrumbs" aria-label="Breadcrumb">
          <ol className="breadcrumb-list">
            {displayBreadcrumbs.map((crumb, index) => {
              const isLast = index === displayBreadcrumbs.length - 1;
              return (
                <li key={crumb.path || index} className="breadcrumb-item">
                  {!isLast && crumb.path ? (
                    <>
                      <Link to={crumb.path} className="breadcrumb-link">
                        {crumb.label}
                      </Link>
                      <ChevronRightIcon />
                    </>
                  ) : (
                    <span className="breadcrumb-current" aria-current="page">
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Right actions */}
        <div className="topnav-actions">
          {/* Search bar placeholder */}
          <div className="topnav-search">
            <button
              className="topnav-search-trigger"
              aria-label="Search"
              title="Search (Coming soon)"
            >
              <SearchIcon />
              <span className="topnav-search-text">Search...</span>
              <kbd className="topnav-search-kbd">⌘K</kbd>
            </button>
          </div>

          {/* Notification bell placeholder */}
          <button
            className="topnav-notification-bell"
            aria-label={`Notifications${notificationCount > 0 ? `, ${notificationCount} unread` : ''}`}
            title="Notifications (Coming soon)"
          >
            <BellIcon />
            {notificationCount > 0 && (
              <span className="topnav-notification-badge" aria-hidden="true">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          {/* User avatar dropdown */}
          <div className="topnav-user-menu" ref={userMenuRef} onKeyDown={handleUserMenuKeyDown}>
            <button
              ref={userTriggerRef}
              className="topnav-user-trigger"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
              aria-controls="topnav-user-dropdown"
              aria-label={`User menu for ${user?.name || 'User'}. Press Enter to open menu.`}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="topnav-user-avatar" aria-hidden="true" />
              ) : (
                <div className="topnav-user-avatar-placeholder" aria-hidden="true">
                  {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </button>
            {isUserMenuOpen && (
              <div
                id="topnav-user-dropdown"
                className="topnav-dropdown-menu"
                role="menu"
                aria-label="User menu"
              >
                <div className="topnav-dropdown-section">
                  <div className="topnav-user-info" role="presentation">
                    <span className="topnav-user-name">{user?.name || 'User'}</span>
                    <span className="topnav-user-email">{user?.email || ''}</span>
                  </div>
                </div>
                <div className="topnav-dropdown-divider" role="separator" aria-hidden="true" />
                <div className="topnav-dropdown-section" role="group">
                  <button
                    className={`topnav-dropdown-item ${userMenuIndex === 0 ? 'focused' : ''}`}
                    onClick={() => handleUserMenuItemClick('/profile')}
                    role="menuitem"
                    tabIndex={userMenuIndex === 0 ? 0 : -1}
                  >
                    <ProfileIcon />
                    <span>Profile</span>
                  </button>
                  <button
                    className={`topnav-dropdown-item ${userMenuIndex === 1 ? 'focused' : ''}`}
                    onClick={() => handleUserMenuItemClick('/settings')}
                    role="menuitem"
                    tabIndex={userMenuIndex === 1 ? 0 : -1}
                  >
                    <SettingsIcon />
                    <span>Settings</span>
                  </button>
                  <button
                    className={`topnav-dropdown-item ${userMenuIndex === 2 ? 'focused' : ''}`}
                    onClick={() => handleUserMenuItemClick('/api-keys')}
                    role="menuitem"
                    tabIndex={userMenuIndex === 2 ? 0 : -1}
                  >
                    <SettingsIcon />
                    <span>API Keys</span>
                  </button>
                </div>
                <div className="topnav-dropdown-divider" role="separator" aria-hidden="true" />
                <div className="topnav-dropdown-section" role="group">
                  <button
                    className={`topnav-dropdown-item topnav-logout-item ${userMenuIndex === 3 ? 'focused' : ''}`}
                    onClick={handleLogout}
                    role="menuitem"
                    tabIndex={userMenuIndex === 3 ? 0 : -1}
                  >
                    <LogoutIcon />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// Helper function to generate breadcrumbs from path
function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const pathSegments = pathname.split('/').filter(Boolean);

  if (pathSegments.length === 0) {
    return [{ label: 'Dashboard', path: '/dashboard' }];
  }

  const breadcrumbs: BreadcrumbItem[] = [];
  let currentPath = '';

  // Route label mapping
  const labelMap: Record<string, string> = {
    dashboard: 'Dashboard',
    receipts: 'Receipts',
    transactions: 'Transactions',
    stores: 'Stores',
    budgets: 'Budgets',
    accounts: 'Accounts',
    'financial-accounts': 'Financial Accounts',
    connections: 'Connections',
    settings: 'Settings',
    integrations: 'Integrations',
    profile: 'Profile',
    'api-keys': 'API Keys',
    'retirement-planning': 'Retirement Planning',
    'fire-calculator': 'FIRE Calculator',
    'google-drive': 'Google Drive',
    email: 'Email',
    new: 'New',
    edit: 'Edit',
  };

  for (const segment of pathSegments) {
    currentPath += `/${segment}`;

    // Try to get a friendly label, fall back to capitalized segment
    const label = labelMap[segment.toLowerCase()] ||
      segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

    breadcrumbs.push({
      label,
      path: currentPath,
    });
  }

  return breadcrumbs;
}
