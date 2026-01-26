import { useState, useRef, useEffect, useId, type KeyboardEvent } from 'react';
import './MultiSelect.css';

export type MultiSelectSize = 'sm' | 'md' | 'lg';

export interface MultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface MultiSelectProps {
  label?: string;
  error?: string;
  hint?: string;
  size?: MultiSelectSize;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  className?: string;
  id?: string;
  'aria-describedby'?: string;
}

export function MultiSelect({
  label,
  error,
  hint,
  size = 'md',
  options,
  value,
  onChange,
  placeholder = 'Select options...',
  disabled = false,
  required = false,
  fullWidth = false,
  className = '',
  id: providedId,
  'aria-describedby': ariaDescribedBy,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const listboxId = `${id}-listbox`;

  const describedByIds = [
    error && errorId,
    hint && !error && hintId,
    ariaDescribedBy,
  ]
    .filter(Boolean)
    .join(' ');

  const selectedOptions = options.filter((opt) => value.includes(opt.value));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listboxRef.current) {
      const focusedOption = listboxRef.current.children[focusedIndex] as HTMLElement;
      focusedOption?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex, isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setFocusedIndex(0);
      }
    }
  };

  const handleOptionClick = (optionValue: string, optionDisabled?: boolean) => {
    if (optionDisabled) return;

    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const handleRemoveChip = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onChange(value.filter((v) => v !== optionValue));
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && focusedIndex >= 0) {
          const option = options[focusedIndex];
          if (option && !option.disabled) {
            handleOptionClick(option.value);
          }
        } else {
          setIsOpen(true);
          setFocusedIndex(0);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else {
          setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  const wrapperClasses = [
    'multiselect-wrapper',
    fullWidth && 'multiselect-full-width',
  ]
    .filter(Boolean)
    .join(' ');

  const triggerClasses = [
    'multiselect-trigger',
    `multiselect-trigger-${size}`,
    error && 'multiselect-trigger-error',
    disabled && 'multiselect-trigger-disabled',
    isOpen && 'multiselect-trigger-open',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClasses} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="multiselect-label">
          {label}
          {required && <span className="multiselect-required" aria-hidden="true"> *</span>}
        </label>
      )}
      <div
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedByIds || undefined}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        className={triggerClasses}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      >
        <div className="multiselect-content">
          {selectedOptions.length > 0 ? (
            <div className="multiselect-chips">
              {selectedOptions.map((option) => (
                <span key={option.value} className={`multiselect-chip multiselect-chip-${size}`}>
                  <span className="multiselect-chip-label">{option.label}</span>
                  <button
                    type="button"
                    className="multiselect-chip-remove"
                    onClick={(e) => handleRemoveChip(option.value, e)}
                    aria-label={`Remove ${option.label}`}
                    tabIndex={-1}
                    disabled={disabled}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <span className="multiselect-placeholder">{placeholder}</span>
          )}
        </div>
        <span className="multiselect-chevron" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </div>
      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-multiselectable="true"
          className={`multiselect-listbox multiselect-listbox-${size}`}
          ref={listboxRef}
        >
          {options.map((option, index) => {
            const isSelected = value.includes(option.value);
            const isFocused = index === focusedIndex;
            const optionClasses = [
              'multiselect-option',
              isSelected && 'multiselect-option-selected',
              isFocused && 'multiselect-option-focused',
              option.disabled && 'multiselect-option-disabled',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled}
                className={optionClasses}
                onClick={() => handleOptionClick(option.value, option.disabled)}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                <span className="multiselect-checkbox">
                  {isSelected && (
                    <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </span>
                <span className="multiselect-option-label">{option.label}</span>
              </li>
            );
          })}
        </ul>
      )}
      {error && (
        <span id={errorId} className="multiselect-error-message" role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={hintId} className="multiselect-hint">
          {hint}
        </span>
      )}
    </div>
  );
}

MultiSelect.displayName = 'MultiSelect';
