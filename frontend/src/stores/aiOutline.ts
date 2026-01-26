/**
 * AI Outline Store
 *
 * Manages state for AI-powered document outline generation.
 * Generates structured H1/H2/H3 outlines from rough notes or topic descriptions.
 */

import { create } from 'zustand';

export type OutlineDepth = 'shallow' | 'standard' | 'deep';

export interface OutlineDepthOption {
  value: OutlineDepth;
  label: string;
  description: string;
  maxDepth: number;
}

export const OUTLINE_DEPTH_OPTIONS: OutlineDepthOption[] = [
  {
    value: 'shallow',
    label: 'Shallow',
    description: 'Main sections only (H1, H2)',
    maxDepth: 2,
  },
  {
    value: 'standard',
    label: 'Standard',
    description: 'Balanced depth (H1, H2, H3)',
    maxDepth: 3,
  },
  {
    value: 'deep',
    label: 'Deep',
    description: 'Detailed subsections (H1-H4)',
    maxDepth: 4,
  },
];

export interface OutlineSection {
  id: string;
  level: 1 | 2 | 3 | 4;
  title: string;
  description?: string;
  children: OutlineSection[];
  expanded: boolean;
}

// Callback type for insert outline functionality
export type InsertOutlineCallback = ((outline: OutlineSection[]) => void) | null;

// Callback type for navigate to section functionality
export type NavigateToSectionCallback = ((section: OutlineSection) => void) | null;

interface AIOutlineState {
  // Dialog state
  isOpen: boolean;
  inputContent: string;
  inputTitle: string;

  // Outline options
  selectedDepth: OutlineDepth;

  // Outline result
  outline: OutlineSection[] | null;
  isGenerating: boolean;
  error: string | null;

  // Callbacks
  onInsertOutline: InsertOutlineCallback;
  onNavigateToSection: NavigateToSectionCallback;

  // Actions
  openOutlineDialog: (content: string, title?: string) => void;
  closeOutlineDialog: () => void;
  setSelectedDepth: (depth: OutlineDepth) => void;
  generateOutline: () => Promise<void>;
  regenerateOutline: () => Promise<void>;
  toggleSectionExpanded: (sectionId: string) => void;
  expandAllSections: () => void;
  collapseAllSections: () => void;
  copyToClipboard: () => Promise<boolean>;
  clearError: () => void;
  setInsertOutlineCallback: (callback: InsertOutlineCallback) => void;
  setNavigateToSectionCallback: (callback: NavigateToSectionCallback) => void;
  insertOutline: () => void;
  navigateToSection: (section: OutlineSection) => void;
}

// Generate unique ID for sections
function generateId(): string {
  return `section-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Convert outline to markdown format
function outlineToMarkdown(sections: OutlineSection[], prefix = ''): string {
  let result = '';
  for (const section of sections) {
    const headingLevel = '#'.repeat(section.level);
    result += `${headingLevel} ${section.title}\n`;
    if (section.description) {
      result += `${section.description}\n`;
    }
    result += '\n';
    if (section.children.length > 0) {
      result += outlineToMarkdown(section.children, prefix);
    }
  }
  return result;
}

// Update expanded state recursively
function updateExpanded(sections: OutlineSection[], sectionId: string): OutlineSection[] {
  return sections.map((section) => {
    if (section.id === sectionId) {
      return { ...section, expanded: !section.expanded };
    }
    if (section.children.length > 0) {
      return { ...section, children: updateExpanded(section.children, sectionId) };
    }
    return section;
  });
}

// Set all sections to expanded/collapsed
function setAllExpanded(sections: OutlineSection[], expanded: boolean): OutlineSection[] {
  return sections.map((section) => ({
    ...section,
    expanded,
    children: section.children.length > 0 ? setAllExpanded(section.children, expanded) : [],
  }));
}

// Mock outline generation based on content analysis
// In production, this would call the AI API
function generateMockOutline(content: string, depth: OutlineDepth): OutlineSection[] {
  const lowerContent = content.toLowerCase();
  const depthOption = OUTLINE_DEPTH_OPTIONS.find((o) => o.value === depth);
  const maxDepth = depthOption?.maxDepth || 3;

  // Financial/Budget content
  if (
    lowerContent.includes('budget') ||
    lowerContent.includes('financial') ||
    lowerContent.includes('expense') ||
    lowerContent.includes('money')
  ) {
    const outline: OutlineSection[] = [
      {
        id: generateId(),
        level: 1,
        title: 'Financial Overview',
        description: 'Introduction to financial planning and budgeting fundamentals',
        expanded: true,
        children:
          maxDepth >= 2
            ? [
                {
                  id: generateId(),
                  level: 2,
                  title: 'Current Financial Status',
                  description: 'Assessment of current income, expenses, and net worth',
                  expanded: true,
                  children:
                    maxDepth >= 3
                      ? [
                          {
                            id: generateId(),
                            level: 3,
                            title: 'Income Sources',
                            expanded: true,
                            children: [],
                          },
                          {
                            id: generateId(),
                            level: 3,
                            title: 'Fixed Expenses',
                            expanded: true,
                            children: [],
                          },
                          {
                            id: generateId(),
                            level: 3,
                            title: 'Variable Expenses',
                            expanded: true,
                            children: [],
                          },
                        ]
                      : [],
                },
                {
                  id: generateId(),
                  level: 2,
                  title: 'Financial Goals',
                  description: 'Short-term and long-term financial objectives',
                  expanded: true,
                  children: [],
                },
              ]
            : [],
      },
      {
        id: generateId(),
        level: 1,
        title: 'Budget Planning',
        description: 'Strategies for effective budget allocation and management',
        expanded: true,
        children:
          maxDepth >= 2
            ? [
                {
                  id: generateId(),
                  level: 2,
                  title: 'Monthly Budget Framework',
                  description: 'Creating a sustainable monthly spending plan',
                  expanded: true,
                  children:
                    maxDepth >= 3
                      ? [
                          {
                            id: generateId(),
                            level: 3,
                            title: 'Essential Expenses',
                            expanded: true,
                            children: [],
                          },
                          {
                            id: generateId(),
                            level: 3,
                            title: 'Discretionary Spending',
                            expanded: true,
                            children: [],
                          },
                        ]
                      : [],
                },
                {
                  id: generateId(),
                  level: 2,
                  title: 'Expense Tracking',
                  description: 'Methods and tools for monitoring spending',
                  expanded: true,
                  children: [],
                },
              ]
            : [],
      },
      {
        id: generateId(),
        level: 1,
        title: 'Savings Strategy',
        description: 'Building emergency funds and long-term savings',
        expanded: true,
        children:
          maxDepth >= 2
            ? [
                {
                  id: generateId(),
                  level: 2,
                  title: 'Emergency Fund',
                  expanded: true,
                  children: [],
                },
                {
                  id: generateId(),
                  level: 2,
                  title: 'Retirement Planning',
                  expanded: true,
                  children: [],
                },
              ]
            : [],
      },
    ];
    return outline;
  }

  // Project/Technical content
  if (
    lowerContent.includes('project') ||
    lowerContent.includes('development') ||
    lowerContent.includes('software') ||
    lowerContent.includes('system')
  ) {
    const outline: OutlineSection[] = [
      {
        id: generateId(),
        level: 1,
        title: 'Project Overview',
        description: 'High-level introduction and objectives',
        expanded: true,
        children:
          maxDepth >= 2
            ? [
                {
                  id: generateId(),
                  level: 2,
                  title: 'Background',
                  expanded: true,
                  children: [],
                },
                {
                  id: generateId(),
                  level: 2,
                  title: 'Objectives',
                  expanded: true,
                  children: [],
                },
                {
                  id: generateId(),
                  level: 2,
                  title: 'Scope',
                  expanded: true,
                  children: [],
                },
              ]
            : [],
      },
      {
        id: generateId(),
        level: 1,
        title: 'Technical Architecture',
        description: 'System design and component structure',
        expanded: true,
        children:
          maxDepth >= 2
            ? [
                {
                  id: generateId(),
                  level: 2,
                  title: 'System Components',
                  expanded: true,
                  children:
                    maxDepth >= 3
                      ? [
                          {
                            id: generateId(),
                            level: 3,
                            title: 'Frontend',
                            expanded: true,
                            children: [],
                          },
                          {
                            id: generateId(),
                            level: 3,
                            title: 'Backend',
                            expanded: true,
                            children: [],
                          },
                          {
                            id: generateId(),
                            level: 3,
                            title: 'Database',
                            expanded: true,
                            children: [],
                          },
                        ]
                      : [],
                },
                {
                  id: generateId(),
                  level: 2,
                  title: 'Data Flow',
                  expanded: true,
                  children: [],
                },
              ]
            : [],
      },
      {
        id: generateId(),
        level: 1,
        title: 'Implementation Plan',
        description: 'Development phases and milestones',
        expanded: true,
        children:
          maxDepth >= 2
            ? [
                {
                  id: generateId(),
                  level: 2,
                  title: 'Phase 1: Foundation',
                  expanded: true,
                  children: [],
                },
                {
                  id: generateId(),
                  level: 2,
                  title: 'Phase 2: Core Features',
                  expanded: true,
                  children: [],
                },
                {
                  id: generateId(),
                  level: 2,
                  title: 'Phase 3: Polish & Launch',
                  expanded: true,
                  children: [],
                },
              ]
            : [],
      },
    ];
    return outline;
  }

  // Research/Article content
  if (
    lowerContent.includes('research') ||
    lowerContent.includes('study') ||
    lowerContent.includes('analysis') ||
    lowerContent.includes('findings')
  ) {
    const outline: OutlineSection[] = [
      {
        id: generateId(),
        level: 1,
        title: 'Introduction',
        description: 'Research background and motivation',
        expanded: true,
        children:
          maxDepth >= 2
            ? [
                {
                  id: generateId(),
                  level: 2,
                  title: 'Problem Statement',
                  expanded: true,
                  children: [],
                },
                {
                  id: generateId(),
                  level: 2,
                  title: 'Research Questions',
                  expanded: true,
                  children: [],
                },
              ]
            : [],
      },
      {
        id: generateId(),
        level: 1,
        title: 'Literature Review',
        description: 'Existing research and theoretical framework',
        expanded: true,
        children:
          maxDepth >= 2
            ? [
                {
                  id: generateId(),
                  level: 2,
                  title: 'Theoretical Background',
                  expanded: true,
                  children: [],
                },
                {
                  id: generateId(),
                  level: 2,
                  title: 'Related Work',
                  expanded: true,
                  children: [],
                },
              ]
            : [],
      },
      {
        id: generateId(),
        level: 1,
        title: 'Methodology',
        description: 'Research methods and data collection',
        expanded: true,
        children:
          maxDepth >= 2
            ? [
                {
                  id: generateId(),
                  level: 2,
                  title: 'Data Collection',
                  expanded: true,
                  children: [],
                },
                {
                  id: generateId(),
                  level: 2,
                  title: 'Analysis Methods',
                  expanded: true,
                  children: [],
                },
              ]
            : [],
      },
      {
        id: generateId(),
        level: 1,
        title: 'Results',
        description: 'Key findings and data presentation',
        expanded: true,
        children: [],
      },
      {
        id: generateId(),
        level: 1,
        title: 'Discussion',
        description: 'Interpretation and implications',
        expanded: true,
        children: [],
      },
      {
        id: generateId(),
        level: 1,
        title: 'Conclusion',
        description: 'Summary and future directions',
        expanded: true,
        children: [],
      },
    ];
    return outline;
  }

  // Generic/Default content
  const wordCount = content.split(/\s+/).length;
  const outline: OutlineSection[] = [
    {
      id: generateId(),
      level: 1,
      title: 'Introduction',
      description: 'Overview and context setting',
      expanded: true,
      children:
        maxDepth >= 2
          ? [
              {
                id: generateId(),
                level: 2,
                title: 'Background',
                expanded: true,
                children: [],
              },
              {
                id: generateId(),
                level: 2,
                title: 'Purpose',
                expanded: true,
                children: [],
              },
            ]
          : [],
    },
    {
      id: generateId(),
      level: 1,
      title: 'Main Content',
      description: `Core material covering ${wordCount} words of source content`,
      expanded: true,
      children:
        maxDepth >= 2
          ? [
              {
                id: generateId(),
                level: 2,
                title: 'Key Points',
                expanded: true,
                children:
                  maxDepth >= 3
                    ? [
                        {
                          id: generateId(),
                          level: 3,
                          title: 'Point 1',
                          expanded: true,
                          children: [],
                        },
                        {
                          id: generateId(),
                          level: 3,
                          title: 'Point 2',
                          expanded: true,
                          children: [],
                        },
                        {
                          id: generateId(),
                          level: 3,
                          title: 'Point 3',
                          expanded: true,
                          children: [],
                        },
                      ]
                    : [],
              },
              {
                id: generateId(),
                level: 2,
                title: 'Supporting Details',
                expanded: true,
                children: [],
              },
            ]
          : [],
    },
    {
      id: generateId(),
      level: 1,
      title: 'Conclusion',
      description: 'Summary and next steps',
      expanded: true,
      children:
        maxDepth >= 2
          ? [
              {
                id: generateId(),
                level: 2,
                title: 'Summary',
                expanded: true,
                children: [],
              },
              {
                id: generateId(),
                level: 2,
                title: 'Recommendations',
                expanded: true,
                children: [],
              },
            ]
          : [],
    },
  ];

  return outline;
}

// Count total sections in outline
function countSections(sections: OutlineSection[]): number {
  let count = sections.length;
  for (const section of sections) {
    count += countSections(section.children);
  }
  return count;
}

export const useAIOutlineStore = create<AIOutlineState>()((set, get) => ({
  // Initial state
  isOpen: false,
  inputContent: '',
  inputTitle: 'Untitled Document',
  selectedDepth: 'standard',
  outline: null,
  isGenerating: false,
  error: null,
  onInsertOutline: null,
  onNavigateToSection: null,

  // Open outline dialog
  openOutlineDialog: (content, title) => {
    set({
      isOpen: true,
      inputContent: content,
      inputTitle: title || 'Untitled Document',
      outline: null,
      error: null,
    });
  },

  // Close outline dialog
  closeOutlineDialog: () => {
    set({
      isOpen: false,
      inputContent: '',
      inputTitle: 'Untitled Document',
      outline: null,
      error: null,
      isGenerating: false,
    });
  },

  // Set selected depth
  setSelectedDepth: (depth) => {
    set({ selectedDepth: depth });
  },

  // Generate outline
  generateOutline: async () => {
    const state = get();

    if (!state.inputContent.trim()) {
      set({ error: 'Please add some content before generating an outline' });
      return;
    }

    set({ isGenerating: true, error: null });

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Generate mock outline (would be API call in production)
      const outline = generateMockOutline(state.inputContent, state.selectedDepth);

      set({ outline, isGenerating: false });
    } catch (error) {
      set({
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Failed to generate outline',
      });
    }
  },

  // Regenerate with same settings
  regenerateOutline: async () => {
    const state = get();
    if (state.isGenerating) return;

    set({ isGenerating: true, error: null });

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Generate new mock outline
      const outline = generateMockOutline(state.inputContent, state.selectedDepth);

      set({ outline, isGenerating: false });
    } catch (error) {
      set({
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Failed to regenerate outline',
      });
    }
  },

  // Toggle section expanded state
  toggleSectionExpanded: (sectionId) => {
    const state = get();
    if (!state.outline) return;

    set({
      outline: updateExpanded(state.outline, sectionId),
    });
  },

  // Expand all sections
  expandAllSections: () => {
    const state = get();
    if (!state.outline) return;

    set({
      outline: setAllExpanded(state.outline, true),
    });
  },

  // Collapse all sections
  collapseAllSections: () => {
    const state = get();
    if (!state.outline) return;

    set({
      outline: setAllExpanded(state.outline, false),
    });
  },

  // Copy outline to clipboard as markdown
  copyToClipboard: async () => {
    const state = get();

    if (!state.outline) {
      return false;
    }

    try {
      const markdown = outlineToMarkdown(state.outline);
      await navigator.clipboard.writeText(markdown);
      return true;
    } catch {
      set({ error: 'Failed to copy to clipboard' });
      return false;
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Set insert outline callback
  setInsertOutlineCallback: (callback) => {
    set({ onInsertOutline: callback });
  },

  // Set navigate to section callback
  setNavigateToSectionCallback: (callback) => {
    set({ onNavigateToSection: callback });
  },

  // Insert outline into document
  insertOutline: () => {
    const state = get();
    if (state.outline && state.onInsertOutline) {
      state.onInsertOutline(state.outline);
    }
  },

  // Navigate to specific section
  navigateToSection: (section) => {
    const state = get();
    if (state.onNavigateToSection) {
      state.onNavigateToSection(section);
    }
  },
}));

// Hook for accessing the store
export function useAIOutline() {
  return useAIOutlineStore();
}

// Utility exports
export { outlineToMarkdown, countSections };
