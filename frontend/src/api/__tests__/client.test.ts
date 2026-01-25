import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  storesApi,
  productsApi,
  brandsApi,
  categoriesApi,
  financialConnectionsApi,
  transactionsApi,
  type Store,
  type Product,
  type Brand,
  type Category,
  type FinancialConnection,
  type Transaction,
} from '../client'

// Mock fetch globally
const mockFetch = vi.fn()

describe('API Client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // Helper to create mock response
  const createMockResponse = (data: unknown, ok = true, status = 200) => ({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  })

  describe('storesApi', () => {
    const mockStore: Store = {
      id: '1',
      name: 'Test Store',
      normalized_name: 'test_store',
      type: 'retail',
      status: 'active',
      match_count: 0,
      merge_count: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    describe('list', () => {
      it('should fetch stores without params', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockResponse({ stores: [mockStore], total: 1 })
        )

        const result = await storesApi.list()

        expect(mockFetch).toHaveBeenCalledWith('/api/admin/stores')
        expect(result).toEqual({ stores: [mockStore], total: 1 })
      })

      it('should fetch stores with filter params', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockResponse({ stores: [mockStore], total: 1 })
        )

        await storesApi.list({ status: 'active', type: 'retail' })

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/stores?status=active&type=retail'
        )
      })

      it('should throw error on failed fetch', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 500))

        await expect(storesApi.list()).rejects.toThrow('Failed to fetch stores')
      })
    })

    describe('get', () => {
      it('should fetch a single store', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse(mockStore))

        const result = await storesApi.get('1')

        expect(mockFetch).toHaveBeenCalledWith('/api/admin/stores/1')
        expect(result).toEqual(mockStore)
      })

      it('should throw error on failed fetch', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 404))

        await expect(storesApi.get('nonexistent')).rejects.toThrow(
          'Failed to fetch store'
        )
      })
    })

    describe('create', () => {
      it('should create a new store', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse(mockStore))

        const result = await storesApi.create({
          name: 'Test Store',
          type: 'retail',
        })

        expect(mockFetch).toHaveBeenCalledWith('/api/admin/stores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Test Store', type: 'retail' }),
        })
        expect(result).toEqual(mockStore)
      })

      it('should throw error on failed create', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 400))

        await expect(
          storesApi.create({ name: 'Test', type: 'retail' })
        ).rejects.toThrow('Failed to create store')
      })
    })

    describe('update', () => {
      it('should update an existing store', async () => {
        const updatedStore = { ...mockStore, name: 'Updated Store' }
        mockFetch.mockResolvedValueOnce(createMockResponse(updatedStore))

        const result = await storesApi.update('1', { name: 'Updated Store' })

        expect(mockFetch).toHaveBeenCalledWith('/api/admin/stores/1', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Updated Store' }),
        })
        expect(result).toEqual(updatedStore)
      })

      it('should throw error on failed update', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 400))

        await expect(
          storesApi.update('1', { name: 'Updated' })
        ).rejects.toThrow('Failed to update store')
      })
    })

    describe('delete', () => {
      it('should delete a store', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse({}, true, 204))

        await storesApi.delete('1')

        expect(mockFetch).toHaveBeenCalledWith('/api/admin/stores/1', {
          method: 'DELETE',
        })
      })

      it('should throw error on failed delete', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 500))

        await expect(storesApi.delete('1')).rejects.toThrow(
          'Failed to delete store'
        )
      })
    })

    describe('search', () => {
      it('should search stores', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockResponse({ stores: [mockStore], total: 1 })
        )

        const result = await storesApi.search({ query: 'test', limit: 10 })

        expect(mockFetch).toHaveBeenCalledWith('/api/admin/stores/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'test', limit: 10 }),
        })
        expect(result).toEqual({ stores: [mockStore], total: 1 })
      })

      it('should throw error on failed search', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 500))

        await expect(storesApi.search({ query: 'test' })).rejects.toThrow(
          'Failed to search stores'
        )
      })
    })

    describe('match', () => {
      it('should match stores using search with default limit', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockResponse({ stores: [mockStore], total: 1 })
        )

        const result = await storesApi.match('test')

        expect(mockFetch).toHaveBeenCalledWith('/api/admin/stores/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'test', limit: 10 }),
        })
        expect(result).toEqual({ stores: [mockStore], total: 1 })
      })
    })
  })

  describe('productsApi', () => {
    const mockProduct: Product = {
      id: '1',
      name: 'Test Product',
      normalized_name: 'test_product',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    describe('list', () => {
      it('should fetch products without params', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockResponse({ products: [mockProduct], total: 1 })
        )

        const result = await productsApi.list()

        expect(mockFetch).toHaveBeenCalledWith('/api/admin/products')
        expect(result).toEqual({ products: [mockProduct], total: 1 })
      })

      it('should fetch products with filter params', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockResponse({ products: [], total: 0 })
        )

        await productsApi.list({ status: 'active', limit: 20, offset: 10 })

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/products?status=active&limit=20&offset=10'
        )
      })

      it('should throw error on failed fetch', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 500))

        await expect(productsApi.list()).rejects.toThrow(
          'Failed to fetch products'
        )
      })
    })

    describe('get', () => {
      it('should fetch a single product', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse(mockProduct))

        const result = await productsApi.get('1')

        expect(mockFetch).toHaveBeenCalledWith('/api/admin/products/1')
        expect(result).toEqual(mockProduct)
      })

      it('should throw error on not found', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 404))

        await expect(productsApi.get('nonexistent')).rejects.toThrow(
          'Failed to fetch product'
        )
      })
    })

    describe('create', () => {
      it('should create a new product', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse(mockProduct))

        const result = await productsApi.create({ name: 'Test Product' })

        expect(mockFetch).toHaveBeenCalledWith('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Test Product' }),
        })
        expect(result).toEqual(mockProduct)
      })
    })

    describe('update', () => {
      it('should update an existing product', async () => {
        const updatedProduct = { ...mockProduct, name: 'Updated Product' }
        mockFetch.mockResolvedValueOnce(createMockResponse(updatedProduct))

        const result = await productsApi.update('1', { name: 'Updated Product' })

        expect(mockFetch).toHaveBeenCalledWith('/api/admin/products/1', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Updated Product' }),
        })
        expect(result).toEqual(updatedProduct)
      })
    })

    describe('delete', () => {
      it('should delete a product', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse({}, true, 204))

        await productsApi.delete('1')

        expect(mockFetch).toHaveBeenCalledWith('/api/admin/products/1', {
          method: 'DELETE',
        })
      })
    })
  })

  describe('brandsApi', () => {
    const mockBrand: Brand = {
      id: '1',
      name: 'Test Brand',
      normalized_name: 'test_brand',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    describe('list', () => {
      it('should fetch brands', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockResponse({ brands: [mockBrand], total: 1 })
        )

        const result = await brandsApi.list()

        expect(mockFetch).toHaveBeenCalledWith('/api/admin/brands')
        expect(result).toEqual({ brands: [mockBrand], total: 1 })
      })
    })

    describe('get', () => {
      it('should fetch a single brand', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse(mockBrand))

        const result = await brandsApi.get('1')

        expect(mockFetch).toHaveBeenCalledWith('/api/admin/brands/1')
        expect(result).toEqual(mockBrand)
      })
    })

    describe('create', () => {
      it('should create a new brand', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse(mockBrand))

        const result = await brandsApi.create({ name: 'Test Brand' })

        expect(mockFetch).toHaveBeenCalledWith('/api/admin/brands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Test Brand' }),
        })
        expect(result).toEqual(mockBrand)
      })
    })
  })

  describe('categoriesApi', () => {
    const mockCategory: Category = {
      id: '1',
      name: 'Test Category',
      normalized_name: 'test_category',
      type: 'expense',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    describe('list', () => {
      it('should fetch categories', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockResponse({ categories: [mockCategory], total: 1 })
        )

        const result = await categoriesApi.list()

        expect(mockFetch).toHaveBeenCalledWith('/api/admin/categories')
        expect(result).toEqual({ categories: [mockCategory], total: 1 })
      })
    })

    describe('get', () => {
      it('should fetch a single category', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse(mockCategory))

        const result = await categoriesApi.get('1')

        expect(mockFetch).toHaveBeenCalledWith('/api/admin/categories/1')
        expect(result).toEqual(mockCategory)
      })
    })
  })

  describe('financialConnectionsApi', () => {
    const mockConnection: FinancialConnection = {
      id: '1',
      account_id: 'acc_1',
      provider: 'plaid',
      institution_id: 'ins_1',
      institution_name: 'Test Bank',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    describe('list', () => {
      it('should fetch financial connections for an account', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockResponse({ connections: [mockConnection], total: 1 })
        )

        const result = await financialConnectionsApi.list('acc_1')

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/accounts/acc_1/connections'
        )
        expect(result).toEqual({ connections: [mockConnection], total: 1 })
      })

      it('should fetch connections with status filter', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockResponse({ connections: [], total: 0 })
        )

        await financialConnectionsApi.list('acc_1', { status: 'active' })

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/accounts/acc_1/connections?status=active'
        )
      })

      it('should throw error on failed fetch', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 500))

        await expect(financialConnectionsApi.list('acc_1')).rejects.toThrow(
          'Failed to fetch financial connections'
        )
      })
    })

    describe('get', () => {
      it('should fetch a single connection', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse(mockConnection))

        const result = await financialConnectionsApi.get('acc_1', '1')

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/accounts/acc_1/connections/1'
        )
        expect(result).toEqual(mockConnection)
      })
    })

    describe('createLinkToken', () => {
      it('should create a link token for Plaid connection', async () => {
        const mockLinkToken = { link_token: 'link-test-token', expiration: '2024-01-02T00:00:00Z' }
        mockFetch.mockResolvedValueOnce(createMockResponse(mockLinkToken))

        const result = await financialConnectionsApi.createLinkToken('acc_1')

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/accounts/acc_1/connections/link-token',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          }
        )
        expect(result).toEqual(mockLinkToken)
      })

      it('should create a link token with request data', async () => {
        const mockLinkToken = { link_token: 'link-test-token', expiration: '2024-01-02T00:00:00Z' }
        mockFetch.mockResolvedValueOnce(createMockResponse(mockLinkToken))

        const requestData = { provider: 'plaid' as const, products: ['transactions'] }
        const result = await financialConnectionsApi.createLinkToken('acc_1', requestData)

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/accounts/acc_1/connections/link-token',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData),
          }
        )
        expect(result).toEqual(mockLinkToken)
      })

      it('should throw error on failed link token creation', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 500))

        await expect(
          financialConnectionsApi.createLinkToken('acc_1')
        ).rejects.toThrow('Failed to create link token')
      })
    })

    describe('connect', () => {
      it('should connect a financial account with public token', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse(mockConnection))

        const result = await financialConnectionsApi.connect('acc_1', {
          provider: 'plaid',
          public_token: 'public-test-token',
          institution_id: 'ins_1',
        })

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/accounts/acc_1/connections',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: 'plaid',
              public_token: 'public-test-token',
              institution_id: 'ins_1',
            }),
          }
        )
        expect(result).toEqual(mockConnection)
      })

      it('should throw error on failed connect', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 500))

        await expect(
          financialConnectionsApi.connect('acc_1', {
            provider: 'plaid',
            public_token: 'public-token',
          })
        ).rejects.toThrow('Failed to connect financial connection')
      })
    })

    describe('refresh', () => {
      it('should refresh a financial connection', async () => {
        const refreshedConnection = {
          ...mockConnection,
          updated_at: '2024-01-02T00:00:00Z',
        }
        mockFetch.mockResolvedValueOnce(createMockResponse(refreshedConnection))

        const result = await financialConnectionsApi.refresh('acc_1', '1')

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/accounts/acc_1/connections/1/refresh',
          { method: 'POST' }
        )
        expect(result).toEqual(refreshedConnection)
      })

      it('should throw error on failed refresh', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 500))

        await expect(
          financialConnectionsApi.refresh('acc_1', '1')
        ).rejects.toThrow('Failed to refresh financial connection')
      })
    })

    describe('disconnect', () => {
      it('should disconnect a financial connection', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse({}, true, 204))

        await financialConnectionsApi.disconnect('acc_1', '1')

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/accounts/acc_1/connections/1',
          { method: 'DELETE' }
        )
      })

      it('should throw error on failed disconnect', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 500))

        await expect(
          financialConnectionsApi.disconnect('acc_1', '1')
        ).rejects.toThrow('Failed to disconnect financial connection')
      })
    })
  })

  describe('transactionsApi', () => {
    const mockTransaction: Transaction = {
      id: '1',
      account_id: 'acc_1',
      store_id: 'store_1',
      total: 100,
      currency: 'USD',
      date: '2024-01-01',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    describe('list', () => {
      it('should fetch transactions for an account', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockResponse({ transactions: [mockTransaction], total: 1 })
        )

        const result = await transactionsApi.list('acc_1')

        expect(mockFetch).toHaveBeenCalledWith('/api/accounts/acc_1/transactions')
        expect(result).toEqual({ transactions: [mockTransaction], total: 1 })
      })

      it('should fetch transactions with filters', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockResponse({ transactions: [], total: 0 })
        )

        await transactionsApi.list('acc_1', {
          status: 'completed',
          limit: 50,
          offset: 10,
        })

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/accounts/acc_1/transactions?status=completed&limit=50&offset=10'
        )
      })

      it('should handle date range filters', async () => {
        mockFetch.mockResolvedValueOnce(
          createMockResponse({ transactions: [], total: 0 })
        )

        await transactionsApi.list('acc_1', {
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        })

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/accounts/acc_1/transactions?start_date=2024-01-01&end_date=2024-01-31'
        )
      })
    })

    describe('get', () => {
      it('should fetch a single transaction', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse(mockTransaction))

        const result = await transactionsApi.get('acc_1', '1')

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/accounts/acc_1/transactions/1'
        )
        expect(result).toEqual(mockTransaction)
      })

      it('should throw error on not found', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 404))

        await expect(transactionsApi.get('acc_1', 'nonexistent')).rejects.toThrow(
          'Failed to fetch transaction'
        )
      })
    })

    describe('create', () => {
      it('should create a new transaction', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse(mockTransaction))

        const result = await transactionsApi.create('acc_1', {
          store_id: 'store_1',
          total: 100,
          currency: 'USD',
          date: '2024-01-01',
        })

        expect(mockFetch).toHaveBeenCalledWith('/api/accounts/acc_1/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: 'store_1',
            total: 100,
            currency: 'USD',
            date: '2024-01-01',
          }),
        })
        expect(result).toEqual(mockTransaction)
      })
    })

    describe('update', () => {
      it('should update an existing transaction', async () => {
        const updatedTransaction = { ...mockTransaction, total: 150 }
        mockFetch.mockResolvedValueOnce(createMockResponse(updatedTransaction))

        const result = await transactionsApi.update('acc_1', '1', { total: 150 })

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/accounts/acc_1/transactions/1',
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ total: 150 }),
          }
        )
        expect(result).toEqual(updatedTransaction)
      })
    })

    describe('delete', () => {
      it('should delete a transaction', async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse({}, true, 204))

        await transactionsApi.delete('acc_1', '1')

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/accounts/acc_1/transactions/1',
          { method: 'DELETE' }
        )
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(storesApi.list()).rejects.toThrow('Network error')
    })

    it('should handle JSON parse errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(storesApi.list()).rejects.toThrow('Invalid JSON')
    })

    it('should handle 401 unauthorized errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 401))

      await expect(storesApi.list()).rejects.toThrow('Failed to fetch stores')
    })

    it('should handle 403 forbidden errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 403))

      await expect(storesApi.list()).rejects.toThrow('Failed to fetch stores')
    })

    it('should handle 500 server errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, false, 500))

      await expect(storesApi.list()).rejects.toThrow('Failed to fetch stores')
    })

    it('should handle timeout-like scenarios', async () => {
      mockFetch.mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10))
      )

      await expect(storesApi.list()).rejects.toThrow('Timeout')
    })
  })

  describe('Request Configuration', () => {
    it('should use correct base URL', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ stores: [], total: 0 }))

      await storesApi.list()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/^\/api\//)
      )
    })

    it('should set correct Content-Type header for POST requests', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await storesApi.create({ name: 'Test', type: 'retail' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    it('should set correct Content-Type header for PATCH requests', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await storesApi.update('1', { name: 'Updated' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    it('should not set Content-Type for DELETE requests', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, true, 204))

      await storesApi.delete('1')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'DELETE',
        })
      )
      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.any(Object),
        })
      )
    })

    it('should stringify body data correctly', async () => {
      const testData = {
        name: 'Test',
        type: 'retail' as const,
        tags: ['tag1', 'tag2'],
        metadata: { key: 'value' },
      }
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await storesApi.create(testData)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(testData),
        })
      )
    })
  })

  describe('Query Parameters', () => {
    it('should build query string with single param', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ stores: [], total: 0 }))

      await storesApi.list({ status: 'active' })

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/stores?status=active')
    })

    it('should build query string with multiple params', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ stores: [], total: 0 }))

      await storesApi.list({ status: 'active', type: 'retail', category_id: 'cat_1' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/stores?status=active&type=retail&category_id=cat_1'
      )
    })

    it('should omit undefined params', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ stores: [], total: 0 }))

      await storesApi.list({ status: 'active', type: undefined })

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/stores?status=active')
    })

    it('should convert numeric params to strings', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ products: [], total: 0 }))

      await productsApi.list({ limit: 10, offset: 20 })

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/products?limit=10&offset=20')
    })
  })
})
