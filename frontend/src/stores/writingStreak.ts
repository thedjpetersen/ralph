import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from './toast';

// Types for writing streak tracking
export interface DayEntry {
  wordCount: number;
  goalMet: boolean;
  timestamp: number;
}

export interface WritingStreakSettings {
  enabled: boolean;
  dailyGoal: number; // words per day
  showNotifications: boolean;
  celebrateMilestones: boolean;
}

export interface MilestoneState {
  day7: boolean;
  day30: boolean;
  day100: boolean;
}

export interface WeeklyStats {
  startDate: string;
  endDate: string;
  totalWords: number;
  daysWritten: number;
  goalsMetCount: number;
  averageWordsPerDay: number;
}

export interface MonthlyStats {
  month: number;
  year: number;
  totalWords: number;
  daysWritten: number;
  goalsMetCount: number;
  averageWordsPerDay: number;
  totalDaysInMonth: number;
}

export interface WritingStreakState {
  // Core streak data
  currentStreak: number;
  longestStreak: number;
  totalDaysWritten: number;
  lastWritingDate: string | null; // ISO date string YYYY-MM-DD

  // History tracking
  writingHistory: Record<string, DayEntry>; // key is ISO date YYYY-MM-DD

  // Settings
  settings: WritingStreakSettings;

  // Milestones
  milestonesReached: MilestoneState;

  // Goal celebration state
  todayGoalJustCompleted: boolean;
  lastGoalCompletionDate: string | null;

  // UI State
  isCalendarOpen: boolean;
  isStatsModalOpen: boolean;

  // Actions
  recordWriting: (wordCount: number) => void;
  updateDailyGoal: (goal: number) => void;
  updateSettings: (settings: Partial<WritingStreakSettings>) => void;
  openCalendar: () => void;
  closeCalendar: () => void;
  openStatsModal: () => void;
  closeStatsModal: () => void;
  resetStreak: () => void;
  clearGoalCelebration: () => void;

  // Computed helpers (called as functions)
  getTodayProgress: () => { wordCount: number; goal: number; percentage: number; goalMet: boolean; wordsRemaining: number };
  getStreakStatus: () => 'none' | 'active' | 'at_risk';
  getWeeklyStats: () => WeeklyStats;
  getMonthlyStats: (month?: number, year?: number) => MonthlyStats;
}

// Default settings
export const DEFAULT_STREAK_SETTINGS: WritingStreakSettings = {
  enabled: true,
  dailyGoal: 500,
  showNotifications: true,
  celebrateMilestones: true,
};

// Helper functions
function getLocalDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

function isYesterday(dateStr: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getLocalDateString(yesterday) === dateStr;
}

function isToday(dateStr: string): boolean {
  return getLocalDateString() === dateStr;
}

// Milestone messages
const MILESTONE_MESSAGES: Record<number, string> = {
  7: '🔥 Amazing! 7-day writing streak!',
  30: '🎉 Incredible! 30 days of writing!',
  100: '🏆 Legendary! 100-day writing streak!',
};

export const useWritingStreakStore = create<WritingStreakState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentStreak: 0,
      longestStreak: 0,
      totalDaysWritten: 0,
      lastWritingDate: null,
      writingHistory: {},
      settings: DEFAULT_STREAK_SETTINGS,
      milestonesReached: {
        day7: false,
        day30: false,
        day100: false,
      },
      todayGoalJustCompleted: false,
      lastGoalCompletionDate: null,
      isCalendarOpen: false,
      isStatsModalOpen: false,

      recordWriting: (wordCount: number) => {
        const today = getLocalDateString();
        const state = get();
        const { settings, writingHistory, lastWritingDate, currentStreak, longestStreak, milestonesReached, lastGoalCompletionDate } = state;

        // Get existing entry for today or create new one
        const existingEntry = writingHistory[today];
        const newWordCount = (existingEntry?.wordCount || 0) + wordCount;
        const goalMet = newWordCount >= settings.dailyGoal;
        const goalJustCompleted = goalMet && !existingEntry?.goalMet;

        // Update entry
        const newEntry: DayEntry = {
          wordCount: newWordCount,
          goalMet,
          timestamp: Date.now(),
        };

        // Calculate streak
        let newStreak = currentStreak;
        let newTotalDays = state.totalDaysWritten;

        // If this is the first write today and goal is met
        if (goalJustCompleted) {
          // Check if streak continues
          if (lastWritingDate === null) {
            // First ever writing
            newStreak = 1;
            newTotalDays = 1;
          } else if (isToday(lastWritingDate)) {
            // Already wrote today, no change to streak
            newStreak = currentStreak;
          } else if (isYesterday(lastWritingDate)) {
            // Continued from yesterday
            newStreak = currentStreak + 1;
            newTotalDays = state.totalDaysWritten + 1;
          } else {
            // Streak broken, starting fresh
            newStreak = 1;
            newTotalDays = state.totalDaysWritten + 1;
          }
        }

        // Update longest streak
        const newLongestStreak = Math.max(longestStreak, newStreak);

        // Check for milestones
        const newMilestones = { ...milestonesReached };
        if (settings.celebrateMilestones && settings.showNotifications) {
          if (newStreak === 7 && !milestonesReached.day7) {
            newMilestones.day7 = true;
            toast.success(MILESTONE_MESSAGES[7], { duration: 6000 });
          }
          if (newStreak === 30 && !milestonesReached.day30) {
            newMilestones.day30 = true;
            toast.success(MILESTONE_MESSAGES[30], { duration: 6000 });
          }
          if (newStreak === 100 && !milestonesReached.day100) {
            newMilestones.day100 = true;
            toast.success(MILESTONE_MESSAGES[100], { duration: 8000 });
          }
        }

        // Trigger goal celebration if goal just completed today (and not already celebrated)
        const shouldCelebrate = goalJustCompleted && lastGoalCompletionDate !== today && settings.celebrateMilestones;

        set({
          writingHistory: {
            ...writingHistory,
            [today]: newEntry,
          },
          currentStreak: newStreak,
          longestStreak: newLongestStreak,
          totalDaysWritten: newTotalDays,
          lastWritingDate: goalMet ? today : lastWritingDate,
          milestonesReached: newMilestones,
          todayGoalJustCompleted: shouldCelebrate,
          lastGoalCompletionDate: goalJustCompleted ? today : lastGoalCompletionDate,
        });
      },

      updateDailyGoal: (goal: number) => {
        set((state) => ({
          settings: {
            ...state.settings,
            dailyGoal: goal,
          },
        }));
      },

      updateSettings: (newSettings: Partial<WritingStreakSettings>) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...newSettings,
          },
        }));
      },

      openCalendar: () => {
        set({ isCalendarOpen: true });
      },

      closeCalendar: () => {
        set({ isCalendarOpen: false });
      },

      openStatsModal: () => {
        set({ isStatsModalOpen: true });
      },

      closeStatsModal: () => {
        set({ isStatsModalOpen: false });
      },

      clearGoalCelebration: () => {
        set({ todayGoalJustCompleted: false });
      },

      resetStreak: () => {
        set({
          currentStreak: 0,
          longestStreak: 0,
          totalDaysWritten: 0,
          lastWritingDate: null,
          writingHistory: {},
          milestonesReached: {
            day7: false,
            day30: false,
            day100: false,
          },
          todayGoalJustCompleted: false,
          lastGoalCompletionDate: null,
        });
      },

      getTodayProgress: () => {
        const state = get();
        const today = getLocalDateString();
        const entry = state.writingHistory[today];
        const wordCount = entry?.wordCount || 0;
        const goal = state.settings.dailyGoal;
        const wordsRemaining = Math.max(0, goal - wordCount);

        return {
          wordCount,
          goal,
          percentage: Math.min(100, Math.round((wordCount / goal) * 100)),
          goalMet: entry?.goalMet || false,
          wordsRemaining,
        };
      },

      getStreakStatus: () => {
        const state = get();
        const { lastWritingDate, currentStreak } = state;

        if (currentStreak === 0) {
          return 'none';
        }

        if (!lastWritingDate) {
          return 'none';
        }

        if (isToday(lastWritingDate)) {
          return 'active';
        }

        if (isYesterday(lastWritingDate)) {
          return 'at_risk'; // Haven't written today yet
        }

        return 'none'; // Streak is broken
      },

      getWeeklyStats: () => {
        const state = get();
        const { writingHistory } = state;
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday

        // Get start of current week (Sunday)
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);

        // Get end of current week (Saturday)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        let totalWords = 0;
        let daysWritten = 0;
        let goalsMetCount = 0;

        // Iterate through each day of the week
        for (let i = 0; i < 7; i++) {
          const date = new Date(startOfWeek);
          date.setDate(startOfWeek.getDate() + i);
          const dateString = getLocalDateString(date);
          const entry = writingHistory[dateString];

          if (entry) {
            totalWords += entry.wordCount;
            daysWritten++;
            if (entry.goalMet) {
              goalsMetCount++;
            }
          }
        }

        return {
          startDate: getLocalDateString(startOfWeek),
          endDate: getLocalDateString(endOfWeek),
          totalWords,
          daysWritten,
          goalsMetCount,
          averageWordsPerDay: daysWritten > 0 ? Math.round(totalWords / daysWritten) : 0,
        };
      },

      getMonthlyStats: (month?: number, year?: number) => {
        const state = get();
        const { writingHistory } = state;
        const today = new Date();
        const targetMonth = month !== undefined ? month : today.getMonth();
        const targetYear = year !== undefined ? year : today.getFullYear();

        // Get last day of the month (to determine total days)
        const lastDay = new Date(targetYear, targetMonth + 1, 0);
        const totalDaysInMonth = lastDay.getDate();

        let totalWords = 0;
        let daysWritten = 0;
        let goalsMetCount = 0;

        // Iterate through each day of the month
        for (let day = 1; day <= totalDaysInMonth; day++) {
          const date = new Date(targetYear, targetMonth, day);
          const dateString = getLocalDateString(date);
          const entry = writingHistory[dateString];

          if (entry) {
            totalWords += entry.wordCount;
            daysWritten++;
            if (entry.goalMet) {
              goalsMetCount++;
            }
          }
        }

        return {
          month: targetMonth,
          year: targetYear,
          totalWords,
          daysWritten,
          goalsMetCount,
          averageWordsPerDay: daysWritten > 0 ? Math.round(totalWords / daysWritten) : 0,
          totalDaysInMonth,
        };
      },
    }),
    {
      name: 'clockzen-writing-streak',
      partialize: (state) => ({
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        totalDaysWritten: state.totalDaysWritten,
        lastWritingDate: state.lastWritingDate,
        writingHistory: state.writingHistory,
        settings: state.settings,
        milestonesReached: state.milestonesReached,
        lastGoalCompletionDate: state.lastGoalCompletionDate,
      }),
    }
  )
);

// Selectors for optimized re-renders
export const useStreakSettings = () => useWritingStreakStore((state) => state.settings);
export const useCurrentStreak = () => useWritingStreakStore((state) => state.currentStreak);
export const useLongestStreak = () => useWritingStreakStore((state) => state.longestStreak);
export const useIsCalendarOpen = () => useWritingStreakStore((state) => state.isCalendarOpen);
export const useIsStatsModalOpen = () => useWritingStreakStore((state) => state.isStatsModalOpen);
export const useTodayGoalJustCompleted = () => useWritingStreakStore((state) => state.todayGoalJustCompleted);
