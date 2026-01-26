import { useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCodeBlockStore, SUPPORTED_LANGUAGES } from '../stores/codeBlock';
import './LanguageSelector.css';

export function LanguageSelector() {
  const {
    isLanguageSelectorOpen,
    selectorPosition,
    onLanguageSelect,
    hideLanguageSelector,
    searchQuery,
    selectedIndex,
    setSearchQuery,
    setSelectedIndex,
  } = useCodeBlockStore();

  const selectorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter languages based on search
  const filteredLanguages = useMemo(() => {
    return SUPPORTED_LANGUAGES.filter((lang) => {
      const query = searchQuery.toLowerCase();
      if (!query) return true;
      if (lang.name.toLowerCase().includes(query)) return true;
      if (lang.id.toLowerCase().includes(query)) return true;
      if (lang.aliases?.some((alias) => alias.toLowerCase().includes(query))) return true;
      return false;
    });
  }, [searchQuery]);

  // Handle search input change
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [setSearchQuery]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedItem = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Focus input when opened
  useEffect(() => {
    if (isLanguageSelectorOpen) {
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [isLanguageSelectorOpen]);

  const handleSelect = useCallback(
    (languageId: string) => {
      if (onLanguageSelect) {
        onLanguageSelect(languageId);
      }
      hideLanguageSelector();
    },
    [onLanguageSelect, hideLanguageSelector]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(Math.min(selectedIndex + 1, filteredLanguages.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(Math.max(selectedIndex - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredLanguages[selectedIndex]) {
            handleSelect(filteredLanguages[selectedIndex].id);
          }
          break;
        case 'Escape':
          e.preventDefault();
          hideLanguageSelector();
          break;
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            setSelectedIndex(Math.max(selectedIndex - 1, 0));
          } else {
            setSelectedIndex(Math.min(selectedIndex + 1, filteredLanguages.length - 1));
          }
          break;
      }
    },
    [filteredLanguages, selectedIndex, hideLanguageSelector, handleSelect, setSelectedIndex]
  );

  // Handle click outside to close
  useEffect(() => {
    if (!isLanguageSelectorOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        hideLanguageSelector();
      }
    };

    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLanguageSelectorOpen, hideLanguageSelector]);

  if (!isLanguageSelectorOpen || !selectorPosition) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={selectorRef}
        className="language-selector"
        style={{
          top: selectorPosition.top,
          left: selectorPosition.left,
        }}
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        role="dialog"
        aria-label="Select programming language"
      >
        <div className="language-selector-search">
          <input
            ref={inputRef}
            type="text"
            className="language-selector-input"
            placeholder="Search languages..."
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            aria-label="Search programming languages"
            aria-activedescendant={
              filteredLanguages[selectedIndex]
                ? `lang-option-${filteredLanguages[selectedIndex].id}`
                : undefined
            }
            aria-controls="language-selector-list"
          />
          <svg
            className="language-selector-search-icon"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <ul
          ref={listRef}
          id="language-selector-list"
          className="language-selector-list"
          role="listbox"
          aria-label="Available languages"
        >
          {filteredLanguages.length === 0 ? (
            <li className="language-selector-empty">No languages found</li>
          ) : (
            filteredLanguages.map((lang, index) => (
              <li
                key={lang.id}
                id={`lang-option-${lang.id}`}
                className={`language-selector-item ${index === selectedIndex ? 'language-selector-item-selected' : ''}`}
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => handleSelect(lang.id)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="language-selector-item-name">{lang.name}</span>
                {lang.aliases && lang.aliases.length > 0 && (
                  <span className="language-selector-item-aliases">
                    {lang.aliases.join(', ')}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>

        <div className="language-selector-hint">
          <kbd>↑</kbd> <kbd>↓</kbd> to navigate, <kbd>Enter</kbd> to select, <kbd>Esc</kbd> to close
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

LanguageSelector.displayName = 'LanguageSelector';
