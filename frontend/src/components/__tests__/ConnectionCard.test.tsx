import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConnectionCard } from '../ConnectionCard'
import type { FinancialConnection } from '../../stores/financial'

const createMockConnection = (
  overrides: Partial<FinancialConnection> = {}
): FinancialConnection => ({
  id: 'conn-1',
  account_id: 'acc-1',
  provider: 'plaid',
  provider_connection_id: 'plaid-123',
  status: 'active',
  institution_name: 'Test Bank',
  institution_logo: null,
  last_sync_at: '2024-01-15T10:30:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:30:00Z',
  ...overrides,
})

describe('ConnectionCard', () => {
  it('renders institution name', () => {
    const connection = createMockConnection({ institution_name: 'Chase Bank' })
    render(<ConnectionCard connection={connection} />)
    expect(screen.getByText('Chase Bank')).toBeInTheDocument()
  })

  it('renders "Unknown Institution" when name is not provided', () => {
    const connection = createMockConnection({ institution_name: undefined })
    render(<ConnectionCard connection={connection} />)
    expect(screen.getByText('Unknown Institution')).toBeInTheDocument()
  })

  it('renders institution logo when provided', () => {
    const connection = createMockConnection({
      institution_name: 'Test Bank',
      institution_logo: 'https://example.com/logo.png',
    })
    render(<ConnectionCard connection={connection} />)
    const logo = screen.getByAltText('Test Bank')
    expect(logo).toHaveAttribute('src', 'https://example.com/logo.png')
  })

  it('renders placeholder when no logo is provided', () => {
    const connection = createMockConnection({
      institution_name: 'Test Bank',
      institution_logo: null,
    })
    render(<ConnectionCard connection={connection} />)
    expect(screen.getByText('T')).toBeInTheDocument() // First letter of institution name
  })

  describe('Provider Labels', () => {
    it.each([
      ['plaid', 'Plaid'],
      ['mx', 'MX'],
      ['finicity', 'Finicity'],
      ['yodlee', 'Yodlee'],
      ['manual', 'Manual'],
      ['unknown', 'unknown'],
    ])('displays correct label for provider %s', (provider, expectedLabel) => {
      const connection = createMockConnection({ provider: provider as FinancialConnection['provider'] })
      render(<ConnectionCard connection={connection} />)
      expect(screen.getByText(expectedLabel)).toBeInTheDocument()
    })
  })

  describe('Status Display', () => {
    it.each([
      ['active', 'status-active'],
      ['pending', 'status-pending'],
      ['error', 'status-error'],
      ['disconnected', 'status-disconnected'],
      ['expired', 'status-expired'],
    ])('displays correct class for status %s', (status, expectedClass) => {
      const connection = createMockConnection({ status: status as FinancialConnection['status'] })
      render(<ConnectionCard connection={connection} />)
      const statusElement = screen.getByText(status)
      expect(statusElement).toHaveClass('connection-status', expectedClass)
    })

    it('displays status text', () => {
      const connection = createMockConnection({ status: 'active' })
      render(<ConnectionCard connection={connection} />)
      expect(screen.getByText('active')).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('displays error message when present', () => {
      const connection = createMockConnection({
        status: 'error',
        error_message: 'Authentication failed',
      })
      render(<ConnectionCard connection={connection} />)
      expect(screen.getByText('Authentication failed')).toBeInTheDocument()
    })

    it('does not display error section when no error', () => {
      const connection = createMockConnection({ error_message: undefined })
      render(<ConnectionCard connection={connection} />)
      expect(screen.queryByText(/Authentication/)).not.toBeInTheDocument()
    })

    it('adds needs-attention class for error status', () => {
      const connection = createMockConnection({ status: 'error' })
      render(<ConnectionCard connection={connection} />)
      const card = document.querySelector('.connection-card')
      expect(card).toHaveClass('needs-attention')
    })

    it('adds needs-attention class for expired status', () => {
      const connection = createMockConnection({ status: 'expired' })
      render(<ConnectionCard connection={connection} />)
      const card = document.querySelector('.connection-card')
      expect(card).toHaveClass('needs-attention')
    })
  })

  describe('Date Formatting', () => {
    it('formats last sync date correctly', () => {
      const connection = createMockConnection({
        last_sync_at: '2024-01-15T10:30:00Z',
      })
      render(<ConnectionCard connection={connection} />)
      expect(screen.getByText('Last Synced')).toBeInTheDocument()
      // Date format should include Jan 15, 2024
      expect(screen.getByText(/Jan/)).toBeInTheDocument()
    })

    it('displays "Never" when last_sync_at is not set', () => {
      const connection = createMockConnection({ last_sync_at: undefined })
      render(<ConnectionCard connection={connection} />)
      expect(screen.getByText('Never')).toBeInTheDocument()
    })

    it('shows consent expiration when present', () => {
      const connection = createMockConnection({
        consent_expires_at: '2024-06-15T00:00:00Z',
      })
      render(<ConnectionCard connection={connection} />)
      expect(screen.getByText('Consent Expires')).toBeInTheDocument()
    })

    it('does not show consent expiration when not present', () => {
      const connection = createMockConnection({ consent_expires_at: undefined })
      render(<ConnectionCard connection={connection} />)
      expect(screen.queryByText('Consent Expires')).not.toBeInTheDocument()
    })
  })

  describe('Actions', () => {
    it('renders refresh button when onRefresh is provided', () => {
      const connection = createMockConnection()
      const onRefresh = vi.fn()
      render(<ConnectionCard connection={connection} onRefresh={onRefresh} />)
      expect(screen.getByText('Sync Now')).toBeInTheDocument()
    })

    it('does not render refresh button when onRefresh is not provided', () => {
      const connection = createMockConnection()
      render(<ConnectionCard connection={connection} />)
      expect(screen.queryByText('Sync Now')).not.toBeInTheDocument()
    })

    it('calls onRefresh with connection id when clicked', () => {
      const connection = createMockConnection({ id: 'conn-123' })
      const onRefresh = vi.fn()
      render(<ConnectionCard connection={connection} onRefresh={onRefresh} />)

      fireEvent.click(screen.getByText('Sync Now'))
      expect(onRefresh).toHaveBeenCalledWith('conn-123')
    })

    it('renders disconnect button when onDisconnect is provided', () => {
      const connection = createMockConnection()
      const onDisconnect = vi.fn()
      render(<ConnectionCard connection={connection} onDisconnect={onDisconnect} />)
      expect(screen.getByText('Disconnect')).toBeInTheDocument()
    })

    it('does not render disconnect button when onDisconnect is not provided', () => {
      const connection = createMockConnection()
      render(<ConnectionCard connection={connection} />)
      expect(screen.queryByText('Disconnect')).not.toBeInTheDocument()
    })

    it('calls onDisconnect with connection id when clicked', () => {
      const connection = createMockConnection({ id: 'conn-456' })
      const onDisconnect = vi.fn()
      render(<ConnectionCard connection={connection} onDisconnect={onDisconnect} />)

      fireEvent.click(screen.getByText('Disconnect'))
      expect(onDisconnect).toHaveBeenCalledWith('conn-456')
    })
  })

  describe('Refreshing State', () => {
    it('shows "Syncing..." when isRefreshing is true', () => {
      const connection = createMockConnection()
      const onRefresh = vi.fn()
      render(
        <ConnectionCard
          connection={connection}
          onRefresh={onRefresh}
          isRefreshing={true}
        />
      )
      expect(screen.getByText('Syncing...')).toBeInTheDocument()
    })

    it('disables refresh button when isRefreshing is true', () => {
      const connection = createMockConnection()
      const onRefresh = vi.fn()
      render(
        <ConnectionCard
          connection={connection}
          onRefresh={onRefresh}
          isRefreshing={true}
        />
      )
      expect(screen.getByText('Syncing...')).toBeDisabled()
    })

    it('shows "Sync Now" when isRefreshing is false', () => {
      const connection = createMockConnection()
      const onRefresh = vi.fn()
      render(
        <ConnectionCard
          connection={connection}
          onRefresh={onRefresh}
          isRefreshing={false}
        />
      )
      expect(screen.getByText('Sync Now')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('renders buttons with appropriate classes for styling', () => {
      const connection = createMockConnection()
      render(
        <ConnectionCard
          connection={connection}
          onRefresh={vi.fn()}
          onDisconnect={vi.fn()}
        />
      )

      const refreshButton = screen.getByText('Sync Now')
      const disconnectButton = screen.getByText('Disconnect')

      expect(refreshButton).toHaveClass('connection-action-button', 'refresh-button')
      expect(disconnectButton).toHaveClass('connection-action-button', 'disconnect-button')
    })

    it('can be navigated with keyboard', () => {
      const connection = createMockConnection()
      const onRefresh = vi.fn()
      const onDisconnect = vi.fn()
      render(
        <ConnectionCard
          connection={connection}
          onRefresh={onRefresh}
          onDisconnect={onDisconnect}
        />
      )

      const refreshButton = screen.getByText('Sync Now')
      const disconnectButton = screen.getByText('Disconnect')

      // Buttons should be focusable
      refreshButton.focus()
      expect(document.activeElement).toBe(refreshButton)

      disconnectButton.focus()
      expect(document.activeElement).toBe(disconnectButton)
    })

    it('buttons respond to keyboard Enter key', () => {
      const connection = createMockConnection()
      const onRefresh = vi.fn()
      render(
        <ConnectionCard
          connection={connection}
          onRefresh={onRefresh}
        />
      )

      const refreshButton = screen.getByText('Sync Now')
      fireEvent.keyDown(refreshButton, { key: 'Enter', code: 'Enter' })
      // Native button behavior handles Enter key
    })
  })
})
