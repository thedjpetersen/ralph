import { useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCommandPaletteStore, type Command, type CommandCategory } from '../stores/commandPalette';
import { useFindReplaceStore } from '../stores/findReplace';
import { useAISummaryStore } from '../stores/aiSummary';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { fuzzySearch, highlightMatch } from '../utils/fuzzySearch';
import './CommandPalette.css';

// Category icons
const categoryIcons: Record<CommandCategory, React.ReactNode> = {
  navigation: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  ),
  documents: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  ),
  ai: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
      <path d="M8 14v.01M16 14v.01M9 18h6" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  actions: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
};

// Category labels
const categoryLabels: Record<CommandCategory, string> = {
  navigation: 'Navigation',
  documents: 'Documents',
  ai: 'AI',
  settings: 'Settings',
  actions: 'Actions',
};

// Build commands list using navigation
function useCommands(): Command[] {
  const navigate = useNavigate();
  const { openDialog: openFindReplace } = useFindReplaceStore();
  const { openSummaryDialog } = useAISummaryStore();
  const { closePalette } = useCommandPaletteStore();

  return useMemo(() => {
    const commands: Command[] = [
      // Navigation
      {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        category: 'navigation',
        description: 'View your financial overview',
        keywords: ['home', 'overview', 'main'],
        action: () => { navigate('/dashboard'); closePalette(); },
      },
      {
        id: 'nav-accounts',
        label: 'Go to Accounts',
        category: 'navigation',
        description: 'Manage your accounts',
        keywords: ['bank', 'accounts'],
        action: () => { navigate('/accounts'); closePalette(); },
      },
      {
        id: 'nav-transactions',
        label: 'Go to Transactions',
        category: 'navigation',
        description: 'View and manage transactions',
        keywords: ['payments', 'money', 'spending'],
        action: () => { navigate('/transactions'); closePalette(); },
      },
      {
        id: 'nav-budgets',
        label: 'Go to Budgets',
        category: 'navigation',
        description: 'Manage your budgets',
        keywords: ['spending', 'limits', 'goals'],
        action: () => { navigate('/budgets'); closePalette(); },
      },
      {
        id: 'nav-receipts',
        label: 'Go to Receipts',
        category: 'navigation',
        description: 'View uploaded receipts',
        keywords: ['bills', 'scan', 'upload'],
        action: () => { navigate('/receipts'); closePalette(); },
      },
      {
        id: 'nav-paychecks',
        label: 'Go to Paychecks',
        category: 'navigation',
        description: 'Track your income',
        keywords: ['salary', 'income', 'earnings'],
        action: () => { navigate('/paychecks'); closePalette(); },
      },
      {
        id: 'nav-retirement',
        label: 'Go to Retirement Plans',
        category: 'navigation',
        description: 'Manage retirement accounts',
        keywords: ['401k', 'ira', 'pension', 'savings'],
        action: () => { navigate('/retirement-plans'); closePalette(); },
      },
      {
        id: 'nav-fire',
        label: 'FIRE Calculator',
        category: 'navigation',
        description: 'Financial Independence calculator',
        keywords: ['retire early', 'independence', 'freedom'],
        action: () => { navigate('/fire-calculator'); closePalette(); },
      },
      {
        id: 'nav-bills',
        label: 'Go to Bills',
        category: 'navigation',
        description: 'Manage recurring bills',
        keywords: ['payments', 'recurring', 'subscriptions'],
        action: () => { navigate('/bills'); closePalette(); },
      },
      {
        id: 'nav-stores',
        label: 'Go to Stores',
        category: 'navigation',
        description: 'Manage store locations',
        keywords: ['shops', 'merchants', 'vendors'],
        action: () => { navigate('/stores'); closePalette(); },
      },
      {
        id: 'nav-products',
        label: 'Go to Products',
        category: 'navigation',
        description: 'View product catalog',
        keywords: ['items', 'goods'],
        action: () => { navigate('/products'); closePalette(); },
      },
      {
        id: 'nav-connections',
        label: 'Financial Connections',
        category: 'navigation',
        description: 'Connect bank accounts',
        keywords: ['plaid', 'link', 'connect', 'bank'],
        action: () => { navigate('/connections'); closePalette(); },
      },
      {
        id: 'nav-integrations',
        label: 'Integrations',
        category: 'navigation',
        description: 'Manage third-party integrations',
        keywords: ['google', 'email', 'sync'],
        action: () => { navigate('/integrations'); closePalette(); },
      },

      // Documents
      {
        id: 'doc-new-transaction',
        label: 'New Transaction',
        category: 'documents',
        description: 'Create a new transaction',
        keywords: ['add', 'create', 'payment'],
        action: () => { navigate('/transactions/new'); closePalette(); },
      },
      {
        id: 'doc-new-budget',
        label: 'New Budget',
        category: 'documents',
        description: 'Create a new budget',
        keywords: ['add', 'create', 'spending limit'],
        action: () => { navigate('/budgets/new'); closePalette(); },
      },
      {
        id: 'doc-upload-receipt',
        label: 'Upload Receipt',
        category: 'documents',
        description: 'Upload a new receipt',
        keywords: ['scan', 'add', 'photo'],
        action: () => { navigate('/receipts/upload'); closePalette(); },
      },
      {
        id: 'doc-new-paycheck',
        label: 'New Paycheck',
        category: 'documents',
        description: 'Record a new paycheck',
        keywords: ['add', 'income', 'salary'],
        action: () => { navigate('/paychecks/new'); closePalette(); },
      },
      {
        id: 'doc-new-retirement-plan',
        label: 'New Retirement Plan',
        category: 'documents',
        description: 'Create a retirement plan',
        keywords: ['add', '401k', 'ira'],
        action: () => { navigate('/retirement-plans/new'); closePalette(); },
      },
      {
        id: 'doc-new-store',
        label: 'New Store',
        category: 'documents',
        description: 'Add a new store',
        keywords: ['add', 'merchant', 'vendor'],
        action: () => { navigate('/stores/new'); closePalette(); },
      },

      // AI
      {
        id: 'ai-find',
        label: 'Find in Document',
        category: 'ai',
        description: 'Search within current document',
        shortcut: '⌘F',
        keywords: ['search', 'find', 'locate'],
        action: () => { openFindReplace(null, false); closePalette(); },
      },
      {
        id: 'ai-find-replace',
        label: 'Find and Replace',
        category: 'ai',
        description: 'Find and replace text',
        shortcut: '⌘H',
        keywords: ['search', 'replace', 'substitute'],
        action: () => { openFindReplace(null, true); closePalette(); },
      },
      {
        id: 'ai-generate-summary',
        label: 'Generate Summary',
        category: 'ai',
        description: 'Generate an AI summary of the document',
        keywords: ['summarize', 'brief', 'overview', 'executive', 'tldr'],
        action: () => {
          // Use sample content for demo - in production this would use actual document content
          const sampleContent = `This is a comprehensive financial planning document that covers various aspects of budget management and expense tracking.

The document outlines strategies for effective spending control, including categorization of expenses, setting realistic budget limits, and implementing regular review cycles. Key topics include emergency fund planning, retirement savings strategies, and debt management approaches.

Additionally, the document discusses methods for tracking monthly spending patterns and identifying areas where costs can be reduced without impacting quality of life. Recommendations include using digital tools for expense tracking, establishing clear financial goals, and maintaining a balanced approach between saving and spending.`;
          openSummaryDialog(sampleContent, 'Financial Planning Document');
          closePalette();
        },
      },
      {
        id: 'ai-summary-demo',
        label: 'AI Summary Demo',
        category: 'ai',
        description: 'Try the AI summary generation feature',
        keywords: ['summarize', 'demo', 'test', 'example'],
        action: () => { navigate('/ai-summary-demo'); closePalette(); },
      },

      // Settings
      {
        id: 'settings-profile',
        label: 'Profile Settings',
        category: 'settings',
        description: 'Manage your profile',
        keywords: ['account', 'user', 'personal'],
        action: () => { navigate('/profile'); closePalette(); },
      },
      {
        id: 'settings-main',
        label: 'Application Settings',
        category: 'settings',
        description: 'Configure app settings',
        keywords: ['preferences', 'options', 'config'],
        action: () => { navigate('/settings'); closePalette(); },
      },
      {
        id: 'settings-api-keys',
        label: 'API Keys',
        category: 'settings',
        description: 'Manage API keys',
        keywords: ['tokens', 'developer', 'integration'],
        action: () => { navigate('/api-keys'); closePalette(); },
      },
      {
        id: 'settings-google-drive',
        label: 'Google Drive Settings',
        category: 'settings',
        description: 'Configure Google Drive integration',
        keywords: ['sync', 'backup', 'cloud'],
        action: () => { navigate('/integrations/google-drive'); closePalette(); },
      },
      {
        id: 'settings-email',
        label: 'Email Settings',
        category: 'settings',
        description: 'Configure email integration',
        keywords: ['notifications', 'alerts', 'mail'],
        action: () => { navigate('/integrations/email'); closePalette(); },
      },
    ];

    return commands;
  }, [navigate, openFindReplace, openSummaryDialog, closePalette]);
}

// Highlight text component
function HighlightedText({ text, query }: { text: string; query: string }) {
  const parts = highlightMatch(query, text);

  return (
    <>
      {parts.map((part, i) =>
        part.matched ? (
          <span key={i} className="match">{part.text}</span>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}

// Command item component
function CommandItem({
  command,
  isSelected,
  query,
  onSelect,
  onMouseEnter,
}: {
  command: Command;
  isSelected: boolean;
  query: string;
  onSelect: () => void;
  onMouseEnter: () => void;
}) {
  const itemRef = useRef<HTMLDivElement>(null);

  // Scroll into view when selected
  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isSelected]);

  return (
    <div
      ref={itemRef}
      className={`command-palette-item ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      role="option"
      aria-selected={isSelected}
    >
      <div className="command-palette-item-icon">
        {categoryIcons[command.category]}
      </div>
      <div className="command-palette-item-content">
        <div className="command-palette-item-label">
          <HighlightedText text={command.label} query={query} />
        </div>
        {command.description && (
          <div className="command-palette-item-description">
            {command.description}
          </div>
        )}
      </div>
      {command.shortcut && (
        <div className="command-palette-item-shortcut">
          {command.shortcut.split('').map((char, i) => (
            <kbd key={i}>{char}</kbd>
          ))}
        </div>
      )}
    </div>
  );
}

export function CommandPalette() {
  const {
    isOpen,
    searchQuery,
    selectedIndex,
    recentCommands,
    closePalette,
    setSearchQuery,
    setSelectedIndex,
    addRecentCommand,
  } = useCommandPaletteStore();

  const commands = useCommands();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use focus trap for proper focus management
  useFocusTrap(containerRef, {
    isActive: isOpen,
    onEscape: closePalette,
    initialFocusRef: inputRef,
    autoFocus: true,
  });

  // Filter and group commands
  const { groupedCommands } = useMemo(() => {
    // Prepare searchable items
    const searchableItems = commands.map(cmd => ({
      item: cmd,
      searchText: cmd.label,
      keywords: cmd.keywords,
    }));

    // Search
    const searchResults = fuzzySearch(searchQuery, searchableItems);
    const filtered = searchResults.map(r => r.item);

    // Group by category
    const grouped = new Map<CommandCategory | 'recent', Command[]>();

    // If no search query, show recent items first
    if (!searchQuery && recentCommands.length > 0) {
      const recentList: Command[] = [];
      for (const recent of recentCommands) {
        const cmd = commands.find(c => c.id === recent.id);
        if (cmd) recentList.push(cmd);
      }
      if (recentList.length > 0) {
        grouped.set('recent', recentList);
      }
    }

    // Group remaining commands
    for (const cmd of filtered) {
      // Skip if already in recent and no search
      if (!searchQuery && recentCommands.some(r => r.id === cmd.id)) continue;

      const existing = grouped.get(cmd.category) || [];
      existing.push(cmd);
      grouped.set(cmd.category, existing);
    }

    return { groupedCommands: grouped };
  }, [commands, searchQuery, recentCommands]);

  // Flat list for keyboard navigation
  const flatList = useMemo(() => {
    const list: Command[] = [];
    for (const [, cmds] of groupedCommands) {
      list.push(...cmds);
    }
    return list;
  }, [groupedCommands]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(Math.min(selectedIndex + 1, flatList.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(Math.max(selectedIndex - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (flatList[selectedIndex]) {
            const cmd = flatList[selectedIndex];
            addRecentCommand(cmd.id);
            cmd.action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          closePalette();
          break;
      }
    },
    [selectedIndex, flatList, setSelectedIndex, closePalette, addRecentCommand]
  );

  // Handle overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        closePalette();
      }
    },
    [closePalette]
  );

  // Execute command
  const executeCommand = useCallback(
    (command: Command) => {
      addRecentCommand(command.id);
      command.action();
    },
    [addRecentCommand]
  );

  if (!isOpen) return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="command-palette-overlay"
          onClick={handleOverlayClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            ref={containerRef}
            className="command-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            onKeyDown={handleKeyDown}
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {/* Search Header */}
            <div className="command-palette-header">
              <svg
                className="command-palette-search-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                className="command-palette-input"
                placeholder="Search commands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search commands"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              <div className="command-palette-shortcut-hint">
                <kbd>Esc</kbd>
                <span>to close</span>
              </div>
            </div>

            {/* Results */}
            <div
              className="command-palette-results"
              role="listbox"
              aria-label="Command results"
            >
              {flatList.length === 0 ? (
                <div className="command-palette-empty">
                  <svg
                    className="command-palette-empty-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <p className="command-palette-empty-text">No commands found</p>
                  <p className="command-palette-empty-hint">Try a different search term</p>
                </div>
              ) : (
                Array.from(groupedCommands.entries()).map(([category, cmds]) => (
                  <div key={category} className="command-palette-group">
                    <div className="command-palette-group-header">
                      {category === 'recent' ? (
                        <span className="command-palette-recent-header">
                          <svg
                            className="command-palette-recent-icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          Recent
                        </span>
                      ) : (
                        categoryLabels[category as CommandCategory]
                      )}
                    </div>
                    {cmds.map((cmd) => {
                      const globalIndex = flatList.indexOf(cmd);
                      return (
                        <CommandItem
                          key={cmd.id}
                          command={cmd}
                          isSelected={globalIndex === selectedIndex}
                          query={searchQuery}
                          onSelect={() => executeCommand(cmd)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                        />
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="command-palette-footer">
              <div className="command-palette-footer-hint">
                <kbd>↑</kbd>
                <kbd>↓</kbd>
                <span>to navigate</span>
              </div>
              <div className="command-palette-footer-hint">
                <kbd>↵</kbd>
                <span>to select</span>
              </div>
              <div className="command-palette-footer-hint">
                <kbd>esc</kbd>
                <span>to close</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

CommandPalette.displayName = 'CommandPalette';
