import { useState, useCallback, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAccountStore } from '../../stores/account';
import { useUserStore } from '../../stores/user';
import './Sidebar.css';

interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

// SVG Icons
const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M3 3h6v6H3V3zm8 0h6v6h-6V3zM3 11h6v6H3v-6zm8 0h6v6h-6v-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ReceiptsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M4 3h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zm2 4h8m-8 3h8m-8 3h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TransactionsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M3 6h14M3 10h14M3 14h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const StoresIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M3 7l1.5-4h11L17 7M3 7v9a1 1 0 001 1h12a1 1 0 001-1V7M3 7h14M7 10v4m6-4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BudgetIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M10 3v14M6 7l4-4 4 4M6 13l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FinancialIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M4 17V8m4 9V3m4 14v-6m4 6V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M16.5 10a6.5 6.5 0 01-1.07 3.57l1.07 1.93-2 2-1.93-1.07A6.5 6.5 0 0110 17.5a6.5 6.5 0 01-3.57-1.07l-1.93 1.07-2-2 1.07-1.93A6.5 6.5 0 013.5 10a6.5 6.5 0 011.07-3.57L3.5 4.5l2-2 1.93 1.07A6.5 6.5 0 0110 2.5a6.5 6.5 0 013.57 1.07L15.5 2.5l2 2-1.07 1.93A6.5 6.5 0 0116.5 10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    className={`sidebar-section-chevron ${isOpen ? 'open' : ''}`}
    aria-hidden="true"
  >
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3m6 12l4-4-4-4m4 4H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ProfileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M10 10a3 3 0 100-6 3 3 0 000 6zm0 2c-4 0-6 2-6 4v1h12v-1c0-2-2-4-6-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const navSections: NavSection[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
    ],
  },
  {
    id: 'transactions',
    label: 'Transactions',
    items: [
      { label: 'Receipts', path: '/receipts', icon: <ReceiptsIcon /> },
      { label: 'Purchases', path: '/transactions', icon: <TransactionsIcon /> },
      { label: 'Stores', path: '/stores', icon: <StoresIcon /> },
    ],
  },
  {
    id: 'financial',
    label: 'Financial',
    items: [
      { label: 'Budget', path: '/budgets', icon: <BudgetIcon /> },
      { label: 'Accounts', path: '/financial-accounts', icon: <FinancialIcon /> },
      { label: 'Connections', path: '/connections', icon: <FinancialIcon /> },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    items: [
      { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
      { label: 'Integrations', path: '/integrations', icon: <SettingsIcon /> },
    ],
  },
];

export interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const navigate = useNavigate();
  const { currentAccount, accounts, isLoading, switchAccount } = useAccountStore();
  const { user, logout } = useUserStore();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(navSections.map(s => s.id))
  );
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [accountMenuIndex, setAccountMenuIndex] = useState(-1);
  const [userMenuIndex, setUserMenuIndex] = useState(-1);

  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const handleAccountSwitch = useCallback((accountId: string) => {
    switchAccount(accountId);
    setIsAccountDropdownOpen(false);
    setAccountMenuIndex(-1);
  }, [switchAccount]);

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

  // Keyboard navigation for account dropdown
  const handleAccountKeyDown = useCallback((event: React.KeyboardEvent) => {
    const menuItems = accounts.length;

    switch (event.key) {
      case 'Escape':
        setIsAccountDropdownOpen(false);
        setAccountMenuIndex(-1);
        event.preventDefault();
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isAccountDropdownOpen) {
          setIsAccountDropdownOpen(true);
          setAccountMenuIndex(0);
        } else {
          setAccountMenuIndex(prev => (prev + 1) % menuItems);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!isAccountDropdownOpen) {
          setIsAccountDropdownOpen(true);
          setAccountMenuIndex(menuItems - 1);
        } else {
          setAccountMenuIndex(prev => (prev - 1 + menuItems) % menuItems);
        }
        break;
      case 'Enter':
      case ' ':
        if (!isAccountDropdownOpen) {
          event.preventDefault();
          setIsAccountDropdownOpen(true);
          setAccountMenuIndex(0);
        } else if (accountMenuIndex >= 0 && accountMenuIndex < accounts.length) {
          event.preventDefault();
          handleAccountSwitch(accounts[accountMenuIndex].id);
        }
        break;
      case 'Tab':
        if (isAccountDropdownOpen) {
          setIsAccountDropdownOpen(false);
          setAccountMenuIndex(-1);
        }
        break;
    }
  }, [accounts, isAccountDropdownOpen, accountMenuIndex, handleAccountSwitch]);

  // Keyboard navigation for user menu
  const userMenuItems = ['profile', 'settings', 'api-keys', 'logout'];
  const handleUserMenuKeyDown = useCallback((event: React.KeyboardEvent) => {
    const menuItemsCount = userMenuItems.length;

    switch (event.key) {
      case 'Escape':
        setIsUserMenuOpen(false);
        setUserMenuIndex(-1);
        event.preventDefault();
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isUserMenuOpen) {
          setIsUserMenuOpen(true);
          setUserMenuIndex(0);
        } else {
          setUserMenuIndex(prev => (prev + 1) % menuItemsCount);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!isUserMenuOpen) {
          setIsUserMenuOpen(true);
          setUserMenuIndex(menuItemsCount - 1);
        } else {
          setUserMenuIndex(prev => (prev - 1 + menuItemsCount) % menuItemsCount);
        }
        break;
      case 'Enter':
      case ' ':
        if (!isUserMenuOpen) {
          event.preventDefault();
          setIsUserMenuOpen(true);
          setUserMenuIndex(0);
        }
        break;
      case 'Tab':
        if (isUserMenuOpen) {
          setIsUserMenuOpen(false);
          setUserMenuIndex(-1);
        }
        break;
    }
  }, [isUserMenuOpen, userMenuItems.length]);

  // Close dropdowns when clicking outside
  const handleOutsideClick = useCallback((event: MouseEvent) => {
    if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
      setIsAccountDropdownOpen(false);
      setAccountMenuIndex(-1);
    }
    if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
      setIsUserMenuOpen(false);
      setUserMenuIndex(-1);
    }
  }, []);

  // Add click outside listener
  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [handleOutsideClick]);

  return (
    <aside
      className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Account Switcher */}
      <div className="sidebar-account-switcher" ref={accountDropdownRef}>
        {isLoading ? (
          <div className="sidebar-account-skeleton">
            <div className="sidebar-account-avatar-skeleton" />
            {!isCollapsed && <div className="sidebar-account-name-skeleton" />}
          </div>
        ) : (
          <div className="sidebar-account-dropdown" onKeyDown={handleAccountKeyDown}>
            <button
              className="sidebar-account-trigger"
              onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
              aria-expanded={isAccountDropdownOpen}
              aria-haspopup="listbox"
              aria-label={`Current account: ${currentAccount?.name || 'Select account'}. Press Enter to switch accounts.`}
              title={isCollapsed ? (currentAccount?.name || 'Select account') : undefined}
            >
              <div className="sidebar-account-avatar" aria-hidden="true">
                {currentAccount?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              {!isCollapsed && (
                <>
                  <span className="sidebar-account-name">
                    {currentAccount?.name || 'Select account'}
                  </span>
                  <ChevronIcon isOpen={isAccountDropdownOpen} />
                </>
              )}
            </button>
            {isAccountDropdownOpen && (
              <div
                className="sidebar-account-menu"
                role="listbox"
                aria-label="Switch account"
              >
                {accounts.map((account, index) => (
                  <button
                    key={account.id}
                    className={`sidebar-account-item ${account.id === currentAccount?.id ? 'active' : ''} ${accountMenuIndex === index ? 'focused' : ''}`}
                    onClick={() => handleAccountSwitch(account.id)}
                    role="option"
                    aria-selected={account.id === currentAccount?.id}
                    tabIndex={accountMenuIndex === index ? 0 : -1}
                  >
                    <div className="sidebar-account-item-avatar" aria-hidden="true">
                      {account.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span className="sidebar-account-item-name">{account.name}</span>
                    {account.id === currentAccount?.id && (
                      <svg className="sidebar-check-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M3.5 8L6.5 11L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="sidebar-nav">
        {navSections.map(section => (
          <div key={section.id} className="sidebar-section">
            <button
              className="sidebar-section-header"
              onClick={() => toggleSection(section.id)}
              aria-expanded={expandedSections.has(section.id)}
              aria-controls={`sidebar-section-${section.id}`}
              title={isCollapsed ? section.label : undefined}
            >
              {!isCollapsed && (
                <>
                  <span className="sidebar-section-label">{section.label}</span>
                  <ChevronIcon isOpen={expandedSections.has(section.id)} />
                </>
              )}
              {isCollapsed && (
                <span className="sidebar-section-collapsed-indicator" aria-hidden="true">•</span>
              )}
            </button>
            <div
              id={`sidebar-section-${section.id}`}
              className={`sidebar-section-items ${expandedSections.has(section.id) ? 'expanded' : ''}`}
              role="group"
              aria-label={section.label}
            >
              {section.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? 'active' : ''}`
                  }
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="sidebar-nav-icon">{item.icon}</span>
                  {!isCollapsed && <span className="sidebar-nav-label">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User Menu */}
      <div className="sidebar-user-menu" ref={userMenuRef}>
        <div className="sidebar-user-dropdown" onKeyDown={handleUserMenuKeyDown}>
          <button
            className="sidebar-user-trigger"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            aria-expanded={isUserMenuOpen}
            aria-haspopup="menu"
            aria-label={`User menu for ${user?.name || 'User'}. Press Enter to open menu.`}
            title={isCollapsed ? (user?.name || 'User') : undefined}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="sidebar-user-avatar" aria-hidden="true" />
            ) : (
              <div className="sidebar-user-avatar-placeholder" aria-hidden="true">
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            {!isCollapsed && (
              <>
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">{user?.name || 'User'}</span>
                  <span className="sidebar-user-email">{user?.email || ''}</span>
                </div>
                <ChevronIcon isOpen={isUserMenuOpen} />
              </>
            )}
          </button>
          {isUserMenuOpen && (
            <div
              className="sidebar-user-dropdown-menu"
              role="menu"
              aria-label="User menu"
            >
              <button
                className={`sidebar-user-menu-item ${userMenuIndex === 0 ? 'focused' : ''}`}
                onClick={() => handleUserMenuItemClick('/profile')}
                role="menuitem"
                tabIndex={userMenuIndex === 0 ? 0 : -1}
              >
                <ProfileIcon />
                <span>Profile</span>
              </button>
              <button
                className={`sidebar-user-menu-item ${userMenuIndex === 1 ? 'focused' : ''}`}
                onClick={() => handleUserMenuItemClick('/settings')}
                role="menuitem"
                tabIndex={userMenuIndex === 1 ? 0 : -1}
              >
                <SettingsIcon />
                <span>Settings</span>
              </button>
              <button
                className={`sidebar-user-menu-item ${userMenuIndex === 2 ? 'focused' : ''}`}
                onClick={() => handleUserMenuItemClick('/api-keys')}
                role="menuitem"
                tabIndex={userMenuIndex === 2 ? 0 : -1}
              >
                <SettingsIcon />
                <span>API Keys</span>
              </button>
              <div className="sidebar-user-menu-divider" role="separator" aria-hidden="true" />
              <button
                className={`sidebar-user-menu-item sidebar-logout-item ${userMenuIndex === 3 ? 'focused' : ''}`}
                onClick={handleLogout}
                role="menuitem"
                tabIndex={userMenuIndex === 3 ? 0 : -1}
              >
                <LogoutIcon />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle button */}
      {onToggleCollapse && (
        <button
          className="sidebar-collapse-toggle"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className={isCollapsed ? 'rotated' : ''}
            aria-hidden="true"
          >
            <path d="M12 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </aside>
  );
}
