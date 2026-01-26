import { useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { MobileTabBar } from './MobileTabBar';
import { ToastContainer } from '../Toast';
import { KeyboardShortcutsHelp } from '../ui/KeyboardShortcutsHelp';
import { ScreenReaderAnnouncer } from '../ScreenReaderAnnouncer';
import { CommandPalette } from '../CommandPalette';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useFindReplaceStore } from '../../stores/findReplace';
import { useParagraphFocusStore } from '../../stores/paragraphFocus';
import { useTypewriterScrollStore } from '../../stores/typewriterScroll';
import { useAccountStore } from '../../stores/account';
import { useUserStore } from '../../stores/user';
import { useOnboarding } from '../../stores/onboarding';
import { useCommandPaletteStore } from '../../stores/commandPalette';
import './AppShell.css';

// Lazy-load heavy feature components to reduce initial bundle size
// These components use framer-motion and are not needed on initial render
const AIRewriteToolbar = lazy(() => import('../AIRewriteToolbar').then(m => ({ default: m.AIRewriteToolbar })));
const GhostRewritePreview = lazy(() => import('../GhostRewritePreview').then(m => ({ default: m.GhostRewritePreview })));
const AIToneToolbar = lazy(() => import('../AIToneToolbar').then(m => ({ default: m.AIToneToolbar })));
const GhostTonePreview = lazy(() => import('../GhostTonePreview').then(m => ({ default: m.GhostTonePreview })));
const CommentHighlightOverlay = lazy(() => import('../CommentHighlightOverlay').then(m => ({ default: m.CommentHighlightOverlay })));
const DocumentExportDialog = lazy(() => import('../DocumentExportDialog').then(m => ({ default: m.DocumentExportDialog })));
const FormattingToolbar = lazy(() => import('../FormattingToolbar').then(m => ({ default: m.FormattingToolbar })));
const FindReplaceDialog = lazy(() => import('../FindReplaceDialog').then(m => ({ default: m.FindReplaceDialog })));
const ParagraphFocusOverlay = lazy(() => import('../ParagraphFocusOverlay').then(m => ({ default: m.ParagraphFocusOverlay })));
const TypewriterScrollManager = lazy(() => import('../TypewriterScrollManager').then(m => ({ default: m.TypewriterScrollManager })));
const OnboardingTour = lazy(() => import('../OnboardingTour').then(m => ({ default: m.OnboardingTour })));

export interface AppShellProps {
  children?: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const { fetchAccounts } = useAccountStore();
  const { fetchUser } = useUserStore();
  const { openDialog: openFindReplace, closeDialog: closeFindReplace } = useFindReplaceStore();
  const { toggle: toggleParagraphFocus } = useParagraphFocusStore();
  const { toggle: toggleTypewriterScroll } = useTypewriterScrollStore();
  const { shouldShowTour, startTour } = useOnboarding();
  const { togglePalette: toggleCommandPalette, closePalette: closeCommandPalette } = useCommandPaletteStore();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [hasTriggeredTour, setHasTriggeredTour] = useState(false);

  const mainContentRef = useRef<HTMLElement>(null);
  const previousPathnameRef = useRef(location.pathname);

  // Fetch accounts and user data on mount
  useEffect(() => {
    fetchAccounts();
    fetchUser();
  }, [fetchAccounts, fetchUser]);

  // Trigger onboarding tour on first login
  useEffect(() => {
    if (shouldShowTour && !hasTriggeredTour) {
      // Small delay to let the UI render first
      const timer = setTimeout(() => {
        startTour();
        setHasTriggeredTour(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shouldShowTour, hasTriggeredTour, startTour]);

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
      key: 'k',
      metaKey: true,
      action: toggleCommandPalette,
      description: 'Open command palette',
      allowInInput: true,
    },
    {
      key: 'k',
      ctrlKey: true,
      action: toggleCommandPalette,
      description: 'Open command palette',
      allowInInput: true,
    },
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
        closeCommandPalette();
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
    {
      key: 'f',
      metaKey: true,
      shiftKey: true,
      action: toggleParagraphFocus,
      description: 'Toggle paragraph focus mode',
      allowInInput: true,
    },
    {
      key: 't',
      metaKey: true,
      shiftKey: true,
      action: toggleTypewriterScroll,
      description: 'Toggle typewriter scroll mode',
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
          {children || <Outlet key={location.pathname} />}
        </main>
      </div>

      {/* Mobile tab bar - visible on mobile only */}
      <MobileTabBar />

      {/* Global overlays and toolbars */}
      <ToastContainer />
      <CommandPalette />
      <KeyboardShortcutsHelp
        isOpen={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
      />
      <ScreenReaderAnnouncer />

      {/* Lazy-loaded feature overlays - loaded asynchronously to reduce initial bundle */}
      <Suspense fallback={null}>
        <GhostRewritePreview />
        <AIRewriteToolbar />
        <GhostTonePreview />
        <AIToneToolbar />
        <CommentHighlightOverlay />
        <DocumentExportDialog />
        <FormattingToolbar />
        <FindReplaceDialog />
        <ParagraphFocusOverlay />
        <TypewriterScrollManager />
        <OnboardingTour />
      </Suspense>
    </div>
  );
}
