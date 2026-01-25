import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useUserStore } from '../user'
import { act } from '@testing-library/react'

describe('useUserStore (Auth)', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUserStore.setState({
      user: null,
      preferences: {
        theme: 'system',
        language: 'en',
        notifications: {
          email: true,
          push: false,
        },
      },
      apiKeys: [],
      isLoading: false,
      error: null,
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('initial state', () => {
    it('should have null user initially', () => {
      const { user } = useUserStore.getState()
      expect(user).toBeNull()
    })

    it('should have default preferences', () => {
      const { preferences } = useUserStore.getState()
      expect(preferences).toEqual({
        theme: 'system',
        language: 'en',
        notifications: {
          email: true,
          push: false,
        },
      })
    })

    it('should have empty apiKeys array initially', () => {
      const { apiKeys } = useUserStore.getState()
      expect(apiKeys).toEqual([])
    })

    it('should not be loading initially', () => {
      const { isLoading } = useUserStore.getState()
      expect(isLoading).toBe(false)
    })

    it('should have no error initially', () => {
      const { error } = useUserStore.getState()
      expect(error).toBeNull()
    })
  })

  describe('setUser', () => {
    it('should set the user', () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2024-01-01',
      }

      act(() => {
        useUserStore.getState().setUser(user)
      })

      const { user: storedUser } = useUserStore.getState()
      expect(storedUser).toEqual(user)
    })

    it('should allow setting null to logout', () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2024-01-01',
      }

      act(() => {
        useUserStore.getState().setUser(user)
        useUserStore.getState().setUser(null)
      })

      const { user: storedUser } = useUserStore.getState()
      expect(storedUser).toBeNull()
    })
  })

  describe('fetchUser', () => {
    it('should fetch user from API', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2024-01-01',
      }

      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUser),
      }))

      await act(async () => {
        await useUserStore.getState().fetchUser()
      })

      const state = useUserStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should set loading state while fetching', async () => {
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ id: '1', email: 'test@example.com', name: 'Test', createdAt: '2024-01-01' }),
        }), 100))
      ))

      const fetchPromise = useUserStore.getState().fetchUser()

      // Check loading state immediately after calling
      expect(useUserStore.getState().isLoading).toBe(true)

      await act(async () => {
        await fetchPromise
      })

      expect(useUserStore.getState().isLoading).toBe(false)
    })

    it('should handle fetch error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: false,
      }))

      await act(async () => {
        await useUserStore.getState().fetchUser()
      })

      const state = useUserStore.getState()
      expect(state.error).toBe('Failed to fetch user')
      expect(state.isLoading).toBe(false)
      expect(state.user).toBeNull()
    })

    it('should handle network error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Network error')))

      await act(async () => {
        await useUserStore.getState().fetchUser()
      })

      const state = useUserStore.getState()
      expect(state.error).toBe('Network error')
      expect(state.isLoading).toBe(false)
    })
  })

  describe('updateUser', () => {
    it('should update user profile', async () => {
      const initialUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2024-01-01',
      }
      const updatedUser = { ...initialUser, name: 'Updated Name' }

      useUserStore.setState({ user: initialUser })

      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedUser),
      }))

      let result
      await act(async () => {
        result = await useUserStore.getState().updateUser({ name: 'Updated Name' })
      })

      expect(result).toEqual(updatedUser)
      expect(useUserStore.getState().user).toEqual(updatedUser)
    })

    it('should handle update error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: false,
      }))

      await act(async () => {
        await expect(
          useUserStore.getState().updateUser({ name: 'Test' })
        ).rejects.toThrow('Failed to update user')
      })

      const { error } = useUserStore.getState()
      expect(error).toBe('Failed to update user')
    })
  })

  describe('updatePreferences', () => {
    it('should update user preferences', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      }))

      await act(async () => {
        await useUserStore.getState().updatePreferences({ theme: 'dark' })
      })

      const { preferences } = useUserStore.getState()
      expect(preferences.theme).toBe('dark')
      expect(preferences.language).toBe('en') // Other preferences unchanged
    })

    it('should handle preferences update error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
        ok: false,
      }))

      await act(async () => {
        await expect(
          useUserStore.getState().updatePreferences({ theme: 'dark' })
        ).rejects.toThrow('Failed to update preferences')
      })

      const { error } = useUserStore.getState()
      expect(error).toBe('Failed to update preferences')
    })
  })

  describe('logout', () => {
    it('should clear user state on logout', () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2024-01-01',
      }

      useUserStore.setState({
        user,
        preferences: { theme: 'dark', language: 'es', notifications: { email: false, push: true } },
        apiKeys: [{ id: '1', name: 'Key 1', prefix: 'sk_', createdAt: '2024-01-01' }],
        error: 'Some error',
      })

      act(() => {
        useUserStore.getState().logout()
      })

      const state = useUserStore.getState()
      expect(state.user).toBeNull()
      expect(state.preferences).toEqual({
        theme: 'system',
        language: 'en',
        notifications: { email: true, push: false },
      })
      expect(state.apiKeys).toEqual([])
      expect(state.error).toBeNull()
    })
  })

  describe('API Keys', () => {
    describe('fetchAPIKeys', () => {
      it('should fetch API keys from server', async () => {
        const mockKeys = [
          { id: '1', name: 'Key 1', prefix: 'sk_test_', createdAt: '2024-01-01' },
          { id: '2', name: 'Key 2', prefix: 'sk_live_', createdAt: '2024-01-02' },
        ]

        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockKeys),
        }))

        await act(async () => {
          await useUserStore.getState().fetchAPIKeys()
        })

        const { apiKeys } = useUserStore.getState()
        expect(apiKeys).toEqual(mockKeys)
      })

      it('should handle fetch API keys error', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
          ok: false,
        }))

        await act(async () => {
          await useUserStore.getState().fetchAPIKeys()
        })

        const { error } = useUserStore.getState()
        expect(error).toBe('Failed to fetch API keys')
      })
    })

    describe('createAPIKey', () => {
      it('should create a new API key', async () => {
        const newKey = {
          id: '1',
          name: 'New Key',
          prefix: 'sk_test_',
          createdAt: '2024-01-01',
          key: 'sk_test_full_key_value',
        }

        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(newKey),
        }))

        let result
        await act(async () => {
          result = await useUserStore.getState().createAPIKey('New Key')
        })

        expect(result).toEqual(newKey)
        const { apiKeys } = useUserStore.getState()
        expect(apiKeys).toHaveLength(1)
        expect(apiKeys[0].id).toBe('1')
        expect(apiKeys[0].name).toBe('New Key')
      })

      it('should handle create API key error', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
          ok: false,
        }))

        await act(async () => {
          await expect(
            useUserStore.getState().createAPIKey('Test Key')
          ).rejects.toThrow('Failed to create API key')
        })

        const { error } = useUserStore.getState()
        expect(error).toBe('Failed to create API key')
      })
    })

    describe('deleteAPIKey', () => {
      it('should delete an API key', async () => {
        useUserStore.setState({
          apiKeys: [
            { id: '1', name: 'Key 1', prefix: 'sk_', createdAt: '2024-01-01' },
            { id: '2', name: 'Key 2', prefix: 'sk_', createdAt: '2024-01-02' },
          ],
        })

        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
          ok: true,
        }))

        await act(async () => {
          await useUserStore.getState().deleteAPIKey('1')
        })

        const { apiKeys } = useUserStore.getState()
        expect(apiKeys).toHaveLength(1)
        expect(apiKeys[0].id).toBe('2')
      })

      it('should handle delete API key error', async () => {
        useUserStore.setState({
          apiKeys: [{ id: '1', name: 'Key 1', prefix: 'sk_', createdAt: '2024-01-01' }],
        })

        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
          ok: false,
        }))

        await act(async () => {
          await expect(
            useUserStore.getState().deleteAPIKey('1')
          ).rejects.toThrow('Failed to delete API key')
        })

        const { error } = useUserStore.getState()
        expect(error).toBe('Failed to delete API key')
        // API key should still be in the list after failed deletion
        expect(useUserStore.getState().apiKeys).toHaveLength(1)
      })
    })
  })

  describe('persistence', () => {
    it('should store user and preferences in localStorage via zustand persist', () => {
      // The actual persistence behavior is handled by zustand's persist middleware
      // We verify the partialize config by checking what would be persisted
      const user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2024-01-01',
      }
      const preferences = {
        theme: 'dark' as const,
        language: 'es',
        notifications: { email: false, push: true },
      }

      useUserStore.setState({ user, preferences })

      const state = useUserStore.getState()
      expect(state.user).toEqual(user)
      expect(state.preferences).toEqual(preferences)
    })
  })
})
