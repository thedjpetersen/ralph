import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Default settings values
export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  autoSave: true,
  autoSaveInterval: 30, // seconds
  startPage: 'dashboard',
  confirmOnExit: true,
};

export type CommentSortOrder = 'newest' | 'oldest' | 'author' | 'position' | 'type';

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  smartTypography: true,
  paragraphFocus: false,
  typewriterScroll: false,
  spellCheck: true,
  lineNumbers: false,
  wordWrap: true,
  fontSize: 16,
  fontFamily: 'system',
  lineHeight: 1.6,
  editorWidth: 'medium',
  tabSize: 2,
  commentSortOrder: 'newest',
};

export type FeedbackVerbosity = 'brief' | 'standard' | 'detailed';
export type FeedbackType = 'inline' | 'sidebar' | 'modal';
export type AIModel = 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3-opus' | 'claude-3-sonnet' | 'default';
export type FeedbackScheduleMode = 'manual' | 'every-paragraph' | 'every-500-words';

export const DEFAULT_AI_SETTINGS: AISettings = {
  enableSuggestions: true,
  enableRewrite: true,
  enableComments: true,
  suggestionDelay: 500, // ms
  aiProvider: 'default',
  apiKey: '',
  feedbackVerbosity: 'standard',
  defaultFeedbackType: 'inline',
  aiModel: 'default',
  feedbackScheduleMode: 'manual',
  feedbackSchedulePauseDelay: 3000, // ms - pause before triggering scheduled feedback
};

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  theme: 'system',
  accentColor: 'blue',
  compactMode: false,
  showAnimations: true,
  sidebarCollapsed: false,
  commentsPanelCollapsed: false,
};

export interface GeneralSettings {
  autoSave: boolean;
  autoSaveInterval: number;
  startPage: 'dashboard' | 'documents' | 'lastOpened';
  confirmOnExit: boolean;
}

export type EditorFontFamily = 'system' | 'serif' | 'sans-serif' | 'monospace' | 'georgia';
export type EditorWidth = 'narrow' | 'medium' | 'wide' | 'full';

export interface EditorSettings {
  smartTypography: boolean;
  paragraphFocus: boolean;
  typewriterScroll: boolean;
  spellCheck: boolean;
  lineNumbers: boolean;
  wordWrap: boolean;
  fontSize: number;
  fontFamily: EditorFontFamily;
  lineHeight: number;
  editorWidth: EditorWidth;
  tabSize: number;
  commentSortOrder: CommentSortOrder;
}

export interface AISettings {
  enableSuggestions: boolean;
  enableRewrite: boolean;
  enableComments: boolean;
  suggestionDelay: number;
  aiProvider: 'default' | 'openai' | 'anthropic' | 'custom';
  apiKey: string;
  feedbackVerbosity: FeedbackVerbosity;
  defaultFeedbackType: FeedbackType;
  aiModel: AIModel;
  feedbackScheduleMode: FeedbackScheduleMode;
  feedbackSchedulePauseDelay: number;
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  accentColor: 'blue' | 'purple' | 'green' | 'orange' | 'red';
  compactMode: boolean;
  showAnimations: boolean;
  sidebarCollapsed: boolean;
  commentsPanelCollapsed: boolean;
}

export interface AppSettings {
  general: GeneralSettings;
  editor: EditorSettings;
  ai: AISettings;
  appearance: AppearanceSettings;
}

export type SettingsSection = 'general' | 'editor' | 'ai' | 'appearance' | 'goals' | 'account';

interface AppSettingsState {
  // Settings
  settings: AppSettings;

  // UI State
  activeSection: SettingsSection;
  isSaving: boolean;
  lastSaved: string | null;
  hasUnsavedChanges: boolean;

  // Actions
  setActiveSection: (section: SettingsSection) => void;
  updateGeneralSettings: (settings: Partial<GeneralSettings>) => void;
  updateEditorSettings: (settings: Partial<EditorSettings>) => void;
  updateAISettings: (settings: Partial<AISettings>) => void;
  updateAppearanceSettings: (settings: Partial<AppearanceSettings>) => void;
  resetToDefaults: (section?: SettingsSection) => void;
  resetAllSettings: () => void;
  saveSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  general: DEFAULT_GENERAL_SETTINGS,
  editor: DEFAULT_EDITOR_SETTINGS,
  ai: DEFAULT_AI_SETTINGS,
  appearance: DEFAULT_APPEARANCE_SETTINGS,
};

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set, get) => ({
      // Initial state
      settings: DEFAULT_SETTINGS,
      activeSection: 'general',
      isSaving: false,
      lastSaved: null,
      hasUnsavedChanges: false,

      setActiveSection: (section) => {
        set({ activeSection: section });
      },

      updateGeneralSettings: (newSettings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            general: { ...state.settings.general, ...newSettings },
          },
          hasUnsavedChanges: true,
        }));
        // Auto-save
        get().saveSettings();
      },

      updateEditorSettings: (newSettings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            editor: { ...state.settings.editor, ...newSettings },
          },
          hasUnsavedChanges: true,
        }));
        // Auto-save
        get().saveSettings();
      },

      updateAISettings: (newSettings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ai: { ...state.settings.ai, ...newSettings },
          },
          hasUnsavedChanges: true,
        }));
        // Auto-save
        get().saveSettings();
      },

      updateAppearanceSettings: (newSettings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            appearance: { ...state.settings.appearance, ...newSettings },
          },
          hasUnsavedChanges: true,
        }));
        // Auto-save
        get().saveSettings();
      },

      resetToDefaults: (section) => {
        set((state) => {
          if (!section) {
            return {
              settings: DEFAULT_SETTINGS,
              hasUnsavedChanges: true,
            };
          }

          const sectionDefaults: Record<string, object> = {
            general: DEFAULT_GENERAL_SETTINGS,
            editor: DEFAULT_EDITOR_SETTINGS,
            ai: DEFAULT_AI_SETTINGS,
            appearance: DEFAULT_APPEARANCE_SETTINGS,
          };

          if (sectionDefaults[section]) {
            return {
              settings: {
                ...state.settings,
                [section]: sectionDefaults[section],
              },
              hasUnsavedChanges: true,
            };
          }

          return state;
        });
        // Auto-save after reset
        get().saveSettings();
      },

      resetAllSettings: () => {
        set({
          settings: DEFAULT_SETTINGS,
          hasUnsavedChanges: true,
        });
        get().saveSettings();
      },

      saveSettings: async () => {
        set({ isSaving: true });

        try {
          // Simulate API save (in real app this would save to backend)
          await new Promise((resolve) => setTimeout(resolve, 300));

          set({
            isSaving: false,
            lastSaved: new Date().toISOString(),
            hasUnsavedChanges: false,
          });
        } catch {
          set({ isSaving: false });
        }
      },
    }),
    {
      name: 'clockzen-app-settings',
      partialize: (state) => ({
        settings: state.settings,
        activeSection: state.activeSection,
      }),
    }
  )
);

// Selectors
const selectSettings = (state: AppSettingsState) => state.settings;
const selectActiveSection = (state: AppSettingsState) => state.activeSection;
const selectIsSaving = (state: AppSettingsState) => state.isSaving;
const selectLastSaved = (state: AppSettingsState) => state.lastSaved;

export function useAppSettings() {
  const settings = useAppSettingsStore(selectSettings);
  const activeSection = useAppSettingsStore(selectActiveSection);
  const isSaving = useAppSettingsStore(selectIsSaving);
  const lastSaved = useAppSettingsStore(selectLastSaved);

  return {
    settings,
    activeSection,
    isSaving,
    lastSaved,
  };
}
