import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useCommentSearchFilter, getAuthorColor } from '../stores/commentHighlight';
import './CommentSearchFilter.css';

const ENTITY_TYPES = [
  { value: 'transaction' as const, label: 'Transaction' },
  { value: 'receipt' as const, label: 'Receipt' },
  { value: 'budget' as const, label: 'Budget' },
];

interface CommentSearchFilterProps {
  totalCount: number;
  filteredCount: number;
}

export function CommentSearchFilter({ totalCount, filteredCount }: CommentSearchFilterProps) {
  const {
    searchFilters,
    setSearchQuery,
    setSelectedAuthors,
    setSelectedTypes,
    clearAllFilters,
    getUniqueAuthors,
    hasActiveFilters,
  } = useCommentSearchFilter();

  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const authorDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  const authors = useMemo(() => getUniqueAuthors(), [getUniqueAuthors]);
  const isFiltered = hasActiveFilters();

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (authorDropdownRef.current && !authorDropdownRef.current.contains(event.target as Node)) {
        setShowAuthorDropdown(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setShowTypeDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, [setSearchQuery]);

  const handleAuthorToggle = useCallback((author: string) => {
    const newAuthors = searchFilters.selectedAuthors.includes(author)
      ? searchFilters.selectedAuthors.filter((a) => a !== author)
      : [...searchFilters.selectedAuthors, author];
    setSelectedAuthors(newAuthors);
  }, [searchFilters.selectedAuthors, setSelectedAuthors]);

  const handleTypeToggle = useCallback((type: 'transaction' | 'receipt' | 'budget') => {
    const newTypes = searchFilters.selectedTypes.includes(type)
      ? searchFilters.selectedTypes.filter((t) => t !== type)
      : [...searchFilters.selectedTypes, type];
    setSelectedTypes(newTypes);
  }, [searchFilters.selectedTypes, setSelectedTypes]);

  const handleClearAll = useCallback(() => {
    clearAllFilters();
    setShowAuthorDropdown(false);
    setShowTypeDropdown(false);
  }, [clearAllFilters]);

  return (
    <div className="comment-search-filter">
      {/* Search Input */}
      <div className="search-input-container">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder="Search comments..."
          value={searchFilters.searchQuery}
          onChange={handleSearchChange}
          aria-label="Search comments"
        />
        {searchFilters.searchQuery && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="filter-row">
        {/* Author Filter */}
        <div className="filter-dropdown" ref={authorDropdownRef}>
          <button
            type="button"
            className={`filter-trigger ${searchFilters.selectedAuthors.length > 0 ? 'active' : ''}`}
            onClick={() => {
              setShowAuthorDropdown(!showAuthorDropdown);
              setShowTypeDropdown(false);
            }}
            aria-expanded={showAuthorDropdown}
            aria-haspopup="listbox"
          >
            <span className="filter-label">
              Author
              {searchFilters.selectedAuthors.length > 0 && (
                <span className="filter-count">{searchFilters.selectedAuthors.length}</span>
              )}
            </span>
            <svg className="filter-chevron" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {showAuthorDropdown && (
            <div className="filter-dropdown-menu" role="listbox" aria-label="Select authors">
              {authors.length === 0 ? (
                <div className="filter-empty">No authors available</div>
              ) : (
                authors.map((author) => {
                  const isSelected = searchFilters.selectedAuthors.includes(author);
                  const authorColor = getAuthorColor(author);
                  return (
                    <button
                      key={author}
                      type="button"
                      className={`filter-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleAuthorToggle(author)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span
                        className="author-color-dot"
                        style={{ backgroundColor: authorColor }}
                      />
                      <span className="filter-option-label">{author}</span>
                      {isSelected && (
                        <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Type Filter */}
        <div className="filter-dropdown" ref={typeDropdownRef}>
          <button
            type="button"
            className={`filter-trigger ${searchFilters.selectedTypes.length > 0 ? 'active' : ''}`}
            onClick={() => {
              setShowTypeDropdown(!showTypeDropdown);
              setShowAuthorDropdown(false);
            }}
            aria-expanded={showTypeDropdown}
            aria-haspopup="listbox"
          >
            <span className="filter-label">
              Type
              {searchFilters.selectedTypes.length > 0 && (
                <span className="filter-count">{searchFilters.selectedTypes.length}</span>
              )}
            </span>
            <svg className="filter-chevron" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {showTypeDropdown && (
            <div className="filter-dropdown-menu" role="listbox" aria-label="Select types">
              {ENTITY_TYPES.map(({ value, label }) => {
                const isSelected = searchFilters.selectedTypes.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    className={`filter-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleTypeToggle(value)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className="filter-option-label">{label}</span>
                    {isSelected && (
                      <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Clear All Button */}
        {isFiltered && (
          <button
            type="button"
            className="clear-all-btn"
            onClick={handleClearAll}
            aria-label="Clear all filters"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
            Clear all
          </button>
        )}
      </div>

      {/* Result Count */}
      {isFiltered && (
        <div className="filter-result-count">
          Showing <strong>{filteredCount}</strong> of <strong>{totalCount}</strong> comments
        </div>
      )}
    </div>
  );
}

CommentSearchFilter.displayName = 'CommentSearchFilter';
