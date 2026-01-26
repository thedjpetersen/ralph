import { useState, useCallback, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useCommandPaletteStore } from '../../stores/commandPalette';
import './MobileTabBar.css';

// Custom hook for scroll-based hide/show behavior
function useScrollDirection() {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const scrollDelta = currentScrollY - lastScrollY.current;

          // Only hide/show after a minimum scroll threshold (10px)
          if (Math.abs(scrollDelta) > 10) {
            if (scrollDelta > 0 && currentScrollY > 50) {
              // Scrolling down and past initial threshold - hide
              setIsVisible(false);
            } else if (scrollDelta < 0) {
              // Scrolling up - show
              setIsVisible(true);
            }
          }

          // Always show at the top of the page
          if (currentScrollY < 10) {
            setIsVisible(true);
          }

          lastScrollY.current = currentScrollY;
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return isVisible;
}

export function MobileTabBar() {
  const location = useLocation();
  const { togglePalette } = useCommandPaletteStore();
  const isVisible = useScrollDirection();
  const [isAIMenuOpen, setIsAIMenuOpen] = useState(false);

  const handleAIClick = useCallback(() => {
    // Open command palette filtered to AI commands
    togglePalette();
  }, [togglePalette]);

  const handleAIMenuClose = useCallback(() => {
    setIsAIMenuOpen(false);
  }, []);

  // Check if current path is an AI-related route
  const isAIActive = location.pathname.includes('/ai-') || isAIMenuOpen;

  // Check if current path is a document/editor route
  const isEditorActive = location.pathname.startsWith('/receipts/upload') ||
    location.pathname.includes('/edit');

  return (
    <>
      {/* Overlay for AI menu */}
      {isAIMenuOpen && (
        <div
          className="mobile-tab-bar-overlay"
          onClick={handleAIMenuClose}
          aria-hidden="true"
        />
      )}

      <nav
        className={`mobile-tab-bar ${isVisible ? '' : 'mobile-tab-bar-hidden'}`}
        role="navigation"
        aria-label="Mobile navigation"
      >
        {/* Documents Tab */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `mobile-tab-bar-item ${isActive ? 'active' : ''}`
          }
          aria-label="Documents"
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
              d="M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9 7h6M9 11h6M9 15h4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span className="mobile-tab-bar-label">Documents</span>
        </NavLink>

        {/* Editor Tab */}
        <NavLink
          to="/receipts/upload"
          className={() =>
            `mobile-tab-bar-item ${isEditorActive ? 'active' : ''}`
          }
          aria-label="Editor"
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
              d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="mobile-tab-bar-label">Editor</span>
        </NavLink>

        {/* AI Tab (center, prominent) */}
        <button
          className={`mobile-tab-bar-item mobile-tab-bar-ai ${isAIActive ? 'active' : ''}`}
          onClick={handleAIClick}
          aria-label="AI features"
        >
          <span className="mobile-tab-bar-ai-button">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="mobile-tab-bar-label">AI</span>
        </button>

        {/* Profile Tab */}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `mobile-tab-bar-item ${isActive || location.pathname.startsWith('/profile') ? 'active' : ''}`
          }
          aria-label="Profile"
        >
          <svg
            className="mobile-tab-bar-icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="8"
              r="4"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M4 20c0-4 4-6 8-6s8 2 8 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span className="mobile-tab-bar-label">Profile</span>
        </NavLink>
      </nav>
    </>
  );
}
