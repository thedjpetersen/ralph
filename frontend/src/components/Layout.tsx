import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAccountStore } from '../stores/account';
import './Layout.css';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentAccount, accounts, isLoading, fetchAccounts, switchAccount } =
    useAccountStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

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
          <div className="account-switcher">
            {isLoading ? (
              <span className="loading-text">Loading...</span>
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
        </div>
      </header>
      <main className="layout-main">
        <AnimatePresence mode="wait">
          <Outlet key={location.pathname} />
        </AnimatePresence>
      </main>
    </div>
  );
}
