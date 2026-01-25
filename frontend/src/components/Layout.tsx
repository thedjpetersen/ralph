import { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAccountStore } from '../stores/account';
import { useUserStore } from '../stores/user';
import { AccountSwitcherSkeleton } from './skeletons';
import { ToastContainer } from './Toast';
import './Layout.css';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentAccount, accounts, isLoading, fetchAccounts, switchAccount } =
    useAccountStore();
  const { user, fetchUser, logout } = useUserStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

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
      }
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAccountSwitch = (accountId: string) => {
    switchAccount(accountId);
    setIsDropdownOpen(false);
  };

  const handleAccountSettings = () => {
    if (currentAccount) {
      navigate(`/accounts/${currentAccount.id}/settings`);
      setIsDropdownOpen(false);
    }
  };

  const handleAccountMembers = () => {
    if (currentAccount) {
      navigate(`/accounts/${currentAccount.id}/members`);
      setIsDropdownOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    navigate('/');
  };

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="layout-header-content">
          <Link to="/" className="layout-logo">
            ClockZen
          </Link>
          <nav className="layout-nav">
            <Link to="/accounts" className="nav-link">
              Accounts
            </Link>
          </nav>
          <div className="header-actions">
            <div className="account-switcher" ref={accountMenuRef}>
              {isLoading ? (
                <AccountSwitcherSkeleton />
              ) : currentAccount ? (
                <div className="dropdown">
                  <button
                    className="dropdown-trigger"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    aria-expanded={isDropdownOpen}
                    aria-haspopup="true"
                  >
                    <span className="account-name">{currentAccount.name}</span>
                    <svg
                      className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
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
                    <div className="dropdown-menu">
                      <div className="dropdown-section">
                        <div className="dropdown-section-title">Switch Account</div>
                        {accounts.map((account) => (
                          <button
                            key={account.id}
                            className={`dropdown-item ${
                              account.id === currentAccount.id ? 'active' : ''
                            }`}
                            onClick={() => handleAccountSwitch(account.id)}
                          >
                            <span className="account-item-name">{account.name}</span>
                            {account.id === currentAccount.id && (
                              <svg
                                className="check-icon"
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
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
                      <div className="dropdown-divider" />
                      <div className="dropdown-section">
                        <button
                          className="dropdown-item"
                          onClick={handleAccountSettings}
                        >
                          Account Settings
                        </button>
                        <button
                          className="dropdown-item"
                          onClick={handleAccountMembers}
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

            <div className="user-menu" ref={userMenuRef}>
              <button
                className="user-menu-trigger"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                aria-expanded={isUserMenuOpen}
                aria-haspopup="true"
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="user-avatar" />
                ) : (
                  <div className="user-avatar-placeholder">
                    {user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
              </button>
              {isUserMenuOpen && (
                <div className="dropdown-menu user-dropdown">
                  <div className="dropdown-section">
                    <div className="user-info">
                      <span className="user-name">{user?.name || 'User'}</span>
                      <span className="user-email">{user?.email || ''}</span>
                    </div>
                  </div>
                  <div className="dropdown-divider" />
                  <div className="dropdown-section">
                    <Link
                      to="/profile"
                      className="dropdown-item"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="dropdown-item"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Settings
                    </Link>
                    <Link
                      to="/api-keys"
                      className="dropdown-item"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      API Keys
                    </Link>
                  </div>
                  <div className="dropdown-divider" />
                  <div className="dropdown-section">
                    <button className="dropdown-item logout-item" onClick={handleLogout}>
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="layout-main">
        <AnimatePresence mode="wait">
          <Outlet key={location.pathname} />
        </AnimatePresence>
      </main>
      <ToastContainer />
    </div>
  );
}
