import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Account {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface AccountState {
  // State
  currentAccount: Account | null;
  accounts: Account[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentAccount: (account: Account | null) => void;
  setAccounts: (accounts: Account[]) => void;
  fetchAccounts: () => Promise<void>;
  createAccount: (data: Omit<Account, 'id' | 'createdAt'>) => Promise<Account>;
  switchAccount: (accountId: string) => void;
}

const API_BASE = '/api';

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentAccount: null,
      accounts: [],
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
