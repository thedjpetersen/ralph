import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string;
  bio?: string;
  avatar?: string;
  createdAt: string;
  emailVerified?: boolean;
  pendingEmail?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
  };
  defaultTimezone?: string;
  currency?: string;
  locale?: string;
}

export interface APIKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
}

interface UserState {
  // State
  user: User | null;
  preferences: UserPreferences;
  apiKeys: APIKey[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  fetchUser: () => Promise<void>;
  updateUser: (data: Partial<Pick<User, 'name' | 'email' | 'bio'>>) => Promise<User>;
  updateAvatar: (avatarUrl: string) => Promise<User>;
  requestEmailChange: (newEmail: string) => Promise<void>;
  updatePreferences: (data: Partial<UserPreferences>) => Promise<void>;
  fetchAPIKeys: () => Promise<void>;
  createAPIKey: (name: string, expiresAt?: string) => Promise<APIKey & { key: string }>;
  deleteAPIKey: (keyId: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  logout: () => void;
}

const API_BASE = '/api';

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  language: 'en',
  notifications: {
    email: true,
    push: false,
  },
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      preferences: DEFAULT_PREFERENCES,
      apiKeys: [],
      isLoading: false,
      error: null,

      // Setter for user
      setUser: (user) => {
        set({ user });
      },

      // Fetch current user from API
      fetchUser: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/user`);
          if (!response.ok) {
            throw new Error('Failed to fetch user');
          }
          const user: User = await response.json();
          set({ user, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Unknown error',
            isLoading: false,
          });
        }
      },

      // Update user profile
      updateUser: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/user`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });
          if (!response.ok) {
            throw new Error('Failed to update user');
          }
          const updatedUser: User = await response.json();
          set({ user: updatedUser, isLoading: false });
          return updatedUser;
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Unknown error',
            isLoading: false,
          });
          throw err;
        }
      },

      // Update user avatar
      updateAvatar: async (avatarUrl) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/user/avatar`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ avatar: avatarUrl }),
          });
          if (!response.ok) {
            throw new Error('Failed to update avatar');
          }
          const updatedUser: User = await response.json();
          set({ user: updatedUser, isLoading: false });
          return updatedUser;
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Unknown error',
            isLoading: false,
          });
          throw err;
        }
      },

      // Request email change (requires verification)
      requestEmailChange: async (newEmail) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/user/email/change`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: newEmail }),
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to request email change');
          }
          // Update user to show pending email
          const { user } = get();
          if (user) {
            set({ user: { ...user, pendingEmail: newEmail }, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Unknown error',
            isLoading: false,
          });
          throw err;
        }
      },

      // Update user preferences
      updatePreferences: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/user/preferences`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });
          if (!response.ok) {
            throw new Error('Failed to update preferences');
          }
          const { preferences } = get();
          const updatedPreferences = { ...preferences, ...data };
          set({ preferences: updatedPreferences, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Unknown error',
            isLoading: false,
          });
          throw err;
        }
      },

      // Fetch API keys
      fetchAPIKeys: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/user/api-keys`);
          if (!response.ok) {
            throw new Error('Failed to fetch API keys');
          }
          const apiKeys: APIKey[] = await response.json();
          set({ apiKeys, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Unknown error',
            isLoading: false,
          });
        }
      },

      // Create a new API key
      createAPIKey: async (name, expiresAt) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/user/api-keys`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, expiresAt }),
          });
          if (!response.ok) {
            throw new Error('Failed to create API key');
          }
          const newKey: APIKey & { key: string } = await response.json();
          // Store the key info without the full key (which is only shown once)
          const keyInfo: APIKey = {
            id: newKey.id,
            name: newKey.name,
            prefix: newKey.prefix,
            createdAt: newKey.createdAt,
            expiresAt: newKey.expiresAt,
            lastUsedAt: newKey.lastUsedAt,
          };
          set((state) => ({
            apiKeys: [...state.apiKeys, keyInfo],
            isLoading: false,
          }));
          return newKey;
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Unknown error',
            isLoading: false,
          });
          throw err;
        }
      },

      // Delete an API key
      deleteAPIKey: async (keyId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/user/api-keys/${keyId}`, {
            method: 'DELETE',
          });
          if (!response.ok) {
            throw new Error('Failed to delete API key');
          }
          set((state) => ({
            apiKeys: state.apiKeys.filter((k) => k.id !== keyId),
            isLoading: false,
          }));
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Unknown error',
            isLoading: false,
          });
          throw err;
        }
      },

      // Change password
      changePassword: async (currentPassword, newPassword) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/user/password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ currentPassword, newPassword }),
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to change password');
          }
          set({ isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Unknown error',
            isLoading: false,
          });
          throw err;
        }
      },

      // Delete account
      deleteAccount: async (password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/user`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password }),
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to delete account');
          }
          // Clear state after successful deletion
          set({
            user: null,
            preferences: DEFAULT_PREFERENCES,
            apiKeys: [],
            isLoading: false,
            error: null,
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Unknown error',
            isLoading: false,
          });
          throw err;
        }
      },

      // Logout and clear state
      logout: () => {
        set({
          user: null,
          preferences: DEFAULT_PREFERENCES,
          apiKeys: [],
          error: null,
        });
      },
    }),
    {
      name: 'clockzen-user-storage',
      partialize: (state) => ({
        user: state.user,
        preferences: state.preferences,
      }),
    }
  )
);
