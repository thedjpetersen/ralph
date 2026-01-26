import {
  type ReactNode,
  useEffect,
  useRef,
  useCallback,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import './ContextMenu.css';

export interface ContextMenuItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Optional icon */
  icon?: ReactNode;
  /** Whether this is a destructive action */
  danger?: boolean;
  /** Whether the item is disabled */
  disabled?: boolean;
  /** Keyboard shortcut to display */
  shortcut?: string;
  /** Click handler */
  onClick: () => void;
}

export interface ContextMenuProps {
  /** Whether the menu is open */
  isOpen: boolean;
  /** Position to render the menu */
  position: { x: number; y: number };
  /** Menu items */
  items: ContextMenuItem[];
  /** Callback when menu should close */
  onClose: () => void;
  /** Optional header text */
  header?: string;
}

export function ContextMenu({
  isOpen,
  position,
  items,
  onClose,
  header,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  // Calculate menu position to keep it in viewport
  const calculatePosition = useCallback(() => {
    if (!menuRef.current) return;

    const menu = menuRef.current;
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 8;

    let x = position.x;
    let y = position.y;

    // Adjust horizontal position
    if (x + menuRect.width > viewportWidth - padding) {
      x = viewportWidth - menuRect.width - padding;
    }
    if (x < padding) {
      x = padding;
    }

    // Adjust vertical position
    if (y + menuRect.height > viewportHeight - padding) {
      y = viewportHeight - menuRect.height - padding;
    }
    if (y < padding) {
      y = padding;
    }

    setMenuStyle({
      left: `${x}px`,
      top: `${y}px`,
    });
  }, [position]);

  // Recalculate position when menu opens or position changes
  useEffect(() => {
    if (isOpen) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(calculatePosition);
    }
  }, [isOpen, calculatePosition]);

  // Handle click outside
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle item click
  const handleItemClick = useCallback(
    (item: ContextMenuItem) => {
      if (item.disabled) return;
      item.onClick();
      onClose();
    },
    [onClose]
  );

  // Focus first item when menu opens
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const firstButton = menuRef.current.querySelector<HTMLButtonElement>(
        '.context-menu-item:not([disabled])'
      );
      if (firstButton) {
        firstButton.focus();
      }
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      const enabledItems = items.filter(item => !item.disabled);
      const currentIndex = enabledItems.findIndex((_, i) => i === index);

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const nextIndex = (currentIndex + 1) % enabledItems.length;
          const buttons =
            menuRef.current?.querySelectorAll<HTMLButtonElement>(
              '.context-menu-item:not([disabled])'
            );
          buttons?.[nextIndex]?.focus();
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prevIndex =
            (currentIndex - 1 + enabledItems.length) % enabledItems.length;
          const buttons =
            menuRef.current?.querySelectorAll<HTMLButtonElement>(
              '.context-menu-item:not([disabled])'
            );
          buttons?.[prevIndex]?.focus();
          break;
        }
        case 'Home': {
          e.preventDefault();
          const buttons =
            menuRef.current?.querySelectorAll<HTMLButtonElement>(
              '.context-menu-item:not([disabled])'
            );
          buttons?.[0]?.focus();
          break;
        }
        case 'End': {
          e.preventDefault();
          const buttons =
            menuRef.current?.querySelectorAll<HTMLButtonElement>(
              '.context-menu-item:not([disabled])'
            );
          buttons?.[buttons.length - 1]?.focus();
          break;
        }
      }
    },
    [items]
  );

  if (!isOpen) return null;

  const menuContent = (
    <>
      {/* Backdrop for click-outside handling */}
      <div
        className="context-menu-backdrop"
        onClick={handleBackdropClick}
        onTouchEnd={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Menu */}
      <div
        ref={menuRef}
        className="context-menu"
        style={menuStyle}
        role="menu"
        aria-label={header || 'Context menu'}
      >
        {header && <div className="context-menu-header">{header}</div>}

        {items.map((item, index) => (
          <button
            key={item.id}
            className={`context-menu-item ${item.danger ? 'context-menu-item--danger' : ''}`}
            role="menuitem"
            disabled={item.disabled}
            onClick={() => handleItemClick(item)}
            onKeyDown={e => handleKeyDown(e, index)}
          >
            {item.icon && (
              <span className="context-menu-item-icon" aria-hidden="true">
                {item.icon}
              </span>
            )}
            <span className="context-menu-item-label">{item.label}</span>
            {item.shortcut && (
              <span className="context-menu-item-shortcut" aria-hidden="true">
                {item.shortcut}
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  );

  return createPortal(menuContent, document.body);
}

ContextMenu.displayName = 'ContextMenu';
