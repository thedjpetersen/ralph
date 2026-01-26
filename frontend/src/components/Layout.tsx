import { useEffect, useState, useRef, useCallback, type TouchEvent as ReactTouchEvent } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAccountStore } from '../stores/account';
import { useUserStore } from '../stores/user';
import { AccountSwitcherSkeleton } from './skeletons';
import { ToastContainer } from './Toast';
import { KeyboardShortcutsHelp } from './ui/KeyboardShortcutsHelp';
import { ScreenReaderAnnouncer } from './ScreenReaderAnnouncer';
import { AIRewriteToolbar } from './AIRewriteToolbar';
import { GhostRewritePreview } from './GhostRewritePreview';
import { AIToneToolbar } from './AIToneToolbar';
import { GhostTonePreview } from './GhostTonePreview';
import { AICustomPromptToolbar } from './AICustomPromptToolbar';
import { CommentHighlightOverlay } from './CommentHighlightOverlay';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { MobileTabBar } from './layout/MobileTabBar';
import { OptimisticSyncIndicator } from './OptimisticSyncIndicator';
import { WritingGoalProgress } from './WritingGoalProgress';
import { GoalCelebration } from './GoalCelebration';
import { WritingStatsModal } from './WritingStatsModal';
import './Layout.css';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentAccount, accounts, isLoading, fetchAccounts, switchAccount } =
    useAccountStore();
  const { user, fetchUser, logout } = useUserStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [accountMenuIndex, setAccountMenuIndex] = useState(-1);
  const [userMenuIndex, setUserMenuIndex] = useState(-1);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const userTriggerRef = useRef<HTMLButtonElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    fetchAccounts();
    fetchUser();
  }, [fetchAccounts, fetchUser]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
        setUserMenuIndex(-1);
      }
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setAccountMenuIndex(-1);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        !(event.target as Element)?.closest('.mobile-menu-trigger')
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on escape key
  const handleMobileMenuKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsMobileMenuOpen(false);
    }
  }, []);

  // Handle swipe gestures for mobile menu
  const handleTouchStart = useCallback((e: ReactTouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: ReactTouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return;

    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    const diffY = touchStartY.current - touchEndY;
    const diffX = Math.abs(touchStartX.current - touchEndX);

    // Swipe up to close (if vertical swipe > 50px and mostly vertical)
    if (diffY > 50 && diffY > diffX) {
      setIsMobileMenuOpen(false);
    }

    touchStartY.current = null;
    touchStartX.current = null;
  }, []);

  // Keyboard navigation for account dropdown
  const handleAccountKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const menuItems = accounts.length + 2; // accounts + settings + members

      switch (event.key) {
        case 'Escape':
          setIsDropdownOpen(false);
          setAccountMenuIndex(-1);
          accountTriggerRef.current?.focus();
          event.preventDefault();
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (!isDropdownOpen) {
            setIsDropdownOpen(true);
            setAccountMenuIndex(0);
          } else {
            setAccountMenuIndex((prev) => (prev + 1) % menuItems);
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (!isDropdownOpen) {
            setIsDropdownOpen(true);
            setAccountMenuIndex(menuItems - 1);
          } else {
            setAccountMenuIndex((prev) => (prev - 1 + menuItems) % menuItems);
          }
          break;
        case 'Enter':
        case ' ':
          if (!isDropdownOpen) {
            event.preventDefault();
            setIsDropdownOpen(true);
            setAccountMenuIndex(0);
          }
          break;
        case 'Tab':
          if (isDropdownOpen) {
            setIsDropdownOpen(false);
            setAccountMenuIndex(-1);
          }
          break;
      }
    },
    [accounts.length, isDropdownOpen]
  );

  // Keyboard navigation for user menu
  const userMenuItems = ['profile', 'settings', 'api-keys', 'logout'];
  const handleUserMenuKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const menuItemsCount = userMenuItems.length;

      switch (event.key) {
        case 'Escape':
          setIsUserMenuOpen(false);
          setUserMenuIndex(-1);
          userTriggerRef.current?.focus();
          event.preventDefault();
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (!isUserMenuOpen) {
            setIsUserMenuOpen(true);
            setUserMenuIndex(0);
          } else {
            setUserMenuIndex((prev) => (prev + 1) % menuItemsCount);
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (!isUserMenuOpen) {
            setIsUserMenuOpen(true);
            setUserMenuIndex(menuItemsCount - 1);
          } else {
            setUserMenuIndex((prev) => (prev - 1 + menuItemsCount) % menuItemsCount);
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
    },
    [isUserMenuOpen, userMenuItems.length]
  );

  // Skip to main content handler
  const handleSkipToContent = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.preventDefault();
    mainContentRef.current?.focus();
  };

  const handleAccountSwitch = (accountId: string) => {
    switchAccount(accountId);
    setIsDropdownOpen(false);
    setAccountMenuIndex(-1);
    accountTriggerRef.current?.focus();
  };

  const handleAccountSettings = () => {
    if (currentAccount) {
      navigate(`/accounts/${currentAccount.id}/settings`);
      setIsDropdownOpen(false);
      setAccountMenuIndex(-1);
    }
  };

  const handleAccountMembers = () => {
    if (currentAccount) {
      navigate(`/accounts/${currentAccount.id}/members`);
      setIsDropdownOpen(false);
      setAccountMenuIndex(-1);
    }
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    setUserMenuIndex(-1);
    navigate('/');
  };

  const handleUserMenuItemClick = (path: string) => {
    navigate(path);
    setIsUserMenuOpen(false);
    setUserMenuIndex(-1);
  };

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: '?',
      action: () => setIsShortcutsHelpOpen(true),
      description: 'Show keyboard shortcuts',
    },
    {
      key: 'h',
      action: () => navigate('/'),
      description: 'Go to home',
    },
    {
      key: 'Escape',
      action: () => {
        setIsDropdownOpen(false);
        setIsUserMenuOpen(false);
        setIsMobileMenuOpen(false);
        setAccountMenuIndex(-1);
        setUserMenuIndex(-1);
      },
      description: 'Close menus',
      allowInInput: true,
    },
  ]);

  return (
    <div className="layout">
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="skip-to-content"
        onClick={handleSkipToContent}
        onKeyDown={(e) => e.key === 'Enter' && handleSkipToContent(e)}
      >
        Skip to main content
      </a>

      <header className="layout-header" role="banner">
        <div className="layout-header-content">
          {/* Mobile hamburger menu button */}
          <button
            className="mobile-menu-trigger"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            <span className={`hamburger-icon ${isMobileMenuOpen ? 'open' : ''}`} aria-hidden="true">
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </span>
          </button>

          <Link to="/" className="layout-logo" aria-label="ClockZen home">
            ClockZen
          </Link>
          <nav className="layout-nav desktop-nav" role="navigation" aria-label="Main navigation">
            <Link to="/accounts" className="nav-link">
              Accounts
            </Link>
          </nav>
          <div className="header-actions">
            <div className="account-switcher" ref={accountMenuRef}>
              {isLoading ? (
                <AccountSwitcherSkeleton />
              ) : currentAccount ? (
                <div className="dropdown" onKeyDown={handleAccountKeyDown}>
                  <button
                    ref={accountTriggerRef}
                    className="dropdown-trigger"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    aria-expanded={isDropdownOpen}
                    aria-haspopup="menu"
                    aria-controls="account-menu"
                    aria-label={`Current account: ${currentAccount.name}. Press Enter to switch accounts.`}
                  >
                    <span className="account-name">{currentAccount.name}</span>
                    <svg
                      className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.5 4.5L6 8L9.5 4.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  {isDropdownOpen && (
                    <div
                      id="account-menu"
                      className="dropdown-menu"
                      role="menu"
                      aria-label="Account menu"
                    >
                      <div className="dropdown-section" role="group" aria-label="Switch Account">
                        <div className="dropdown-section-title" id="switch-account-label">
                          Switch Account
                        </div>
                        {accounts.map((account, index) => (
                          <button
                            key={account.id}
                            className={`dropdown-item ${
                              account.id === currentAccount.id ? 'active' : ''
                            } ${accountMenuIndex === index ? 'focused' : ''}`}
                            onClick={() => handleAccountSwitch(account.id)}
                            role="menuitemradio"
                            aria-checked={account.id === currentAccount.id}
                            tabIndex={accountMenuIndex === index ? 0 : -1}
                          >
                            <span className="account-item-name">{account.name}</span>
                            {account.id === currentAccount.id && (
                              <svg
                                className="check-icon"
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                                aria-hidden="true"
                              >
                                <path
                                  d="M3.5 8L6.5 11L12.5 5"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="dropdown-divider" role="separator" aria-hidden="true" />
                      <div className="dropdown-section" role="group" aria-label="Account actions">
                        <button
                          className={`dropdown-item ${accountMenuIndex === accounts.length ? 'focused' : ''}`}
                          onClick={handleAccountSettings}
                          role="menuitem"
                          tabIndex={accountMenuIndex === accounts.length ? 0 : -1}
                        >
                          Account Settings
                        </button>
                        <button
                          className={`dropdown-item ${accountMenuIndex === accounts.length + 1 ? 'focused' : ''}`}
                          onClick={handleAccountMembers}
                          role="menuitem"
                          tabIndex={accountMenuIndex === accounts.length + 1 ? 0 : -1}
                        >
                          Manage Members
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/accounts" className="nav-link">
                  Select Account
                </Link>
              )}
            </div>

            <div className="user-menu" ref={userMenuRef} onKeyDown={handleUserMenuKeyDown}>
              <button
                ref={userTriggerRef}
                className="user-menu-trigger"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                aria-expanded={isUserMenuOpen}
                aria-haspopup="menu"
                aria-controls="user-menu-dropdown"
                aria-label={`User menu for ${user?.name || 'User'}. Press Enter to open menu.`}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="user-avatar" aria-hidden="true" />
                ) : (
                  <div className="user-avatar-placeholder" aria-hidden="true">
                    {user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
              </button>
              {isUserMenuOpen && (
                <div
                  id="user-menu-dropdown"
                  className="dropdown-menu user-dropdown"
                  role="menu"
                  aria-label="User menu"
                >
                  <div className="dropdown-section">
                    <div className="user-info" role="presentation">
                      <span className="user-name">{user?.name || 'User'}</span>
                      <span className="user-email">{user?.email || ''}</span>
                    </div>
                  </div>
                  <div className="dropdown-divider" role="separator" aria-hidden="true" />
                  <div className="dropdown-section" role="group">
                    <button
                      className={`dropdown-item ${userMenuIndex === 0 ? 'focused' : ''}`}
                      onClick={() => handleUserMenuItemClick('/profile')}
                      role="menuitem"
                      tabIndex={userMenuIndex === 0 ? 0 : -1}
                    >
                      Profile
                    </button>
                    <button
                      className={`dropdown-item ${userMenuIndex === 1 ? 'focused' : ''}`}
                      onClick={() => handleUserMenuItemClick('/settings')}
                      role="menuitem"
                      tabIndex={userMenuIndex === 1 ? 0 : -1}
                    >
                      Settings
                    </button>
                    <button
                      className={`dropdown-item ${userMenuIndex === 2 ? 'focused' : ''}`}
                      onClick={() => handleUserMenuItemClick('/api-keys')}
                      role="menuitem"
                      tabIndex={userMenuIndex === 2 ? 0 : -1}
                    >
                      API Keys
                    </button>
                  </div>
                  <div className="dropdown-divider" role="separator" aria-hidden="true" />
                  <div className="dropdown-section" role="group">
                    <button
                      className={`dropdown-item logout-item ${userMenuIndex === 3 ? 'focused' : ''}`}
                      onClick={handleLogout}
                      role="menuitem"
                      tabIndex={userMenuIndex === 3 ? 0 : -1}
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile navigation drawer */}
        {isMobileMenuOpen && (
          <div
            id="mobile-menu"
            className="mobile-menu"
            ref={mobileMenuRef}
            role="navigation"
            aria-label="Mobile navigation"
            onKeyDown={handleMobileMenuKeyDown}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="mobile-menu-swipe-indicator" aria-hidden="true" />
            <nav className="mobile-nav">
              <Link to="/accounts" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                <svg className="mobile-nav-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M10 2L3 7v11h5v-6h4v6h5V7l-7-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Accounts
              </Link>
              <Link to="/receipts" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                <svg className="mobile-nav-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M4 3h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1zm2 4h8m-8 3h8m-8 3h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Receipts
              </Link>
              <Link to="/transactions" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                <svg className="mobile-nav-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M3 10h14M3 5h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Transactions
              </Link>
              <Link to="/reports" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                <svg className="mobile-nav-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M4 17V8m4 9V3m4 14v-6m4 6V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Reports
              </Link>
            </nav>
            <div className="mobile-menu-divider" aria-hidden="true" />
            <div className="mobile-menu-section">
              <span className="mobile-menu-section-title">Account</span>
              {currentAccount && (
                <span className="mobile-current-account">{currentAccount.name}</span>
              )}
            </div>
            <div className="mobile-menu-divider" aria-hidden="true" />
            <nav className="mobile-nav mobile-nav-secondary">
              <Link to="/profile" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                Profile
              </Link>
              <Link to="/settings" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                Settings
              </Link>
              <Link to="/api-keys" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                API Keys
              </Link>
              <button
                className="mobile-nav-link mobile-logout-button"
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
              >
                Log Out
              </button>
            </nav>
          </div>
        )}
        {isMobileMenuOpen && <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)} aria-hidden="true" />}
      </header>
      <main
        id="main-content"
        className="layout-main"
        ref={mainContentRef}
        tabIndex={-1}
        role="main"
        aria-label="Main content"
      >
        <AnimatePresence mode="wait">
          <Outlet key={location.pathname} />
        </AnimatePresence>
      </main>
      <ToastContainer />
      <KeyboardShortcutsHelp
        isOpen={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
      />
      <ScreenReaderAnnouncer />
      <GhostRewritePreview />
      <AIRewriteToolbar />
      <GhostTonePreview />
      <AIToneToolbar />
      <AICustomPromptToolbar />
      <CommentHighlightOverlay />
      <MobileTabBar />
      <WritingGoalProgress position="bottom-left" />
      <OptimisticSyncIndicator position="bottom-right" />
      <GoalCelebration />
      <WritingStatsModal />
    </div>
  );
}
