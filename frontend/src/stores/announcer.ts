import { create } from 'zustand';

export type AnnouncementPoliteness = 'polite' | 'assertive';

export interface Announcement {
  id: string;
  message: string;
  politeness: AnnouncementPoliteness;
  timestamp: number;
}

interface AnnouncerState {
  announcements: Announcement[];
  announce: (message: string, politeness?: AnnouncementPoliteness) => void;
  clearAnnouncements: () => void;
}

let announcementId = 0;

function generateId(): string {
  return `announcement-${++announcementId}-${Date.now()}`;
}

export const useAnnouncerStore = create<AnnouncerState>((set, get) => ({
  announcements: [],

  announce: (message, politeness = 'polite') => {
    const id = generateId();
    const announcement: Announcement = {
      id,
      message,
      politeness,
      timestamp: Date.now(),
    };

    // Keep only the last 5 announcements to prevent memory leaks
    const { announcements } = get();
    const recentAnnouncements = announcements.slice(-4);

    set({ announcements: [...recentAnnouncements, announcement] });

    // Auto-clear announcement after 5 seconds
    setTimeout(() => {
      const currentAnnouncements = get().announcements;
      set({
        announcements: currentAnnouncements.filter((a) => a.id !== id),
      });
    }, 5000);
  },

  clearAnnouncements: () => {
    set({ announcements: [] });
  },
}));

// Convenience functions for making announcements
export function announce(message: string, politeness: AnnouncementPoliteness = 'polite') {
  return useAnnouncerStore.getState().announce(message, politeness);
}

announce.polite = (message: string) => {
  return useAnnouncerStore.getState().announce(message, 'polite');
};

announce.assertive = (message: string) => {
  return useAnnouncerStore.getState().announce(message, 'assertive');
};
