import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Account {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  currency?: string;
  timezone?: string;
}

export interface AccountMember {
  id: string;
  accountId: string;
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

interface AccountState {
  // State
  currentAccount: Account | null;
  accounts: Account[];
  members: AccountMember[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentAccount: (account: Account | null) => void;
  setAccounts: (accounts: Account[]) => void;
  fetchAccounts: () => Promise<void>;
  fetchAccount: (accountId: string) => Promise<Account>;
  createAccount: (data: Omit<Account, 'id' | 'createdAt'>) => Promise<Account>;
  updateAccount: (accountId: string, data: Partial<Pick<Account, 'name' | 'currency' | 'timezone'>>) => Promise<Account>;
  switchAccount: (accountId: string) => void;
  fetchMembers: (accountId: string) => Promise<void>;
  inviteMember: (accountId: string, email: string, role: AccountMember['role']) => Promise<AccountMember>;
  removeMember: (accountId: string, memberId: string) => Promise<void>;
  leaveAccount: (accountId: string) => Promise<void>;
}

const API_BASE = '/api';

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentAccount: null,
      accounts: [],
      members: [],
      isLoading: false,
      error: null,

      // Setter for current account
      setCurrentAccount: (account) => {
        set({ currentAccount: account });
      },

      // Setter for accounts list
      setAccounts: (accounts) => {
        set({ accounts });
      },

      // Fetch all accounts from API
      fetchAccounts: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/accounts`);
          if (!response.ok) {
            throw new Error('Failed to fetch accounts');
          }
          const accounts: Account[] = await response.json();
          set({ accounts, isLoading: false });

          // Set current account to first if none selected
          const { currentAccount } = get();
          if (!currentAccount && accounts.length > 0) {
            set({ currentAccount: accounts[0] });
          }
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Unknown error',
            isLoading: false,
          });
        }
      },

      // Create a new account
      createAccount: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/accounts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });
          if (!response.ok) {
            throw new Error('Failed to create account');
          }
          const newAccount: Account = await response.json();
          set((state) => ({
            accounts: [...state.accounts, newAccount],
            isLoading: false,
          }));
          return newAccount;
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Unknown error',
            isLoading: false,
          });
          throw err;
        }
      },

      // Switch to a different account
      switchAccount: (accountId) => {
        const { accounts } = get();
        const account = accounts.find((a) => a.id === accountId);
        if (account) {
          set({ currentAccount: account });
        }
      },

      // Fetch a single account by ID
      fetchAccount: async (accountId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/accounts/${accountId}`);
          if (!response.ok) {
            throw new Error('Failed to fetch account');
          }
          const account: Account = await response.json();
          set({ isLoading: false });
          return account;
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Unknown error',
            isLoading: false,
          });
          throw err;
        }
      },

      // Update account settings
      updateAccount: async (accountId, data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/accounts/${accountId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });
          if (!response.ok) {
            throw new Error('Failed to update account');
          }
          const updatedAccount: Account = await response.json();
          set((state) => ({
            accounts: state.accounts.map((a) =>
              a.id === accountId ? updatedAccount : a
            ),
            currentAccount:
              state.currentAccount?.id === accountId
                ? updatedAccount
                : state.currentAccount,
            isLoading: false,
          }));
          return updatedAccount;
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Unknown error',
            isLoading: false,
          });
          throw err;
        }
      },

      // Fetch members for an account
      fetchMembers: async (accountId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/accounts/${accountId}/members`);
          if (!response.ok) {
            throw new Error('Failed to fetch members');
          }
          const members: AccountMember[] = await response.json();
          set({ members, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Unknown error',
            isLoading: false,
          });
        }
      },

      // Invite a new member to the account
      inviteMember: async (accountId, email, role) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(`${API_BASE}/accounts/${accountId}/members`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, role }),
          });
          if (!response.ok) {
            throw new Error('Failed to invite member');
          }
          const newMember: AccountMember = await response.json();
          set((state) => ({
            members: [...state.members, newMember],
            isLoading: false,
          }));
          return newMember;
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Unknown error',
            isLoading: false,
          });
          throw err;
        }
      },

      // Remove a member from the account
      removeMember: async (accountId, memberId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(
            `${API_BASE}/accounts/${accountId}/members/${memberId}`,
            {
              method: 'DELETE',
            }
          );
          if (!response.ok) {
            throw new Error('Failed to remove member');
          }
          set((state) => ({
            members: state.members.filter((m) => m.id !== memberId),
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

      // Leave an account (current user removes themselves)
      leaveAccount: async (accountId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch(
            `${API_BASE}/accounts/${accountId}/leave`,
            {
              method: 'POST',
            }
          );
          if (!response.ok) {
            throw new Error('Failed to leave account');
          }
          set((state) => {
            const newAccounts = state.accounts.filter((a) => a.id !== accountId);
            const newCurrentAccount =
              state.currentAccount?.id === accountId
                ? newAccounts[0] || null
                : state.currentAccount;
            return {
              accounts: newAccounts,
              currentAccount: newCurrentAccount,
              isLoading: false,
            };
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Unknown error',
            isLoading: false,
          });
          throw err;
        }
      },
    }),
    {
      name: 'clockzen-account-storage',
      // Only persist the currentAccount ID, not the full object
      partialize: (state) => ({
        currentAccount: state.currentAccount,
      }),
    }
  )
);
