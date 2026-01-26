import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EarningsTable } from '../EarningsTable'
import { useAccountStore } from '../../stores/account'
import { usePaychecksStore } from '../../stores/paychecks'
import type { PaycheckEarning } from '../../api/client'

// Mock the stores
vi.mock('../../stores/account', () => ({
  useAccountStore: vi.fn(),
}))

vi.mock('../../stores/paychecks', () => ({
  usePaychecksStore: vi.fn(),
}))

vi.mock('../../stores/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

const createMockEarning = (
  overrides: Partial<PaycheckEarning> = {}
): PaycheckEarning => ({
  id: 'earn-1',
  paycheck_id: 'paycheck-1',
  type: 'regular',
  description: 'Regular wages',
  hours: 80,
  rate: 50,
  amount: 4000,
  ytd_amount: 24000,
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  ...overrides,
})

describe('EarningsTable', () => {
  const mockAddEarning = vi.fn()
  const mockUpdateEarning = vi.fn()
  const mockDeleteEarning = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useAccountStore).mockReturnValue({
      currentAccount: { id: 'acc-1', name: 'Test Account' },
    } as ReturnType<typeof useAccountStore>)

    vi.mocked(usePaychecksStore).mockReturnValue({
      addEarning: mockAddEarning,
      updateEarning: mockUpdateEarning,
      deleteEarning: mockDeleteEarning,
    } as unknown as ReturnType<typeof usePaychecksStore>)
  })

  describe('Empty State', () => {
    it('shows empty state when no earnings', () => {
      render(
        <EarningsTable
          earnings={[]}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )
      expect(screen.getByText('No earnings recorded')).toBeInTheDocument()
      expect(screen.getByText('Add Earning')).toBeInTheDocument()
    })

    it('renders add form when clicking Add Earning in empty state', () => {
      render(
        <EarningsTable
          earnings={[]}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )
      fireEvent.click(screen.getByText('Add Earning'))
      expect(screen.getByPlaceholderText('Amount *')).toBeInTheDocument()
    })
  })

  describe('Table Rendering', () => {
    it('renders table with earnings', () => {
      const earnings = [
        createMockEarning({ id: 'earn-1', type: 'regular', amount: 4000 }),
        createMockEarning({ id: 'earn-2', type: 'overtime', amount: 500 }),
      ]
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )

      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getByText('Regular Pay')).toBeInTheDocument()
      expect(screen.getByText('Overtime')).toBeInTheDocument()
    })

    it('renders table headers', () => {
      render(
        <EarningsTable
          earnings={[createMockEarning()]}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )

      expect(screen.getByText('Type')).toBeInTheDocument()
      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByText('Hours')).toBeInTheDocument()
      expect(screen.getByText('Rate')).toBeInTheDocument()
      expect(screen.getByText('Amount')).toBeInTheDocument()
      expect(screen.getByText('YTD')).toBeInTheDocument()
    })

    it('calculates and displays total', () => {
      const earnings = [
        createMockEarning({ id: 'earn-1', amount: 1000 }),
        createMockEarning({ id: 'earn-2', amount: 2000 }),
        createMockEarning({ id: 'earn-3', amount: 500 }),
      ]
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )

      expect(screen.getByText('Total')).toBeInTheDocument()
      expect(screen.getByText('$3,500.00')).toBeInTheDocument()
    })
  })

  describe('Currency Formatting', () => {
    it('formats amounts with specified currency', () => {
      const earnings = [createMockEarning({ amount: 1500, rate: undefined, hours: undefined, ytd_amount: undefined })]
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )

      // Check that amounts are rendered with proper currency formatting (both amount and total)
      const formattedAmounts = screen.getAllByText('$1,500.00')
      expect(formattedAmounts.length).toBeGreaterThan(0)
    })

    it('handles different currencies', () => {
      const earnings = [createMockEarning({ amount: 1000 })]
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="EUR"
        />
      )

      // EUR formatting
      const amountCells = screen.getAllByText(/€/)
      expect(amountCells.length).toBeGreaterThan(0)
    })
  })

  describe('Earning Type Labels', () => {
    it.each([
      ['regular', 'Regular Pay'],
      ['overtime', 'Overtime'],
      ['bonus', 'Bonus'],
      ['commission', 'Commission'],
      ['tips', 'Tips'],
      ['holiday', 'Holiday Pay'],
      ['vacation', 'Vacation Pay'],
      ['sick', 'Sick Pay'],
      ['pto', 'PTO'],
      ['reimbursement', 'Reimbursement'],
      ['other', 'Other'],
    ])('displays correct label for type %s', (type, expectedLabel) => {
      const earnings = [createMockEarning({ type })]
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )
      expect(screen.getByText(expectedLabel)).toBeInTheDocument()
    })

    it('displays type as-is for unknown types', () => {
      const earnings = [createMockEarning({ type: 'custom_type' })]
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )
      expect(screen.getByText('custom_type')).toBeInTheDocument()
    })
  })

  describe('Optional Fields', () => {
    it('shows dash for missing description', () => {
      const earnings = [createMockEarning({ description: undefined })]
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )
      const cells = screen.getAllByText('-')
      expect(cells.length).toBeGreaterThan(0)
    })

    it('shows dash for missing hours', () => {
      const earnings = [createMockEarning({ hours: undefined })]
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )
      const cells = screen.getAllByText('-')
      expect(cells.length).toBeGreaterThan(0)
    })

    it('shows dash for missing rate', () => {
      const earnings = [createMockEarning({ rate: undefined })]
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )
      const cells = screen.getAllByText('-')
      expect(cells.length).toBeGreaterThan(0)
    })

    it('shows dash for missing YTD amount', () => {
      const earnings = [createMockEarning({ ytd_amount: undefined })]
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )
      const cells = screen.getAllByText('-')
      expect(cells.length).toBeGreaterThan(0)
    })
  })

  describe('Action Buttons', () => {
    it('renders edit and delete buttons for each earning', () => {
      const earnings = [createMockEarning()]
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )

      expect(screen.getByText('Edit')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    it('renders Add Earning button when table has earnings', () => {
      const earnings = [createMockEarning()]
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )

      const addButtons = screen.getAllByText('Add Earning')
      expect(addButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Edit Mode', () => {
    it('shows edit form when Edit is clicked', () => {
      const earnings = [createMockEarning({ amount: 4000 })]
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )

      fireEvent.click(screen.getByText('Edit'))

      // Edit form should appear with current values
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('populates edit form with earning data', () => {
      const earnings = [
        createMockEarning({
          type: 'overtime',
          description: 'Weekend work',
          hours: 10,
          rate: 75,
          amount: 750,
          ytd_amount: 3000,
        }),
      ]
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )

      fireEvent.click(screen.getByText('Edit'))

      // Check that form inputs have correct values
      const amountInput = screen.getByPlaceholderText('Amount') as HTMLInputElement
      expect(amountInput.value).toBe('750')
    })

    it('cancels edit when Cancel is clicked', () => {
      const earnings = [createMockEarning()]
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )

      fireEvent.click(screen.getByText('Edit'))
      fireEvent.click(screen.getByText('Cancel'))

      // Should be back to normal view
      expect(screen.getByText('Edit')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    })
  })

  describe('Add Form', () => {
    it('shows add form when Add Earning is clicked', () => {
      const earnings = [createMockEarning()]
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )

      fireEvent.click(screen.getByText('Add Earning'))

      expect(screen.getByPlaceholderText('Amount *')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Description')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Hours')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Rate')).toBeInTheDocument()
    })

    it('hides add form when Cancel is clicked', () => {
      const earnings = [createMockEarning()]
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )

      fireEvent.click(screen.getByText('Add Earning'))
      // Find cancel button in the form
      const cancelButton = screen.getAllByText('Cancel')[0]
      fireEvent.click(cancelButton)

      expect(screen.queryByPlaceholderText('Amount *')).not.toBeInTheDocument()
    })

    it('calls addEarning when form is submitted', async () => {
      mockAddEarning.mockResolvedValue({ id: 'new-earn' })

      const earnings: PaycheckEarning[] = []
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )

      fireEvent.click(screen.getByText('Add Earning'))

      const amountInput = screen.getByPlaceholderText('Amount *')
      fireEvent.change(amountInput, { target: { value: '1500' } })

      fireEvent.click(screen.getByText('Add'))

      await waitFor(() => {
        expect(mockAddEarning).toHaveBeenCalledWith('acc-1', 'paycheck-1', {
          type: 'regular',
          description: undefined,
          hours: undefined,
          rate: undefined,
          amount: 1500,
          ytd_amount: undefined,
        })
      })
    })
  })

  describe('Delete Action', () => {
    it('prompts for confirmation before deleting', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

      const earnings = [createMockEarning()]
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )

      fireEvent.click(screen.getByText('Delete'))

      expect(confirmSpy).toHaveBeenCalledWith(
        'Are you sure you want to delete this earning?'
      )

      confirmSpy.mockRestore()
    })

    it('calls deleteEarning when confirmed', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      mockDeleteEarning.mockResolvedValue(undefined)

      const earnings = [createMockEarning({ id: 'earn-to-delete' })]
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )

      fireEvent.click(screen.getByText('Delete'))

      await waitFor(() => {
        expect(mockDeleteEarning).toHaveBeenCalledWith(
          'acc-1',
          'paycheck-1',
          'earn-to-delete'
        )
      })
    })

    it('does not delete when cancelled', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false)

      const earnings = [createMockEarning()]
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )

      fireEvent.click(screen.getByText('Delete'))

      expect(mockDeleteEarning).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard Accessibility', () => {
    it('all buttons are focusable', () => {
      const earnings = [createMockEarning()]
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )

      const editButton = screen.getByText('Edit')
      const deleteButton = screen.getByText('Delete')
      const addButton = screen.getByText('Add Earning')

      editButton.focus()
      expect(document.activeElement).toBe(editButton)

      deleteButton.focus()
      expect(document.activeElement).toBe(deleteButton)

      addButton.focus()
      expect(document.activeElement).toBe(addButton)
    })

    it('form inputs are accessible via tab', () => {
      const earnings: PaycheckEarning[] = []
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )

      fireEvent.click(screen.getByText('Add Earning'))

      const inputs = screen.getAllByRole('textbox')
      inputs.forEach((input) => {
        input.focus()
        expect(document.activeElement).toBe(input)
      })
    })
  })

  describe('No Account Selected', () => {
    it('does not call store actions when no account', async () => {
      vi.mocked(useAccountStore).mockReturnValue({
        currentAccount: null,
      } as ReturnType<typeof useAccountStore>)

      const earnings: PaycheckEarning[] = []
      render(
        <EarningsTable
          earnings={earnings}
          paycheckId="paycheck-1"
          currency="USD"
        />
      )

      fireEvent.click(screen.getByText('Add Earning'))

      const amountInput = screen.getByPlaceholderText('Amount *')
      fireEvent.change(amountInput, { target: { value: '1500' } })

      fireEvent.click(screen.getByText('Add'))

      await waitFor(() => {
        expect(mockAddEarning).not.toHaveBeenCalled()
      })
    })
  })
})
