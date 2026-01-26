import { useState, useCallback, useRef, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { MobileTabBar } from './MobileTabBar';
import { ToastContainer } from '../Toast';
import { KeyboardShortcutsHelp } from '../ui/KeyboardShortcutsHelp';
import { ScreenReaderAnnouncer } from '../ScreenReaderAnnouncer';
import { AIRewriteToolbar } from '../AIRewriteToolbar';
import { GhostRewritePreview } from '../GhostRewritePreview';
import { AIToneToolbar } from '../AIToneToolbar';
import { GhostTonePreview } from '../GhostTonePreview';
import { CommentHighlightOverlay } from '../CommentHighlightOverlay';
import { DocumentExportDialog } from '../DocumentExportDialog';
import { FormattingToolbar } from '../FormattingToolbar';
import { FindReplaceDialog } from '../FindReplaceDialog';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useFindReplaceStore } from '../../stores/findReplace';
import { useAccountStore } from '../../stores/account';
import { useUserStore } from '../../stores/user';
import './AppShell.css';

export interface AppShellProps {
  children?: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const { fetchAccounts } = useAccountStore();
  const { fetchUser } = useUserStore();
  const { openDialog: openFindReplace, closeDialog: closeFindReplace } = useFindReplaceStore();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);

  const mainContentRef = useRef<HTMLElement>(null);
  const previousPathnameRef = useRef(location.pathname);

  // Fetch accounts and user data on mount
  useEffect(() => {
    fetchAccounts();
    fetchUser();
  }, [fetchAccounts, fetchUser]);

  // Close mobile menu on route change - using ref to avoid lint warning
  useEffect(() => {
    if (previousPathnameRef.current !== location.pathname) {
      previousPathnameRef.current = location.pathname;
      // Use requestAnimationFrame to avoid synchronous setState in effect
      requestAnimationFrame(() => {
        setIsMobileMenuOpen(false);
      });
    }
  }, [location.pathname]);

  // Handle sidebar toggle
  const handleSidebarToggle = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  // Handle mobile menu toggle
  const handleMobileMenuToggle = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  // Skip to main content handler
  const handleSkipToContent = useCallback(
    (event: React.MouseEvent | React.KeyboardEvent) => {
      event.preventDefault();
      mainContentRef.current?.focus();
    },
    []
  );

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: '?',
      action: () => setIsShortcutsHelpOpen(true),
      description: 'Show keyboard shortcuts',
    },
    {
      key: 'Escape',
      action: () => {
        setIsMobileMenuOpen(false);
        setIsShortcutsHelpOpen(false);
        closeFindReplace();
      },
      description: 'Close menus',
      allowInInput: true,
    },
    {
      key: '[',
      action: handleSidebarToggle,
      description: 'Toggle sidebar',
    },
    {
      key: 'f',
      ctrlKey: true,
      action: () => openFindReplace(null, false),
      description: 'Find in document',
      allowInInput: true,
    },
    {
      key: 'f',
      ctrlKey: true,
      shiftKey: true,
      action: () => openFindReplace(null, true),
      description: 'Find and replace',
      allowInInput: true,
    },
    {
      key: 'h',
      ctrlKey: true,
      action: () => openFindReplace(null, true),
      description: 'Find and replace',
      allowInInput: true,
    },
  ]);

  return (
    <div className="app-shell">
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="app-shell-skip-link"
        onClick={handleSkipToContent}
        onKeyDown={(e) => e.key === 'Enter' && handleSkipToContent(e)}
      >
        Skip to main content
      </a>

      {/* Sidebar - hidden on mobile, visible on desktop */}
      <div
        className={`app-shell-sidebar-wrapper ${isMobileMenuOpen ? 'mobile-open' : ''}`}
      >
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleSidebarToggle}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <div
          className="app-shell-sidebar-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content area */}
      <div
        className={`app-shell-main-wrapper ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}
      >
        {/* Top navigation */}
        <TopNav
          onMobileMenuToggle={handleMobileMenuToggle}
          isMobileMenuOpen={isMobileMenuOpen}
        />

        {/* Main content */}
        <main
          id="main-content"
          className="app-shell-content"
          ref={mainContentRef}
          tabIndex={-1}
          role="main"
          aria-label="Main content"
        >
          <AnimatePresence mode="wait">
            {children || <Outlet key={location.pathname} />}
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile tab bar - visible on mobile only */}
      <MobileTabBar />

      {/* Global overlays and toolbars */}
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
      <CommentHighlightOverlay />
      <DocumentExportDialog />
      <FormattingToolbar />
      <FindReplaceDialog />
    </div>
  );
}
