/**
 * Table of Contents Store
 *
 * Manages state for the document table of contents sidebar.
 * Extracts headings from document content, tracks active section on scroll,
 * and provides navigation to sections.
 */

import { create } from 'zustand';

export interface TOCHeading {
  id: string;
  level: 1 | 2 | 3;
  title: string;
  lineNumber: number;
  children: TOCHeading[];
  expanded: boolean;
}

interface TableOfContentsState {
  // Visibility state
  isOpen: boolean;

  // Content
  headings: TOCHeading[];
  flatHeadings: TOCHeading[];

  // Active section tracking
  activeHeadingId: string | null;

  // Source document content (for extraction)
  documentContent: string;

  // Callbacks
  onNavigateToLine: ((lineNumber: number) => void) | null;

  // Actions
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  setDocumentContent: (content: string) => void;
  setActiveHeadingId: (id: string | null) => void;
  toggleHeadingExpanded: (id: string) => void;
  expandAllHeadings: () => void;
  collapseAllHeadings: () => void;
  setNavigateCallback: (callback: ((lineNumber: number) => void) | null) => void;
  navigateToHeading: (heading: TOCHeading) => void;
}

// Generate unique ID for headings
function generateHeadingId(title: string, lineNumber: number): string {
  return `toc-${lineNumber}-${title.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`;
}

// Extract headings from markdown content
function extractHeadings(content: string): { tree: TOCHeading[]; flat: TOCHeading[] } {
  const lines = content.split('\n');
  const flatHeadings: TOCHeading[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match markdown headings (# ## ###)
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length as 1 | 2 | 3;
      const title = match[2].trim();

      if (title) {
        flatHeadings.push({
          id: generateHeadingId(title, i),
          level,
          title,
          lineNumber: i,
          children: [],
          expanded: true,
        });
      }
    }
  }

  // Build tree structure
  const tree = buildHeadingTree(flatHeadings);

  return { tree, flat: flatHeadings };
}

// Build nested tree from flat heading list
function buildHeadingTree(flatHeadings: TOCHeading[]): TOCHeading[] {
  const tree: TOCHeading[] = [];
  const stack: TOCHeading[] = [];

  for (const heading of flatHeadings) {
    const newHeading = { ...heading, children: [] };

    // Find the appropriate parent
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      // This is a root level heading
      tree.push(newHeading);
    } else {
      // Add as child of the last item in stack
      stack[stack.length - 1].children.push(newHeading);
    }

    stack.push(newHeading);
  }

  return tree;
}

// Update expanded state recursively
function updateHeadingExpanded(headings: TOCHeading[], headingId: string): TOCHeading[] {
  return headings.map((heading) => {
    if (heading.id === headingId) {
      return { ...heading, expanded: !heading.expanded };
    }
    if (heading.children.length > 0) {
      return { ...heading, children: updateHeadingExpanded(heading.children, headingId) };
    }
    return heading;
  });
}

// Set all headings to expanded/collapsed
function setAllHeadingsExpanded(headings: TOCHeading[], expanded: boolean): TOCHeading[] {
  return headings.map((heading) => ({
    ...heading,
    expanded,
    children: heading.children.length > 0 ? setAllHeadingsExpanded(heading.children, expanded) : [],
  }));
}

export const useTableOfContentsStore = create<TableOfContentsState>()((set, get) => ({
  // Initial state
  isOpen: false,
  headings: [],
  flatHeadings: [],
  activeHeadingId: null,
  documentContent: '',
  onNavigateToLine: null,

  // Toggle panel visibility
  togglePanel: () => {
    set((state) => ({ isOpen: !state.isOpen }));
  },

  // Open panel
  openPanel: () => {
    set({ isOpen: true });
  },

  // Close panel
  closePanel: () => {
    set({ isOpen: false });
  },

  // Set document content and extract headings
  setDocumentContent: (content) => {
    const { tree, flat } = extractHeadings(content);
    set({
      documentContent: content,
      headings: tree,
      flatHeadings: flat,
    });
  },

  // Set active heading ID (for scroll tracking)
  setActiveHeadingId: (id) => {
    set({ activeHeadingId: id });
  },

  // Toggle heading expanded state
  toggleHeadingExpanded: (id) => {
    set((state) => ({
      headings: updateHeadingExpanded(state.headings, id),
    }));
  },

  // Expand all headings
  expandAllHeadings: () => {
    set((state) => ({
      headings: setAllHeadingsExpanded(state.headings, true),
    }));
  },

  // Collapse all headings
  collapseAllHeadings: () => {
    set((state) => ({
      headings: setAllHeadingsExpanded(state.headings, false),
    }));
  },

  // Set navigate callback
  setNavigateCallback: (callback) => {
    set({ onNavigateToLine: callback });
  },

  // Navigate to a specific heading
  navigateToHeading: (heading) => {
    const { onNavigateToLine } = get();
    if (onNavigateToLine) {
      onNavigateToLine(heading.lineNumber);
    }
    set({ activeHeadingId: heading.id });
  },
}));

// Convenience hook
export function useTableOfContents() {
  return useTableOfContentsStore();
}

// Selector hooks
export function useTOCIsOpen() {
  return useTableOfContentsStore((state) => state.isOpen);
}

export function useTOCHeadings() {
  return useTableOfContentsStore((state) => state.headings);
}

export function useTOCActiveHeading() {
  return useTableOfContentsStore((state) => state.activeHeadingId);
}
