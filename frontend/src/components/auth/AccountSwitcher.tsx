import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccountStore } from '../../stores/account';
import { AccountSwitcherSkeleton } from '../skeletons';
import './AccountSwitcher.css';

export interface AccountSwitcherProps {
  /** Whether to show Account Settings and Manage Members options */
  showActions?: boolean;
  /** Callback when account is switched */
  onAccountSwitch?: (accountId: string) => void;
  /** Custom class name */
  className?: string;
}

export function AccountSwitcher({
  showActions = true,
  onAccountSwitch,
  className = '',
}: AccountSwitcherProps) {
  const navigate = useNavigate();
  const { currentAccount, accounts, isLoading, switchAccount } = useAccountStore();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Total menu items: accounts + divider + actions (if shown)
  const actionCount = showActions ? 2 : 0;
  const totalItems = accounts.length + actionCount;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAccountSelect = useCallback(
    (accountId: string) => {
      switchAccount(accountId);
      setIsOpen(false);
      setFocusedIndex(-1);
      onAccountSwitch?.(accountId);
    },
    [switchAccount, onAccountSwitch]
  );

  const handleAccountSettings = useCallback(() => {
    if (currentAccount) {
      navigate(`/accounts/${currentAccount.id}/settings`);
    }
    setIsOpen(false);
    setFocusedIndex(-1);
  }, [currentAccount, navigate]);

  const handleManageMembers = useCallback(() => {
    if (currentAccount) {
      navigate(`/accounts/${currentAccount.id}/members`);
    }
    setIsOpen(false);
    setFocusedIndex(-1);
  }, [currentAccount, navigate]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isOpen) {
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
          event.preventDefault();
          setIsOpen(true);
          setFocusedIndex(0);
        }
        return;
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
          break;
        case 'Home':
          event.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          event.preventDefault();
          setFocusedIndex(totalItems - 1);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < accounts.length) {
            handleAccountSelect(accounts[focusedIndex].id);
          } else if (showActions && focusedIndex === accounts.length) {
            handleAccountSettings();
          } else if (showActions && focusedIndex === accounts.length + 1) {
            handleManageMembers();
          }
          break;
        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
          triggerRef.current?.focus();
          break;
        case 'Tab':
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
      }
    },
    [
      isOpen,
      focusedIndex,
      accounts,
      totalItems,
      showActions,
      handleAccountSelect,
      handleAccountSettings,
      handleManageMembers,
    ]
  );

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setFocusedIndex(-1);
    }
  };

  if (isLoading) {
    return <AccountSwitcherSkeleton />;
  }

  if (!currentAccount) {
    return (
      <div className={`account-switcher-empty ${className}`}>
        <span className="account-switcher-placeholder">No account selected</span>
      </div>
    );
  }

  return (
    <div
      className={`account-switcher-container ${className}`}
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        className="account-switcher-trigger"
        onClick={toggleDropdown}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls="account-switcher-menu"
        aria-label={`Current account: ${currentAccount.name}. Press Enter to switch accounts.`}
      >
        <span className="account-switcher-name">{currentAccount.name}</span>
        <svg
          className={`account-switcher-arrow ${isOpen ? 'open' : ''}`}
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

      {isOpen && (
        <div
          id="account-switcher-menu"
          className="account-switcher-menu"
          role="menu"
          aria-label="Account menu"
        >
          <div className="account-switcher-section" role="group" aria-label="Switch Account">
            <div className="account-switcher-section-title" id="switch-account-label">
              Switch Account
            </div>
            {accounts.map((account, index) => (
              <button
                key={account.id}
                className={`account-switcher-item ${
                  account.id === currentAccount.id ? 'active' : ''
                } ${focusedIndex === index ? 'focused' : ''}`}
                onClick={() => handleAccountSelect(account.id)}
                role="menuitemradio"
                aria-checked={account.id === currentAccount.id}
                tabIndex={focusedIndex === index ? 0 : -1}
              >
                <span className="account-switcher-item-name">{account.name}</span>
                {account.id === currentAccount.id && (
                  <svg
                    className="account-switcher-check"
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

          {showActions && (
            <>
              <div className="account-switcher-divider" role="separator" aria-hidden="true" />
              <div className="account-switcher-section" role="group" aria-label="Account actions">
                <button
                  className={`account-switcher-item ${
                    focusedIndex === accounts.length ? 'focused' : ''
                  }`}
                  onClick={handleAccountSettings}
                  role="menuitem"
                  tabIndex={focusedIndex === accounts.length ? 0 : -1}
                >
                  Account Settings
                </button>
                <button
                  className={`account-switcher-item ${
                    focusedIndex === accounts.length + 1 ? 'focused' : ''
                  }`}
                  onClick={handleManageMembers}
                  role="menuitem"
                  tabIndex={focusedIndex === accounts.length + 1 ? 0 : -1}
                >
                  Manage Members
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
