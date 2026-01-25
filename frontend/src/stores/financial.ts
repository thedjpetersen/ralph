import { create } from 'zustand';
import {
  financialConnectionsApi,
  financialAccountsApi,
  type FinancialConnection,
  type FinancialAccount,
  type FinancialAccountsSummary,
  type ListFinancialConnectionsParams,
  type ListFinancialAccountsParams,
  type CreateLinkTokenResponse,
  type ConnectFinancialConnectionRequest,
  type UpdateFinancialAccountRequest,
} from '../api/client';

interface FinancialState {
  // Connections state
  connections: FinancialConnection[];
  currentConnection: FinancialConnection | null;
  connectionsTotal: number;

  // Accounts state
  accounts: FinancialAccount[];
  currentAccount: FinancialAccount | null;
  accountsTotal: number;
  accountsSummary: FinancialAccountsSummary | null;

  // Shared state
  isLoading: boolean;
  error: string | null;
  linkToken: string | null;
  linkTokenExpiration: string | null;

  // Connection actions
  setConnections: (connections: FinancialConnection[]) => void;
  setCurrentConnection: (connection: FinancialConnection | null) => void;
  fetchConnections: (accountId: string, params?: ListFinancialConnectionsParams) => Promise<void>;
  fetchConnection: (accountId: string, id: string) => Promise<FinancialConnection>;
  createLinkToken: (accountId: string) => Promise<CreateLinkTokenResponse>;
  connectConnection: (accountId: string, data: ConnectFinancialConnectionRequest) => Promise<FinancialConnection>;
  disconnectConnection: (accountId: string, id: string) => Promise<void>;
  refreshConnection: (accountId: string, id: string) => Promise<FinancialConnection>;

  // Account actions
  setAccounts: (accounts: FinancialAccount[]) => void;
  setCurrentFinancialAccount: (account: FinancialAccount | null) => void;
  fetchAccounts: (accountId: string, params?: ListFinancialAccountsParams) => Promise<void>;
  fetchAccount: (accountId: string, id: string) => Promise<FinancialAccount>;
  updateAccount: (accountId: string, id: string, data: UpdateFinancialAccountRequest) => Promise<FinancialAccount>;
  fetchAccountsSummary: (accountId: string) => Promise<FinancialAccountsSummary>;
  setAccountActive: (accountId: string, id: string, isActive: boolean) => Promise<FinancialAccount>;
  setAccountHidden: (accountId: string, id: string, isHidden: boolean) => Promise<FinancialAccount>;

  // Utility actions
  clearError: () => void;
  clearLinkToken: () => void;
}

export const useFinancialStore = create<FinancialState>()((set) => ({
  // Initial state
  connections: [],
  currentConnection: null,
  connectionsTotal: 0,
  accounts: [],
  currentAccount: null,
  accountsTotal: 0,
  accountsSummary: null,
  isLoading: false,
  error: null,
  linkToken: null,
  linkTokenExpiration: null,

  // Connection setters
  setConnections: (connections) => {
    set({ connections });
  },

  setCurrentConnection: (connection) => {
    set({ currentConnection: connection });
  },

  // Fetch all connections
  fetchConnections: async (accountId, params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await financialConnectionsApi.list(accountId, params);
      set({ connections: response.connections, connectionsTotal: response.total, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Fetch a single connection
  fetchConnection: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      const connection = await financialConnectionsApi.get(accountId, id);
      set({ currentConnection: connection, isLoading: false });
      return connection;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Create link token for Plaid
  createLinkToken: async (accountId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await financialConnectionsApi.createLinkToken(accountId);
      set({
        linkToken: response.link_token,
        linkTokenExpiration: response.expiration,
        isLoading: false,
      });
      return response;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Connect a new financial connection
  connectConnection: async (accountId, data) => {
    set({ isLoading: true, error: null });
    try {
      const connection = await financialConnectionsApi.connect(accountId, data);
      set((state) => ({
        connections: [...state.connections, connection],
        connectionsTotal: state.connectionsTotal + 1,
        linkToken: null,
        linkTokenExpiration: null,
        isLoading: false,
      }));
      return connection;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Disconnect a connection
  disconnectConnection: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      await financialConnectionsApi.disconnect(accountId, id);
      set((state) => ({
        connections: state.connections.filter((c) => c.id !== id),
        currentConnection: state.currentConnection?.id === id ? null : state.currentConnection,
        connectionsTotal: state.connectionsTotal - 1,
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

  // Refresh a connection
  refreshConnection: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      const connection = await financialConnectionsApi.refresh(accountId, id);
      set((state) => ({
        connections: state.connections.map((c) => (c.id === id ? connection : c)),
        currentConnection: state.currentConnection?.id === id ? connection : state.currentConnection,
        isLoading: false,
      }));
      return connection;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Account setters
  setAccounts: (accounts) => {
    set({ accounts });
  },

  setCurrentFinancialAccount: (account) => {
    set({ currentAccount: account });
  },

  // Fetch all financial accounts
  fetchAccounts: async (accountId, params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await financialAccountsApi.list(accountId, params);
      set({ accounts: response.accounts, accountsTotal: response.total, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Fetch a single account
  fetchAccount: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      const account = await financialAccountsApi.get(accountId, id);
      set({ currentAccount: account, isLoading: false });
      return account;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Update an account
  updateAccount: async (accountId, id, data) => {
    set({ isLoading: true, error: null });
    try {
      const account = await financialAccountsApi.update(accountId, id, data);
      set((state) => ({
        accounts: state.accounts.map((a) => (a.id === id ? account : a)),
        currentAccount: state.currentAccount?.id === id ? account : state.currentAccount,
        isLoading: false,
      }));
      return account;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Fetch accounts summary
  fetchAccountsSummary: async (accountId) => {
    set({ isLoading: true, error: null });
    try {
      const summary = await financialAccountsApi.getSummary(accountId);
      set({ accountsSummary: summary, isLoading: false });
      return summary;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Set account active status
  setAccountActive: async (accountId, id, isActive) => {
    set({ isLoading: true, error: null });
    try {
      const account = await financialAccountsApi.setActive(accountId, id, isActive);
      set((state) => ({
        accounts: state.accounts.map((a) => (a.id === id ? account : a)),
        currentAccount: state.currentAccount?.id === id ? account : state.currentAccount,
        isLoading: false,
      }));
      return account;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Set account hidden status
  setAccountHidden: async (accountId, id, isHidden) => {
    set({ isLoading: true, error: null });
    try {
      const account = await financialAccountsApi.setHidden(accountId, id, isHidden);
      set((state) => ({
        accounts: state.accounts.map((a) => (a.id === id ? account : a)),
        currentAccount: state.currentAccount?.id === id ? account : state.currentAccount,
        isLoading: false,
      }));
      return account;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Utility actions
  clearError: () => {
    set({ error: null });
  },

  clearLinkToken: () => {
    set({ linkToken: null, linkTokenExpiration: null });
  },
}));

// Re-export types for convenience
export type {
  FinancialConnection,
  FinancialAccount,
  FinancialAccountsSummary,
  ListFinancialConnectionsParams,
  ListFinancialAccountsParams,
  CreateLinkTokenResponse,
  ConnectFinancialConnectionRequest,
  UpdateFinancialAccountRequest,
};
export type {
  FinancialConnectionStatus,
  FinancialConnectionProvider,
  FinancialAccountType,
  FinancialAccountSubtype,
  FinancialAccountStatus,
} from '../api/client';
