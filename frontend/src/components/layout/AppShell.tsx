import { useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { MobileTabBar } from './MobileTabBar';
import { DocumentTabs } from '../DocumentTabs';
import { ToastContainer } from '../Toast';
import { KeyboardShortcutsHelp } from '../ui/KeyboardShortcutsHelp';
import { KeyboardShortcutsViewer } from '../ui/KeyboardShortcutsViewer';
import { ScreenReaderAnnouncer } from '../ScreenReaderAnnouncer';
import { CommandPalette } from '../CommandPalette';
import { QuickSwitcher } from '../QuickSwitcher';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useFindReplaceStore } from '../../stores/findReplace';
import { useKeyboardShortcutsStore } from '../../stores/keyboardShortcuts';
import { useParagraphFocusStore, useParagraphFocus } from '../../stores/paragraphFocus';
import { useTypewriterScrollStore } from '../../stores/typewriterScroll';
import { useAccountStore } from '../../stores/account';
import { useUserStore } from '../../stores/user';
import { useOnboarding } from '../../stores/onboarding';
import { useCommandPaletteStore } from '../../stores/commandPalette';
import { useQuickSwitcherStore } from '../../stores/quickSwitcher';
import { useAIToneAnalyzerStore } from '../../stores/aiToneAnalyzer';
import { useAIVocabularyEnhancerStore } from '../../stores/aiVocabularyEnhancer';
import { useAIReadabilityStore } from '../../stores/aiReadability';
import { useCommentNavigation } from '../../stores/commentHighlight';
import { useDocumentFoldersStore } from '../../stores/documentFolders';
import { useStarredDocumentsStore } from '../../stores/starredDocuments';
import { useTableOfContentsStore } from '../../stores/tableOfContents';
import { useWelcomeModal } from '../../stores/welcomeModal';
import { useAppSettingsStore } from '../../stores/appSettings';
import { useOpenDocumentsStore } from '../../stores/openDocuments';
import './AppShell.css';

// Lazy-load heavy feature components to reduce initial bundle size
// These components use framer-motion and are not needed on initial render
const AIRewriteToolbar = lazy(() => import('../AIRewriteToolbar').then(m => ({ default: m.AIRewriteToolbar })));
const GhostRewritePreview = lazy(() => import('../GhostRewritePreview').then(m => ({ default: m.GhostRewritePreview })));
const AIToneToolbar = lazy(() => import('../AIToneToolbar').then(m => ({ default: m.AIToneToolbar })));
const GhostTonePreview = lazy(() => import('../GhostTonePreview').then(m => ({ default: m.GhostTonePreview })));
const CommentHighlightOverlay = lazy(() => import('../CommentHighlightOverlay').then(m => ({ default: m.CommentHighlightOverlay })));
const DocumentExportDialog = lazy(() => import('../DocumentExportDialog').then(m => ({ default: m.DocumentExportDialog })));
const DocumentShareDialog = lazy(() => import('../DocumentShareDialog').then(m => ({ default: m.DocumentShareDialog })));
const DocumentImportDialog = lazy(() => import('../DocumentImportDialog').then(m => ({ default: m.DocumentImportDialog })));
const FormattingToolbar = lazy(() => import('../FormattingToolbar').then(m => ({ default: m.FormattingToolbar })));
const FindReplaceDialog = lazy(() => import('../FindReplaceDialog').then(m => ({ default: m.FindReplaceDialog })));
const ParagraphFocusOverlay = lazy(() => import('../ParagraphFocusOverlay').then(m => ({ default: m.ParagraphFocusOverlay })));
const TypewriterScrollManager = lazy(() => import('../TypewriterScrollManager').then(m => ({ default: m.TypewriterScrollManager })));
const OnboardingTour = lazy(() => import('../OnboardingTour').then(m => ({ default: m.OnboardingTour })));
const AISummaryDialog = lazy(() => import('../AISummaryDialog').then(m => ({ default: m.AISummaryDialog })));
const AIOutlineDialog = lazy(() => import('../AIOutlineDialog').then(m => ({ default: m.AIOutlineDialog })));
const AIToneAnalyzerPanel = lazy(() => import('../AIToneAnalyzerPanel').then(m => ({ default: m.AIToneAnalyzerPanel })));
const AIVocabularyEnhancerPanel = lazy(() => import('../AIVocabularyEnhancerPanel').then(m => ({ default: m.AIVocabularyEnhancerPanel })));
const AIVocabularySuggestionPopup = lazy(() => import('../AIVocabularySuggestionPopup').then(m => ({ default: m.AIVocabularySuggestionPopup })));
const AIReadabilityPanel = lazy(() => import('../AIReadabilityPanel').then(m => ({ default: m.AIReadabilityPanel })));
const FocusModeIndicator = lazy(() => import('../FocusModeIndicator').then(m => ({ default: m.FocusModeIndicator })));
const TableOfContentsSidebar = lazy(() => import('../TableOfContentsSidebar').then(m => ({ default: m.TableOfContentsSidebar })));
const LinkPopover = lazy(() => import('../LinkPopover').then(m => ({ default: m.LinkPopover })));
const WelcomeModal = lazy(() => import('../WelcomeModal').then(m => ({ default: m.WelcomeModal })));

export interface AppShellProps {
  children?: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const { fetchAccounts } = useAccountStore();
  const { fetchUser } = useUserStore();
  const { openDialog: openFindReplace, closeDialog: closeFindReplace } = useFindReplaceStore();
  const { toggle: toggleParagraphFocus } = useParagraphFocusStore();
  const { isEnabled: isFocusModeEnabled, hideSidebarAndPanels } = useParagraphFocus();
  const { toggle: toggleTypewriterScroll } = useTypewriterScrollStore();
  const { shouldShowTour, startTour } = useOnboarding();
  const { togglePalette: toggleCommandPalette, closePalette: closeCommandPalette } = useCommandPaletteStore();
  const { toggleSwitcher: toggleQuickSwitcher, closeSwitcher: closeQuickSwitcher } = useQuickSwitcherStore();
  const { togglePanel: toggleToneAnalyzer, closePanel: closeToneAnalyzer } = useAIToneAnalyzerStore();
  const { togglePanel: toggleVocabularyEnhancer, closePanel: closeVocabularyEnhancer } = useAIVocabularyEnhancerStore();
  const { togglePanel: toggleReadability, closePanel: closeReadability } = useAIReadabilityStore();
  const { navigateToNextComment, navigateToPreviousComment } = useCommentNavigation();
  const { selectedFolderId, folders } = useDocumentFoldersStore();
  const { toggleStar } = useStarredDocumentsStore();
  const { togglePanel: toggleTableOfContents, closePanel: closeTableOfContents } = useTableOfContentsStore();
  const { shouldShowWelcome, openModal: openWelcomeModal } = useWelcomeModal();
  const {
    isOpen: isShortcutsViewerOpen,
    openModal: openShortcutsViewer,
    closeModal: closeShortcutsViewer,
  } = useKeyboardShortcutsStore();
  const { settings, updateAppearanceSettings } = useAppSettingsStore();
  const { activeDocumentId, closeDocument } = useOpenDocumentsStore();

  const isSidebarCollapsed = settings.appearance.sidebarCollapsed;
  const isCommentsPanelCollapsed = settings.appearance.commentsPanelCollapsed;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [hasTriggeredTour, setHasTriggeredTour] = useState(false);
  const [hasTriggeredWelcome, setHasTriggeredWelcome] = useState(false);

  const mainContentRef = useRef<HTMLElement>(null);
  const previousPathnameRef = useRef(location.pathname);

  // Fetch accounts and user data on mount
  useEffect(() => {
    fetchAccounts();
    fetchUser();
  }, [fetchAccounts, fetchUser]);

  // Trigger welcome modal on first visit (before the onboarding tour)
  useEffect(() => {
    if (shouldShowWelcome && !hasTriggeredWelcome) {
      // Small delay to let the UI render first
      const timer = setTimeout(() => {
        openWelcomeModal();
        setHasTriggeredWelcome(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shouldShowWelcome, hasTriggeredWelcome, openWelcomeModal]);

  // Trigger onboarding tour on first login (when started from welcome modal or directly)
  useEffect(() => {
    if (shouldShowTour && !hasTriggeredTour && !shouldShowWelcome) {
      // Small delay to let the UI render first
      const timer = setTimeout(() => {
        startTour();
        setHasTriggeredTour(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shouldShowTour, hasTriggeredTour, shouldShowWelcome, startTour]);

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

  // Handle sidebar toggle (persisted to localStorage via store)
  const handleSidebarToggle = useCallback(() => {
    updateAppearanceSettings({ sidebarCollapsed: !isSidebarCollapsed });
  }, [isSidebarCollapsed, updateAppearanceSettings]);

  // Handle comments panel toggle (persisted to localStorage via store)
  // Exported for components that need individual panel control
  const _handleCommentsPanelToggle = useCallback(() => {
    updateAppearanceSettings({ commentsPanelCollapsed: !isCommentsPanelCollapsed });
  }, [isCommentsPanelCollapsed, updateAppearanceSettings]);
  // Silence the unused variable warning - this is available for future component use
  void _handleCommentsPanelToggle;

  // Toggle both panels at once with Cmd+\
  const handleTogglePanels = useCallback(() => {
    // If either is expanded, collapse both. If both collapsed, expand both.
    const shouldCollapse = !isSidebarCollapsed || !isCommentsPanelCollapsed;
    updateAppearanceSettings({
      sidebarCollapsed: shouldCollapse,
      commentsPanelCollapsed: shouldCollapse,
    });
  }, [isSidebarCollapsed, isCommentsPanelCollapsed, updateAppearanceSettings]);

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

  // Toggle star on current selected folder
  const handleToggleStarCurrentFolder = useCallback(() => {
    if (selectedFolderId) {
      const folder = folders.find(f => f.id === selectedFolderId);
      if (folder) {
        toggleStar(folder.id, folder.name, 'folder');
      }
    }
  }, [selectedFolderId, folders, toggleStar]);

  // Close current document tab
  const handleCloseCurrentTab = useCallback(() => {
    if (activeDocumentId) {
      closeDocument(activeDocumentId);
    }
  }, [activeDocumentId, closeDocument]);

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'w',
      metaKey: true,
      action: handleCloseCurrentTab,
      description: 'Close current tab',
      allowInInput: true,
    },
    {
      key: 'w',
      ctrlKey: true,
      action: handleCloseCurrentTab,
      description: 'Close current tab',
      allowInInput: true,
    },
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
      key: 'o',
      metaKey: true,
      action: toggleQuickSwitcher,
      description: 'Open quick switcher',
      allowInInput: true,
    },
    {
      key: 'o',
      ctrlKey: true,
      action: toggleQuickSwitcher,
      description: 'Open quick switcher',
      allowInInput: true,
    },
    {
      key: '?',
      action: () => setIsShortcutsHelpOpen(true),
      description: 'Show keyboard shortcuts',
    },
    {
      key: '/',
      metaKey: true,
      action: () => {
        if (isShortcutsViewerOpen) {
          closeShortcutsViewer();
        } else {
          openShortcutsViewer();
        }
      },
      description: 'Show keyboard shortcuts viewer',
      allowInInput: true,
    },
    {
      key: '/',
      ctrlKey: true,
      action: () => {
        if (isShortcutsViewerOpen) {
          closeShortcutsViewer();
        } else {
          openShortcutsViewer();
        }
      },
      description: 'Show keyboard shortcuts viewer',
      allowInInput: true,
    },
    {
      key: 'Escape',
      action: () => {
        setIsMobileMenuOpen(false);
        setIsShortcutsHelpOpen(false);
        closeFindReplace();
        closeCommandPalette();
        closeQuickSwitcher();
        closeToneAnalyzer();
        closeVocabularyEnhancer();
        closeReadability();
        closeTableOfContents();
        closeShortcutsViewer();
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
      key: '\\',
      metaKey: true,
      action: handleTogglePanels,
      description: 'Toggle all panels',
      allowInInput: true,
    },
    {
      key: '\\',
      ctrlKey: true,
      action: handleTogglePanels,
      description: 'Toggle all panels',
      allowInInput: true,
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
    {
      key: 't',
      altKey: true,
      action: toggleToneAnalyzer,
      description: 'Toggle tone analyzer panel',
      allowInInput: true,
    },
    {
      key: 'v',
      altKey: true,
      action: toggleVocabularyEnhancer,
      description: 'Toggle vocabulary enhancer panel',
      allowInInput: true,
    },
    {
      key: 'r',
      altKey: true,
      action: toggleReadability,
      description: 'Toggle readability scorer panel',
      allowInInput: true,
    },
    {
      key: 'i',
      altKey: true,
      action: toggleTableOfContents,
      description: 'Toggle table of contents',
      allowInInput: true,
    },
    {
      key: ']',
      metaKey: true,
      action: navigateToNextComment,
      description: 'Go to next comment',
      allowInInput: true,
    },
    {
      key: ']',
      ctrlKey: true,
      action: navigateToNextComment,
      description: 'Go to next comment',
      allowInInput: true,
    },
    {
      key: '[',
      metaKey: true,
      action: navigateToPreviousComment,
      description: 'Go to previous comment',
      allowInInput: true,
    },
    {
      key: '[',
      ctrlKey: true,
      action: navigateToPreviousComment,
      description: 'Go to previous comment',
      allowInInput: true,
    },
    {
      key: 'd',
      metaKey: true,
      action: handleToggleStarCurrentFolder,
      description: 'Toggle star on selected folder',
      allowInInput: true,
    },
    {
      key: 'd',
      ctrlKey: true,
      action: handleToggleStarCurrentFolder,
      description: 'Toggle star on selected folder',
      allowInInput: true,
    },
  ]);

  // Determine if we should hide sidebar and panels based on focus mode
  const shouldHideUI = isFocusModeEnabled && hideSidebarAndPanels;

  return (
    <div className={`app-shell ${shouldHideUI ? 'focus-mode-active' : ''}`}>
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

        {/* Document tabs - shown when multiple documents are open */}
        <DocumentTabs />

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
      <QuickSwitcher />
      <KeyboardShortcutsHelp
        isOpen={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
      />
      <KeyboardShortcutsViewer
        isOpen={isShortcutsViewerOpen}
        onClose={closeShortcutsViewer}
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
        <DocumentShareDialog />
        <DocumentImportDialog />
        <FormattingToolbar />
        <FindReplaceDialog />
        <ParagraphFocusOverlay />
        <TypewriterScrollManager />
        <OnboardingTour />
        <AISummaryDialog />
        <AIOutlineDialog />
        <AIToneAnalyzerPanel />
        <AIVocabularyEnhancerPanel />
        <AIVocabularySuggestionPopup />
        <AIReadabilityPanel />
        <FocusModeIndicator />
        <TableOfContentsSidebar />
        <LinkPopover />
        <WelcomeModal />
      </Suspense>
    </div>
  );
}
