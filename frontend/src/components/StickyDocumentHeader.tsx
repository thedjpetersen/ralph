/**
 * StickyDocumentHeader Component
 *
 * A header component that sticks to the top when scrolling past it.
 * Supports compact mode when stuck and smooth transitions.
 */

import { useRef, useEffect, useState, type ReactNode } from 'react';
import './StickyDocumentHeader.css';

interface StickyDocumentHeaderProps {
  /** The document title to display */
  title?: string;
  /** Subtitle or description text */
  subtitle?: string;
  /** Toolbar content to render in the header */
  toolbar?: ReactNode;
  /** Additional children to render in the header */
  children?: ReactNode;
  /** Additional class name */
  className?: string;
  /** Callback when sticky state changes */
  onStickyChange?: (isSticky: boolean) => void;
}

export function StickyDocumentHeader({
  title,
  subtitle,
  toolbar,
  children,
  className = '',
  onStickyChange,
}: StickyDocumentHeaderProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Use IntersectionObserver to detect when header should become sticky
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const sticky = !entry.isIntersecting;
        setIsSticky(sticky);
        onStickyChange?.(sticky);
      },
      {
        threshold: 0,
        rootMargin: '0px 0px 0px 0px',
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [onStickyChange]);

  // Track header height for the placeholder
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const updateHeight = () => {
      setHeaderHeight(header.offsetHeight);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(header);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <>
      {/* Sentinel element - triggers sticky state when scrolled past */}
      <div ref={sentinelRef} className="sticky-header-sentinel" aria-hidden="true" />

      {/* Placeholder to prevent content jump when header becomes fixed */}
      {isSticky && (
        <div
          className="sticky-header-placeholder"
          style={{ height: headerHeight }}
          aria-hidden="true"
        />
      )}

      {/* The actual sticky header */}
      <header
        ref={headerRef}
        className={`sticky-document-header ${isSticky ? 'sticky-document-header--stuck' : ''} ${className}`}
        role="banner"
      >
        <div className="sticky-document-header__content">
          {/* Title section */}
          {(title || subtitle) && (
            <div className={`sticky-document-header__title-section ${isSticky ? 'sticky-document-header__title-section--compact' : ''}`}>
              {title && (
                <h1 className={`sticky-document-header__title ${isSticky ? 'sticky-document-header__title--compact' : ''}`}>
                  {title}
                </h1>
              )}
              {subtitle && !isSticky && (
                <p className="sticky-document-header__subtitle">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {/* Custom children */}
          {children}

          {/* Toolbar section */}
          {toolbar && (
            <div className={`sticky-document-header__toolbar ${isSticky ? 'sticky-document-header__toolbar--compact' : ''}`}>
              {toolbar}
            </div>
          )}
        </div>
      </header>
    </>
  );
}

StickyDocumentHeader.displayName = 'StickyDocumentHeader';

export default StickyDocumentHeader;
