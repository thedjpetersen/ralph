import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ToastContainer } from '../Toast'
import { useToastStore } from '../../stores/toast'

// Mock matchMedia for reduced motion detection
const mockMatchMedia = (prefersReducedMotion: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)' && prefersReducedMotion,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('ToastContainer', () => {
  beforeEach(() => {
    // Reset toast store state before each test
    useToastStore.setState({ toasts: [], queue: [] })
    mockMatchMedia(false)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders toast container with aria-label', () => {
    render(<ToastContainer />)
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument()
  })

  it('displays no toasts when store is empty', () => {
    render(<ToastContainer />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders a toast with message', () => {
    useToastStore.setState({
      toasts: [{ id: '1', type: 'success', message: 'Test toast message' }],
      queue: [],
    })
    render(<ToastContainer />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Test toast message')).toBeInTheDocument()
  })

  it('renders toast with correct type class', () => {
    useToastStore.setState({
      toasts: [{ id: '1', type: 'error', message: 'Error message' }],
      queue: [],
    })
    render(<ToastContainer />)
    const toast = screen.getByRole('alert')
    expect(toast).toHaveClass('toast-error')
  })

  it('renders multiple toasts', () => {
    useToastStore.setState({
      toasts: [
        { id: '1', type: 'success', message: 'Success toast' },
        { id: '2', type: 'error', message: 'Error toast' },
        { id: '3', type: 'info', message: 'Info toast' },
      ],
      queue: [],
    })
    render(<ToastContainer />)
    const alerts = screen.getAllByRole('alert')
    expect(alerts).toHaveLength(3)
  })

  describe('Accessibility', () => {
    it('toast has role="alert"', () => {
      useToastStore.setState({
        toasts: [{ id: '1', type: 'success', message: 'Alert message' }],
        queue: [],
      })
      render(<ToastContainer />)
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('toast has aria-live="polite"', () => {
      useToastStore.setState({
        toasts: [{ id: '1', type: 'success', message: 'Message' }],
        queue: [],
      })
      render(<ToastContainer />)
      const toast = screen.getByRole('alert')
      expect(toast).toHaveAttribute('aria-live', 'polite')
    })

    it('dismiss button has accessible aria-label', () => {
      useToastStore.setState({
        toasts: [{ id: '1', type: 'success', message: 'Message' }],
        queue: [],
      })
      render(<ToastContainer />)
      expect(screen.getByLabelText('Dismiss notification')).toBeInTheDocument()
    })

    it('container has aria-label for screen readers', () => {
      render(<ToastContainer />)
      const container = screen.getByLabelText('Notifications')
      expect(container).toHaveClass('toast-container')
    })
  })

  describe('Dismissal', () => {
    it('removes toast when dismiss button is clicked', () => {
      useToastStore.setState({
        toasts: [{ id: '1', type: 'success', message: 'Dismissable toast' }],
        queue: [],
      })
      render(<ToastContainer />)

      const dismissButton = screen.getByLabelText('Dismiss notification')
      fireEvent.click(dismissButton)

      expect(useToastStore.getState().toasts).toHaveLength(0)
    })

    it('removes correct toast from multiple toasts', () => {
      useToastStore.setState({
        toasts: [
          { id: '1', type: 'success', message: 'Toast 1' },
          { id: '2', type: 'error', message: 'Toast 2' },
        ],
        queue: [],
      })
      render(<ToastContainer />)

      const dismissButtons = screen.getAllByLabelText('Dismiss notification')
      fireEvent.click(dismissButtons[0])

      expect(useToastStore.getState().toasts).toHaveLength(1)
      expect(useToastStore.getState().toasts[0].id).toBe('2')
    })
  })

  describe('Toast Actions', () => {
    it('renders action button when toast has action', () => {
      const mockAction = vi.fn()
      useToastStore.setState({
        toasts: [
          {
            id: '1',
            type: 'info',
            message: 'Action toast',
            action: { label: 'Undo', onClick: mockAction },
          },
        ],
        queue: [],
      })
      render(<ToastContainer />)

      expect(screen.getByText('Undo')).toBeInTheDocument()
    })

    it('calls action onClick and dismisses when action button clicked', () => {
      const mockAction = vi.fn()
      useToastStore.setState({
        toasts: [
          {
            id: '1',
            type: 'info',
            message: 'Action toast',
            action: { label: 'Undo', onClick: mockAction },
          },
        ],
        queue: [],
      })
      render(<ToastContainer />)

      const actionButton = screen.getByText('Undo')
      fireEvent.click(actionButton)

      expect(mockAction).toHaveBeenCalledTimes(1)
      expect(useToastStore.getState().toasts).toHaveLength(0)
    })
  })

  describe('Auto-dismiss', () => {
    it('auto-dismisses toast after duration', () => {
      useToastStore.setState({
        toasts: [
          { id: '1', type: 'success', message: 'Auto dismiss', duration: 3000 },
        ],
        queue: [],
      })
      render(<ToastContainer />)

      expect(screen.getByText('Auto dismiss')).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(3000)
      })

      expect(useToastStore.getState().toasts).toHaveLength(0)
    })

    it('does not auto-dismiss when duration is 0', () => {
      useToastStore.setState({
        toasts: [
          { id: '1', type: 'success', message: 'Persistent', duration: 0 },
        ],
        queue: [],
      })
      render(<ToastContainer />)

      act(() => {
        vi.advanceTimersByTime(10000)
      })

      expect(screen.getByText('Persistent')).toBeInTheDocument()
    })
  })

  describe('Reduced Motion', () => {
    it('respects reduced motion preferences', () => {
      mockMatchMedia(true)
      useToastStore.setState({
        toasts: [{ id: '1', type: 'success', message: 'Reduced motion toast' }],
        queue: [],
      })

      render(<ToastContainer />)

      // The toast should still render, just without animations
      expect(screen.getByText('Reduced motion toast')).toBeInTheDocument()
    })
  })

  describe('Toast Types', () => {
    it('renders success toast with success class', () => {
      useToastStore.setState({
        toasts: [{ id: '1', type: 'success', message: 'Success' }],
        queue: [],
      })
      render(<ToastContainer />)
      expect(screen.getByRole('alert')).toHaveClass('toast-success')
    })

    it('renders error toast with error class', () => {
      useToastStore.setState({
        toasts: [{ id: '1', type: 'error', message: 'Error' }],
        queue: [],
      })
      render(<ToastContainer />)
      expect(screen.getByRole('alert')).toHaveClass('toast-error')
    })

    it('renders warning toast with warning class', () => {
      useToastStore.setState({
        toasts: [{ id: '1', type: 'warning', message: 'Warning' }],
        queue: [],
      })
      render(<ToastContainer />)
      expect(screen.getByRole('alert')).toHaveClass('toast-warning')
    })

    it('renders info toast with info class', () => {
      useToastStore.setState({
        toasts: [{ id: '1', type: 'info', message: 'Info' }],
        queue: [],
      })
      render(<ToastContainer />)
      expect(screen.getByRole('alert')).toHaveClass('toast-info')
    })
  })
})
