import { useState, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import './MobileTabBar.css';

interface MoreMenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const moreMenuItems: MoreMenuItem[] = [
  {
    label: 'Budgets',
    path: '/budgets',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M10 6v8M6 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'Stores',
    path: '/stores',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 7l2-4h10l2 4M3 7v9a1 1 0 001 1h12a1 1 0 001-1V7M3 7h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: 'Accounts',
    path: '/accounts',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 8h14" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M10 2v2M10 16v2M18 10h-2M4 10H2M15.66 4.34l-1.42 1.42M5.76 14.24l-1.42 1.42M15.66 15.66l-1.42-1.42M5.76 5.76L4.34 4.34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export function MobileTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const handleAddClick = useCallback(() => {
    // Navigate to receipt upload as the primary "Add" action
    navigate('/receipts/upload');
  }, [navigate]);

  const handleMoreClick = useCallback(() => {
    setIsMoreMenuOpen((prev) => !prev);
  }, []);

  const handleMoreMenuClose = useCallback(() => {
    setIsMoreMenuOpen(false);
  }, []);

  const handleMoreMenuItemClick = useCallback((path: string) => {
    navigate(path);
    setIsMoreMenuOpen(false);
  }, [navigate]);

  // Check if current path matches any of the more menu items
  const isMoreMenuActive = moreMenuItems.some((item) =>
    location.pathname.startsWith(item.path)
  );

  return (
    <>
      {/* Overlay for More menu */}
      {isMoreMenuOpen && (
        <div
          className="mobile-tab-bar-overlay"
          onClick={handleMoreMenuClose}
          aria-hidden="true"
        />
      )}

      {/* More menu popup */}
      {isMoreMenuOpen && (
        <div
          className="mobile-tab-bar-more-menu"
          role="menu"
          aria-label="More navigation options"
        >
          {moreMenuItems.map((item) => (
            <button
              key={item.path}
              className={`mobile-tab-bar-more-item ${
                location.pathname.startsWith(item.path) ? 'active' : ''
              }`}
              onClick={() => handleMoreMenuItemClick(item.path)}
              role="menuitem"
            >
              <span className="mobile-tab-bar-more-icon">{item.icon}</span>
              <span className="mobile-tab-bar-more-label">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      <nav className="mobile-tab-bar" role="navigation" aria-label="Mobile navigation">
        {/* Home Tab */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `mobile-tab-bar-item ${isActive ? 'active' : ''}`
          }
          aria-label="Home"
        >
          <svg
            className="mobile-tab-bar-icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V10.5z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="mobile-tab-bar-label">Home</span>
        </NavLink>

        {/* Receipts Tab */}
        <NavLink
          to="/receipts"
          className={({ isActive }) =>
            `mobile-tab-bar-item ${isActive || location.pathname.startsWith('/receipts') ? 'active' : ''}`
          }
          aria-label="Receipts"
        >
          <svg
            className="mobile-tab-bar-icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 4h14a1 1 0 011 1v14l-2.5-1.5L15 19l-2.5-1.5L10 19l-2.5-1.5L5 19V5a1 1 0 011-1z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9 9h6M9 13h4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span className="mobile-tab-bar-label">Receipts</span>
        </NavLink>

        {/* Add Tab (center, prominent) */}
        <button
          className="mobile-tab-bar-item mobile-tab-bar-add"
          onClick={handleAddClick}
          aria-label="Add receipt"
        >
          <span className="mobile-tab-bar-add-button">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="mobile-tab-bar-label">Add</span>
        </button>

        {/* Purchases Tab */}
        <NavLink
          to="/transactions"
          className={({ isActive }) =>
            `mobile-tab-bar-item ${isActive || location.pathname.startsWith('/transactions') ? 'active' : ''}`
          }
          aria-label="Purchases"
        >
          <svg
            className="mobile-tab-bar-icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="mobile-tab-bar-label">Purchases</span>
        </NavLink>

        {/* More Tab */}
        <button
          className={`mobile-tab-bar-item ${isMoreMenuActive || isMoreMenuOpen ? 'active' : ''}`}
          onClick={handleMoreClick}
          aria-expanded={isMoreMenuOpen}
          aria-haspopup="menu"
          aria-label="More options"
        >
          <svg
            className="mobile-tab-bar-icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="12" cy="5" r="1.5" fill="currentColor" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            <circle cx="12" cy="19" r="1.5" fill="currentColor" />
          </svg>
          <span className="mobile-tab-bar-label">More</span>
        </button>
      </nav>
    </>
  );
}
