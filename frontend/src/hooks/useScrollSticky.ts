/**
 * useScrollSticky Hook
 *
 * Detects when a user has scrolled past a certain threshold
 * and returns state for sticky header behavior.
 */

import { useState, useEffect, useRef } from 'react';

interface UseScrollStickyOptions {
  /** Scroll threshold in pixels before header becomes sticky (default: 50) */
  threshold?: number;
  /** Element to observe for scroll events (default: window) */
  element?: HTMLElement | null;
}

interface UseScrollStickyResult {
  /** Whether the header should be in sticky (compact) mode */
  isSticky: boolean;
  /** Current scroll position */
  scrollY: number;
  /** Reference to attach to the sentinel element */
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Get initial scroll position (safe for SSR)
 */
function getInitialScrollY(element?: HTMLElement | null): number {
  if (typeof window === 'undefined') return 0;
  return element ? element.scrollTop : window.scrollY;
}

/**
 * Hook to detect scroll position and determine sticky state
 * Uses IntersectionObserver for better performance
 */
export function useScrollSticky(options: UseScrollStickyOptions = {}): UseScrollStickyResult {
  const { threshold = 50, element } = options;

  // Initialize with current scroll position
  const [scrollY, setScrollY] = useState(() => getInitialScrollY(element));
  const [isSticky, setIsSticky] = useState(() => getInitialScrollY(element) > threshold);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Set up scroll listener
  useEffect(() => {
    const target = element || window;

    const handleScroll = () => {
      const currentScrollY = element ? element.scrollTop : window.scrollY;
      setScrollY(currentScrollY);
      setIsSticky(currentScrollY > threshold);
    };

    target.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      target.removeEventListener('scroll', handleScroll);
    };
  }, [element, threshold]);

  // Optional: Use IntersectionObserver for sentinel-based detection
  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When sentinel is not visible, header should be sticky
        setIsSticky(!entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: `-${threshold}px 0px 0px 0px`,
      }
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  return {
    isSticky,
    scrollY,
    sentinelRef,
  };
}

export default useScrollSticky;
