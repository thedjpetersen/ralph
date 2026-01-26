/**
 * Tests for Table of Contents Store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTableOfContentsStore } from '../tableOfContents';

describe('tableOfContents store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useTableOfContentsStore.getState();
    store.closePanel();
    store.setDocumentContent('');
    store.setActiveHeadingId(null);
    store.setNavigateCallback(null);
  });

  describe('panel visibility', () => {
    it('should start with panel closed', () => {
      const { isOpen } = useTableOfContentsStore.getState();
      expect(isOpen).toBe(false);
    });

    it('should open panel', () => {
      const { openPanel } = useTableOfContentsStore.getState();
      openPanel();
      const { isOpen } = useTableOfContentsStore.getState();
      expect(isOpen).toBe(true);
    });

    it('should close panel', () => {
      const { openPanel, closePanel } = useTableOfContentsStore.getState();
      openPanel();
      closePanel();
      const { isOpen } = useTableOfContentsStore.getState();
      expect(isOpen).toBe(false);
    });

    it('should toggle panel', () => {
      const { togglePanel } = useTableOfContentsStore.getState();
      togglePanel();
      expect(useTableOfContentsStore.getState().isOpen).toBe(true);
      togglePanel();
      expect(useTableOfContentsStore.getState().isOpen).toBe(false);
    });
  });

  describe('heading extraction', () => {
    it('should extract H1 headings', () => {
      const { setDocumentContent } = useTableOfContentsStore.getState();
      setDocumentContent('# Hello World');
      const { headings, flatHeadings } = useTableOfContentsStore.getState();
      expect(headings).toHaveLength(1);
      expect(flatHeadings).toHaveLength(1);
      expect(headings[0].title).toBe('Hello World');
      expect(headings[0].level).toBe(1);
    });

    it('should extract H2 headings', () => {
      const { setDocumentContent } = useTableOfContentsStore.getState();
      setDocumentContent('## Section Title');
      const { headings } = useTableOfContentsStore.getState();
      expect(headings).toHaveLength(1);
      expect(headings[0].title).toBe('Section Title');
      expect(headings[0].level).toBe(2);
    });

    it('should extract H3 headings', () => {
      const { setDocumentContent } = useTableOfContentsStore.getState();
      setDocumentContent('### Subsection');
      const { headings } = useTableOfContentsStore.getState();
      expect(headings).toHaveLength(1);
      expect(headings[0].title).toBe('Subsection');
      expect(headings[0].level).toBe(3);
    });

    it('should extract multiple headings', () => {
      const { setDocumentContent } = useTableOfContentsStore.getState();
      setDocumentContent(`# Title
## Section 1
### Subsection 1.1
## Section 2`);
      const { flatHeadings } = useTableOfContentsStore.getState();
      expect(flatHeadings).toHaveLength(4);
    });

    it('should build nested tree structure', () => {
      const { setDocumentContent } = useTableOfContentsStore.getState();
      setDocumentContent(`# Title
## Section 1
### Subsection 1.1
## Section 2`);
      const { headings } = useTableOfContentsStore.getState();
      expect(headings).toHaveLength(1); // Only H1 at root
      expect(headings[0].children).toHaveLength(2); // Two H2 children
      expect(headings[0].children[0].children).toHaveLength(1); // One H3 child under first H2
    });

    it('should ignore content without headings', () => {
      const { setDocumentContent } = useTableOfContentsStore.getState();
      setDocumentContent('Just regular text\nNo headings here');
      const { headings, flatHeadings } = useTableOfContentsStore.getState();
      expect(headings).toHaveLength(0);
      expect(flatHeadings).toHaveLength(0);
    });

    it('should ignore H4 and deeper headings', () => {
      const { setDocumentContent } = useTableOfContentsStore.getState();
      setDocumentContent('#### Deep heading');
      const { headings } = useTableOfContentsStore.getState();
      expect(headings).toHaveLength(0);
    });

    it('should handle empty content', () => {
      const { setDocumentContent } = useTableOfContentsStore.getState();
      setDocumentContent('');
      const { headings, flatHeadings } = useTableOfContentsStore.getState();
      expect(headings).toHaveLength(0);
      expect(flatHeadings).toHaveLength(0);
    });

    it('should store line numbers', () => {
      const { setDocumentContent } = useTableOfContentsStore.getState();
      setDocumentContent(`# First
Some content
## Second`);
      const { flatHeadings } = useTableOfContentsStore.getState();
      expect(flatHeadings[0].lineNumber).toBe(0);
      expect(flatHeadings[1].lineNumber).toBe(2);
    });
  });

  describe('active heading tracking', () => {
    it('should set active heading id', () => {
      const { setActiveHeadingId } = useTableOfContentsStore.getState();
      setActiveHeadingId('test-heading-id');
      const { activeHeadingId } = useTableOfContentsStore.getState();
      expect(activeHeadingId).toBe('test-heading-id');
    });

    it('should clear active heading id', () => {
      const { setActiveHeadingId } = useTableOfContentsStore.getState();
      setActiveHeadingId('test-heading-id');
      setActiveHeadingId(null);
      const { activeHeadingId } = useTableOfContentsStore.getState();
      expect(activeHeadingId).toBeNull();
    });
  });

  describe('heading expand/collapse', () => {
    beforeEach(() => {
      const { setDocumentContent } = useTableOfContentsStore.getState();
      setDocumentContent(`# Title
## Section 1
### Subsection 1.1`);
    });

    it('should start with all headings expanded', () => {
      const { headings } = useTableOfContentsStore.getState();
      expect(headings[0].expanded).toBe(true);
      expect(headings[0].children[0].expanded).toBe(true);
    });

    it('should toggle heading expanded state', () => {
      const { headings, toggleHeadingExpanded } = useTableOfContentsStore.getState();
      const headingId = headings[0].id;
      toggleHeadingExpanded(headingId);
      const { headings: updatedHeadings } = useTableOfContentsStore.getState();
      expect(updatedHeadings[0].expanded).toBe(false);
    });

    it('should expand all headings', () => {
      const { toggleHeadingExpanded, expandAllHeadings, headings } = useTableOfContentsStore.getState();
      toggleHeadingExpanded(headings[0].id);
      expandAllHeadings();
      const { headings: updatedHeadings } = useTableOfContentsStore.getState();
      expect(updatedHeadings[0].expanded).toBe(true);
    });

    it('should collapse all headings', () => {
      const { collapseAllHeadings } = useTableOfContentsStore.getState();
      collapseAllHeadings();
      const { headings } = useTableOfContentsStore.getState();
      expect(headings[0].expanded).toBe(false);
      expect(headings[0].children[0].expanded).toBe(false);
    });
  });

  describe('navigation', () => {
    it('should call navigate callback when navigating to heading', () => {
      const navigateMock = vi.fn();
      const { setNavigateCallback, setDocumentContent, navigateToHeading } = useTableOfContentsStore.getState();

      setNavigateCallback(navigateMock);
      setDocumentContent('# Test Heading');

      const { headings } = useTableOfContentsStore.getState();
      navigateToHeading(headings[0]);

      expect(navigateMock).toHaveBeenCalledWith(0);
    });

    it('should set active heading id when navigating', () => {
      const navigateMock = vi.fn();
      const { setNavigateCallback, setDocumentContent, navigateToHeading } = useTableOfContentsStore.getState();

      setNavigateCallback(navigateMock);
      setDocumentContent('# Test Heading');

      const { headings } = useTableOfContentsStore.getState();
      navigateToHeading(headings[0]);

      const { activeHeadingId } = useTableOfContentsStore.getState();
      expect(activeHeadingId).toBe(headings[0].id);
    });

    it('should not crash when navigate callback is null', () => {
      const { setDocumentContent, navigateToHeading } = useTableOfContentsStore.getState();
      setDocumentContent('# Test Heading');

      const { headings } = useTableOfContentsStore.getState();
      expect(() => navigateToHeading(headings[0])).not.toThrow();
    });
  });
});
