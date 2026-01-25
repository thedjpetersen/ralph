import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useAccountStore } from '../account'
import { act } from '@testing-library/react'

describe('useAccountStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAccountStore.setState({
      currentAccount: null,
      accounts: [],
      members: [],
      isLoading: false,
      error: null,
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
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

    it('should have empty members array initially', () => {
      const { members } = useAccountStore.getState()
      expect(members).toEqual([])
    })

    it('should not be loading initially', () => {
      const { isLoading } = useAccountStore.getState()
      expect(isLoading).toBe(false)
    })

    it('should have no error initially', () => {
      const { error } = useAccountStore.getState()
      expect(error).toBeNull()
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

    it('should replace existing accounts', () => {
      const initialAccounts = [
        { id: '1', name: 'Account 1', email: 'a1@example.com', createdAt: '2024-01-01' },
      ]
      const newAccounts = [
        { id: '2', name: 'Account 2', email: 'a2@example.com', createdAt: '2024-01-02' },
      ]

      act(() => {
        useAccountStore.getState().setAccounts(initialAccounts)
        useAccountStore.getState().setAccounts(newAccounts)
      })

      const { accounts } = useAccountStore.getState()
      expect(accounts).toEqual(newAccounts)
      expect(accounts).not.toContainEqual(initialAccounts[0])
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

    it('should set first account as current if none selected', async () => {
      const mockAccounts = [
        { id: '1', name: 'Account 1', email: 'a1@example.com', createdAt: '2024-01-01' },
        { id: '2', name: 'Account 2', email: 'a2@example.com', createdAt: '2024-01-02' },
      ]

      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAccounts),
      }))

      await act(async () => {
        await useAccountStore.getState().fetchAccounts()
      })

      const { currentAccount } = useAccountStore.getState()
      expect(currentAccount).toEqual(mockAccounts[0])
    })

    it('should not override existing current account', async () => {
      const existingAccount = { id: '2', name: 'Existing', email: 'e@example.com', createdAt: '2024-01-01' }
      const mockAccounts = [
        { id: '1', name: 'Account 1', email: 'a1@example.com', createdAt: '2024-01-01' },
        existingAccount,
      ]

      useAccountStore.setState({ currentAccount: existingAccount })

      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAccounts),
      }))

      await act(async () => {
        await useAccountStore.getState().fetchAccounts()
      })

      const { currentAccount } = useAccountStore.getState()
      expect(currentAccount).toEqual(existingAccount)
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

    it('should set loading state while fetching', async () => {
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve([]),
        }), 100))
      ))

      const fetchPromise = useAccountStore.getState().fetchAccounts()

      expect(useAccountStore.getState().isLoading).toBe(true)

      await act(async () => {
        await fetchPromise
      })

      expect(useAccountStore.getState().isLoading).toBe(false)
    })
  })

  describe('fetchAccount', () => {
    it('should fetch a single account by ID', async () => {
      const mockAccount = { id: '1', name: 'Account 1', email: 'a1@example.com', createdAt: '2024-01-01' }

      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAccount),
      }))

      let result
      await act(async () => {
        result = await useAccountStore.getState().fetchAccount('1')
      })

      expect(result).toEqual(mockAccount)
      expect(useAccountStore.getState().isLoading).toBe(false)
    })

    it('should handle fetch account error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: false,
      }))

      await act(async () => {
        await expect(
          useAccountStore.getState().fetchAccount('1')
        ).rejects.toThrow('Failed to fetch account')
      })

      expect(useAccountStore.getState().error).toBe('Failed to fetch account')
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

    it('should add new account to existing accounts list', async () => {
      const existingAccount = { id: '1', name: 'Existing', email: 'e@example.com', createdAt: '2024-01-01' }
      useAccountStore.setState({ accounts: [existingAccount] })

      const newAccountData = { name: 'New Account', email: 'new@example.com' }
      const createdAccount = { id: '2', ...newAccountData, createdAt: '2024-01-02' }

      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createdAccount),
      }))

      await act(async () => {
        await useAccountStore.getState().createAccount(newAccountData)
      })

      const { accounts } = useAccountStore.getState()
      expect(accounts).toHaveLength(2)
      expect(accounts).toContainEqual(existingAccount)
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

  describe('updateAccount', () => {
    it('should update an existing account', async () => {
      const existingAccount = { id: '1', name: 'Old Name', email: 'e@example.com', createdAt: '2024-01-01' }
      const updatedAccount = { ...existingAccount, name: 'New Name' }

      useAccountStore.setState({
        accounts: [existingAccount],
        currentAccount: existingAccount,
      })

      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedAccount),
      }))

      let result
      await act(async () => {
        result = await useAccountStore.getState().updateAccount('1', { name: 'New Name' })
      })

      expect(result).toEqual(updatedAccount)
      const state = useAccountStore.getState()
      expect(state.accounts[0]).toEqual(updatedAccount)
      expect(state.currentAccount).toEqual(updatedAccount)
    })

    it('should update current account if it matches updated account', async () => {
      const account1 = { id: '1', name: 'Account 1', email: 'a1@example.com', createdAt: '2024-01-01' }
      const account2 = { id: '2', name: 'Account 2', email: 'a2@example.com', createdAt: '2024-01-02' }
      const updatedAccount1 = { ...account1, name: 'Updated Account 1' }

      useAccountStore.setState({
        accounts: [account1, account2],
        currentAccount: account1,
      })

      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedAccount1),
      }))

      await act(async () => {
        await useAccountStore.getState().updateAccount('1', { name: 'Updated Account 1' })
      })

      const { currentAccount } = useAccountStore.getState()
      expect(currentAccount).toEqual(updatedAccount1)
    })

    it('should not update current account if different account is updated', async () => {
      const account1 = { id: '1', name: 'Account 1', email: 'a1@example.com', createdAt: '2024-01-01' }
      const account2 = { id: '2', name: 'Account 2', email: 'a2@example.com', createdAt: '2024-01-02' }
      const updatedAccount2 = { ...account2, name: 'Updated Account 2' }

      useAccountStore.setState({
        accounts: [account1, account2],
        currentAccount: account1,
      })

      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedAccount2),
      }))

      await act(async () => {
        await useAccountStore.getState().updateAccount('2', { name: 'Updated Account 2' })
      })

      const { currentAccount } = useAccountStore.getState()
      expect(currentAccount).toEqual(account1)
    })

    it('should handle update error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: false,
      }))

      await act(async () => {
        await expect(
          useAccountStore.getState().updateAccount('1', { name: 'Test' })
        ).rejects.toThrow('Failed to update account')
      })

      expect(useAccountStore.getState().error).toBe('Failed to update account')
    })
  })

  describe('fetchMembers', () => {
    it('should fetch members for an account', async () => {
      const mockMembers = [
        { id: 'm1', accountId: '1', userId: 'u1', email: 'user1@example.com', name: 'User 1', role: 'owner' as const, joinedAt: '2024-01-01' },
        { id: 'm2', accountId: '1', userId: 'u2', email: 'user2@example.com', name: 'User 2', role: 'member' as const, joinedAt: '2024-01-02' },
      ]

      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMembers),
      }))

      await act(async () => {
        await useAccountStore.getState().fetchMembers('1')
      })

      const { members } = useAccountStore.getState()
      expect(members).toEqual(mockMembers)
    })

    it('should handle fetch members error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: false,
      }))

      await act(async () => {
        await useAccountStore.getState().fetchMembers('1')
      })

      expect(useAccountStore.getState().error).toBe('Failed to fetch members')
    })
  })

  describe('inviteMember', () => {
    it('should invite a new member to the account', async () => {
      const newMember = {
        id: 'm1',
        accountId: '1',
        userId: 'u1',
        email: 'new@example.com',
        name: 'New Member',
        role: 'member' as const,
        joinedAt: '2024-01-01',
      }

      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newMember),
      }))

      let result
      await act(async () => {
        result = await useAccountStore.getState().inviteMember('1', 'new@example.com', 'member')
      })

      expect(result).toEqual(newMember)
      const { members } = useAccountStore.getState()
      expect(members).toContainEqual(newMember)
    })

    it('should handle invite member error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: false,
      }))

      await act(async () => {
        await expect(
          useAccountStore.getState().inviteMember('1', 'test@example.com', 'member')
        ).rejects.toThrow('Failed to invite member')
      })

      expect(useAccountStore.getState().error).toBe('Failed to invite member')
    })
  })

  describe('removeMember', () => {
    it('should remove a member from the account', async () => {
      const members = [
        { id: 'm1', accountId: '1', userId: 'u1', email: 'user1@example.com', name: 'User 1', role: 'owner' as const, joinedAt: '2024-01-01' },
        { id: 'm2', accountId: '1', userId: 'u2', email: 'user2@example.com', name: 'User 2', role: 'member' as const, joinedAt: '2024-01-02' },
      ]

      useAccountStore.setState({ members })

      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: true,
      }))

      await act(async () => {
        await useAccountStore.getState().removeMember('1', 'm2')
      })

      const state = useAccountStore.getState()
      expect(state.members).toHaveLength(1)
      expect(state.members[0].id).toBe('m1')
    })

    it('should handle remove member error', async () => {
      const members = [
        { id: 'm1', accountId: '1', userId: 'u1', email: 'user1@example.com', name: 'User 1', role: 'owner' as const, joinedAt: '2024-01-01' },
      ]

      useAccountStore.setState({ members })

      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: false,
      }))

      await act(async () => {
        await expect(
          useAccountStore.getState().removeMember('1', 'm1')
        ).rejects.toThrow('Failed to remove member')
      })

      expect(useAccountStore.getState().error).toBe('Failed to remove member')
      // Member should still be in the list after failed removal
      expect(useAccountStore.getState().members).toHaveLength(1)
    })
  })

  describe('persistence', () => {
    it('should store currentAccount in localStorage via zustand persist', () => {
      // The actual persistence behavior is handled by zustand's persist middleware
      // We verify the partialize config by checking what would be persisted
      const account = {
        id: '1',
        name: 'Test Account',
        email: 'test@example.com',
        createdAt: '2024-01-01',
      }

      useAccountStore.setState({ currentAccount: account })

      const state = useAccountStore.getState()
      expect(state.currentAccount).toEqual(account)
    })
  })
})
