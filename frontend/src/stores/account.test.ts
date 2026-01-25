import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAccountStore } from './account'
import { act } from '@testing-library/react'

describe('useAccountStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAccountStore.setState({
      currentAccount: null,
      accounts: [],
      isLoading: false,
      error: null,
    })
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have null currentAccount initially', () => {
      const { currentAccount } = useAccountStore.getState()
      expect(currentAccount).toBeNull()
    })

    it('should have empty accounts array initially', () => {
      const { accounts } = useAccountStore.getState()
      expect(accounts).toEqual([])
    })

    it('should not be loading initially', () => {
      const { isLoading } = useAccountStore.getState()
      expect(isLoading).toBe(false)
    })
  })

  describe('setCurrentAccount', () => {
    it('should set the current account', () => {
      const account = {
        id: '1',
        name: 'Test Account',
        email: 'test@example.com',
        createdAt: '2024-01-01',
      }

      act(() => {
        useAccountStore.getState().setCurrentAccount(account)
      })

      const { currentAccount } = useAccountStore.getState()
      expect(currentAccount).toEqual(account)
    })

    it('should allow setting null', () => {
      const account = {
        id: '1',
        name: 'Test Account',
        email: 'test@example.com',
        createdAt: '2024-01-01',
      }

      act(() => {
        useAccountStore.getState().setCurrentAccount(account)
        useAccountStore.getState().setCurrentAccount(null)
      })

      const { currentAccount } = useAccountStore.getState()
      expect(currentAccount).toBeNull()
    })
  })

  describe('setAccounts', () => {
    it('should set the accounts list', () => {
      const accounts = [
        { id: '1', name: 'Account 1', email: 'a1@example.com', createdAt: '2024-01-01' },
        { id: '2', name: 'Account 2', email: 'a2@example.com', createdAt: '2024-01-02' },
      ]

      act(() => {
        useAccountStore.getState().setAccounts(accounts)
      })

      const state = useAccountStore.getState()
      expect(state.accounts).toEqual(accounts)
    })
  })

  describe('switchAccount', () => {
    it('should switch to an existing account', () => {
      const accounts = [
        { id: '1', name: 'Account 1', email: 'a1@example.com', createdAt: '2024-01-01' },
        { id: '2', name: 'Account 2', email: 'a2@example.com', createdAt: '2024-01-02' },
      ]

      act(() => {
        useAccountStore.getState().setAccounts(accounts)
        useAccountStore.getState().setCurrentAccount(accounts[0])
        useAccountStore.getState().switchAccount('2')
      })

      const { currentAccount } = useAccountStore.getState()
      expect(currentAccount?.id).toBe('2')
    })

    it('should not change account if id not found', () => {
      const accounts = [
        { id: '1', name: 'Account 1', email: 'a1@example.com', createdAt: '2024-01-01' },
      ]

      act(() => {
        useAccountStore.getState().setAccounts(accounts)
        useAccountStore.getState().setCurrentAccount(accounts[0])
        useAccountStore.getState().switchAccount('999')
      })

      const { currentAccount } = useAccountStore.getState()
      expect(currentAccount?.id).toBe('1')
    })
  })

  describe('fetchAccounts', () => {
    it('should fetch accounts from API', async () => {
      const mockAccounts = [
        { id: '1', name: 'Account 1', email: 'a1@example.com', createdAt: '2024-01-01' },
      ]

      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAccounts),
      }))

      await act(async () => {
        await useAccountStore.getState().fetchAccounts()
      })

      const state = useAccountStore.getState()
      expect(state.accounts).toEqual(mockAccounts)
      expect(state.currentAccount).toEqual(mockAccounts[0])
      expect(state.isLoading).toBe(false)
    })

    it('should handle fetch error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: false,
      }))

      await act(async () => {
        await useAccountStore.getState().fetchAccounts()
      })

      const state = useAccountStore.getState()
      expect(state.error).toBe('Failed to fetch accounts')
      expect(state.isLoading).toBe(false)
    })
  })

  describe('createAccount', () => {
    it('should create a new account', async () => {
      const newAccountData = { name: 'New Account', email: 'new@example.com' }
      const createdAccount = { id: '1', ...newAccountData, createdAt: '2024-01-01' }

      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createdAccount),
      }))

      let result
      await act(async () => {
        result = await useAccountStore.getState().createAccount(newAccountData)
      })

      expect(result).toEqual(createdAccount)
      const { accounts } = useAccountStore.getState()
      expect(accounts).toContainEqual(createdAccount)
    })

    it('should handle create error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: false,
      }))

      await act(async () => {
        await expect(
          useAccountStore.getState().createAccount({ name: 'Test', email: 'test@example.com' })
        ).rejects.toThrow('Failed to create account')
      })

      const { error } = useAccountStore.getState()
      expect(error).toBe('Failed to create account')
    })
  })
})
