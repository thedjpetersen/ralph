import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '../Layout'
import { useAccountStore } from '../../stores/account'
import { useUserStore } from '../../stores/user'

// Mock the stores
vi.mock('../../stores/account', () => ({
  useAccountStore: vi.fn(),
}))

vi.mock('../../stores/user', () => ({
  useUserStore: vi.fn(),
}))

vi.mock('../../stores/toast', () => ({
  useToastStore: vi.fn(() => ({
    toasts: [],
    removeToast: vi.fn(),
  })),
}))

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}))

const renderWithRouter = (initialRoute = '/') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<div>Home Page</div>} />
          <Route path="/accounts" element={<div>Accounts Page</div>} />
          <Route path="/accounts/:id/settings" element={<div>Account Settings</div>} />
          <Route path="/accounts/:id/members" element={<div>Account Members</div>} />
          <Route path="/profile" element={<div>Profile Page</div>} />
          <Route path="/settings" element={<div>Settings Page</div>} />
          <Route path="/api-keys" element={<div>API Keys Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('Layout', () => {
  const mockFetchAccounts = vi.fn()
  const mockFetchUser = vi.fn()
  const mockSwitchAccount = vi.fn()
  const mockLogout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useAccountStore).mockReturnValue({
      currentAccount: { id: 'acc-1', name: 'Test Account' },
      accounts: [
        { id: 'acc-1', name: 'Test Account' },
        { id: 'acc-2', name: 'Second Account' },
      ],
      isLoading: false,
      fetchAccounts: mockFetchAccounts,
      switchAccount: mockSwitchAccount,
    } as unknown as ReturnType<typeof useAccountStore>)

    vi.mocked(useUserStore).mockReturnValue({
      user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      fetchUser: mockFetchUser,
      logout: mockLogout,
    } as unknown as ReturnType<typeof useUserStore>)
  })

  describe('Header Rendering', () => {
    it('renders logo link', () => {
      renderWithRouter()
      expect(screen.getByText('ClockZen')).toBeInTheDocument()
      expect(screen.getByText('ClockZen').closest('a')).toHaveAttribute('href', '/')
    })

    it('renders navigation link to accounts', () => {
      renderWithRouter()
      expect(screen.getByRole('link', { name: 'Accounts' })).toHaveAttribute(
        'href',
        '/accounts'
      )
    })

    it('fetches accounts and user on mount', () => {
      renderWithRouter()
      expect(mockFetchAccounts).toHaveBeenCalled()
      expect(mockFetchUser).toHaveBeenCalled()
    })
  })

  describe('Account Switcher Dropdown', () => {
    it('renders current account name', () => {
      renderWithRouter()
      expect(screen.getByText('Test Account')).toBeInTheDocument()
    })

    it('has correct ARIA attributes on trigger button', () => {
      renderWithRouter()
      const trigger = screen.getByRole('button', { name: /Test Account/i })
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
      expect(trigger).toHaveAttribute('aria-controls', 'account-menu')
    })

    it('opens dropdown on click', () => {
      renderWithRouter()
      const trigger = screen.getByRole('button', { name: /Test Account/i })

      fireEvent.click(trigger)

      expect(trigger).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByText('Switch Account')).toBeInTheDocument()
    })

    it('shows all accounts in dropdown', () => {
      renderWithRouter()
      const trigger = screen.getByRole('button', { name: /Test Account/i })

      fireEvent.click(trigger)

      expect(screen.getByText('Second Account')).toBeInTheDocument()
    })

    it('shows checkmark on currently selected account', () => {
      renderWithRouter()
      const trigger = screen.getByRole('button', { name: /Test Account/i })

      fireEvent.click(trigger)

      // Find the active dropdown item (it contains the checkmark SVG)
      const activeItem = document.querySelector('.dropdown-item.active')
      expect(activeItem).toBeInTheDocument()
    })

    it('calls switchAccount when different account is clicked', () => {
      renderWithRouter()
      const trigger = screen.getByRole('button', { name: /Test Account/i })

      fireEvent.click(trigger)
      fireEvent.click(screen.getByText('Second Account'))

      expect(mockSwitchAccount).toHaveBeenCalledWith('acc-2')
    })

    it('closes dropdown after switching account', () => {
      renderWithRouter()
      const trigger = screen.getByRole('button', { name: /Test Account/i })

      fireEvent.click(trigger)
      fireEvent.click(screen.getByText('Second Account'))

      expect(screen.queryByText('Switch Account')).not.toBeInTheDocument()
    })

    it('shows Account Settings option', () => {
      renderWithRouter()
      const trigger = screen.getByRole('button', { name: /Test Account/i })

      fireEvent.click(trigger)

      expect(screen.getByText('Account Settings')).toBeInTheDocument()
    })

    it('shows Manage Members option', () => {
      renderWithRouter()
      const trigger = screen.getByRole('button', { name: /Test Account/i })

      fireEvent.click(trigger)

      expect(screen.getByText('Manage Members')).toBeInTheDocument()
    })

    it('closes dropdown when clicking outside', () => {
      renderWithRouter()
      const trigger = screen.getByRole('button', { name: /Test Account/i })

      fireEvent.click(trigger)
      expect(screen.getByText('Switch Account')).toBeInTheDocument()

      // Click outside the dropdown
      fireEvent.mouseDown(document.body)

      expect(screen.queryByText('Switch Account')).not.toBeInTheDocument()
    })
  })

  describe('User Menu', () => {
    it('renders user avatar placeholder with first letter', () => {
      renderWithRouter()
      expect(screen.getByText('T')).toBeInTheDocument() // First letter of 'Test User'
    })

    it('renders user avatar image when available', () => {
      vi.mocked(useUserStore).mockReturnValue({
        user: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          avatar: 'https://example.com/avatar.png',
        },
        fetchUser: mockFetchUser,
        logout: mockLogout,
      } as unknown as ReturnType<typeof useUserStore>)

      renderWithRouter()
      // Avatar image is decorative (aria-hidden), alt text is on the button instead
      const avatarImg = document.querySelector('.user-avatar') as HTMLImageElement
      expect(avatarImg).toHaveAttribute('src', 'https://example.com/avatar.png')
    })

    it('has correct ARIA attributes on user menu trigger', () => {
      renderWithRouter()
      const trigger = document.querySelector('.user-menu-trigger')!
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
      expect(trigger).toHaveAttribute('aria-controls', 'user-menu-dropdown')
    })

    it('opens user menu on click', () => {
      renderWithRouter()
      // Find the user menu trigger by its class
      const userMenuTrigger = document.querySelector('.user-menu-trigger')!

      fireEvent.click(userMenuTrigger)

      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('shows navigation items in user menu', () => {
      renderWithRouter()
      const userMenuTrigger = document.querySelector('.user-menu-trigger')!

      fireEvent.click(userMenuTrigger)

      // Menu items are buttons with role="menuitem" for better accessibility
      expect(screen.getByRole('menuitem', { name: 'Profile' })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'Settings' })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'API Keys' })).toBeInTheDocument()
    })

    it('shows logout button in user menu', () => {
      renderWithRouter()
      const userMenuTrigger = document.querySelector('.user-menu-trigger')!

      fireEvent.click(userMenuTrigger)

      expect(screen.getByText('Log Out')).toBeInTheDocument()
    })

    it('calls logout when Log Out is clicked', () => {
      renderWithRouter()
      const userMenuTrigger = document.querySelector('.user-menu-trigger')!

      fireEvent.click(userMenuTrigger)
      fireEvent.click(screen.getByText('Log Out'))

      expect(mockLogout).toHaveBeenCalled()
    })

    it('closes user menu when clicking outside', () => {
      renderWithRouter()
      const userMenuTrigger = document.querySelector('.user-menu-trigger')!

      fireEvent.click(userMenuTrigger)
      expect(screen.getByText('Log Out')).toBeInTheDocument()

      fireEvent.mouseDown(document.body)

      expect(screen.queryByText('Log Out')).not.toBeInTheDocument()
    })

    it('closes menu when menu item is clicked', async () => {
      renderWithRouter()
      const userMenuTrigger = document.querySelector('.user-menu-trigger')!

      fireEvent.click(userMenuTrigger)
      fireEvent.click(screen.getByRole('menuitem', { name: 'Profile' }))

      await waitFor(() => {
        expect(screen.queryByText('Log Out')).not.toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('shows skeleton when loading accounts', () => {
      vi.mocked(useAccountStore).mockReturnValue({
        currentAccount: null,
        accounts: [],
        isLoading: true,
        fetchAccounts: mockFetchAccounts,
        switchAccount: mockSwitchAccount,
      } as unknown as ReturnType<typeof useAccountStore>)

      renderWithRouter()

      // Should show skeleton loading state
      expect(document.querySelector('.skeleton')).toBeInTheDocument()
    })

    it('shows Select Account link when no current account', () => {
      vi.mocked(useAccountStore).mockReturnValue({
        currentAccount: null,
        accounts: [],
        isLoading: false,
        fetchAccounts: mockFetchAccounts,
        switchAccount: mockSwitchAccount,
      } as unknown as ReturnType<typeof useAccountStore>)

      renderWithRouter()

      expect(screen.getByRole('link', { name: 'Select Account' })).toBeInTheDocument()
    })
  })

  describe('Keyboard Navigation', () => {
    it('dropdown trigger is focusable', () => {
      renderWithRouter()
      const trigger = screen.getByRole('button', { name: /Test Account/i })

      trigger.focus()
      expect(document.activeElement).toBe(trigger)
    })

    it('user menu trigger is focusable', () => {
      renderWithRouter()
      const userMenuTrigger = document.querySelector(
        '.user-menu-trigger'
      ) as HTMLElement

      userMenuTrigger.focus()
      expect(document.activeElement).toBe(userMenuTrigger)
    })

    it('dropdown items are focusable buttons', () => {
      renderWithRouter()
      const trigger = screen.getByRole('button', { name: /Test Account/i })

      fireEvent.click(trigger)

      const menuItems = screen.getAllByRole('button', { name: /Account/i })
      menuItems.forEach((item) => {
        item.focus()
        expect(document.activeElement).toBe(item)
      })
    })

    it('menu items are focusable', () => {
      renderWithRouter()
      const userMenuTrigger = document.querySelector('.user-menu-trigger')!

      fireEvent.click(userMenuTrigger)

      const profileItem = screen.getByRole('menuitem', { name: 'Profile' })
      profileItem.focus()
      expect(document.activeElement).toBe(profileItem)
    })
  })

  describe('Accessibility', () => {
    it('header has correct class structure', () => {
      renderWithRouter()
      expect(document.querySelector('.layout-header')).toBeInTheDocument()
    })

    it('main content area exists', () => {
      renderWithRouter()
      expect(document.querySelector('.layout-main')).toBeInTheDocument()
    })

    it('renders outlet content', () => {
      renderWithRouter()
      expect(screen.getByText('Home Page')).toBeInTheDocument()
    })

    it('dropdown arrow rotates when open', () => {
      renderWithRouter()
      const trigger = screen.getByRole('button', { name: /Test Account/i })

      const arrow = trigger.querySelector('.dropdown-arrow')
      expect(arrow).not.toHaveClass('open')

      fireEvent.click(trigger)

      expect(arrow).toHaveClass('open')
    })

    it('has skip-to-content link', () => {
      renderWithRouter()
      const skipLink = document.querySelector('.skip-to-content')
      expect(skipLink).toBeInTheDocument()
      expect(skipLink).toHaveTextContent('Skip to main content')
    })

    it('has ARIA landmarks', () => {
      renderWithRouter()
      expect(screen.getByRole('banner')).toBeInTheDocument() // header
      expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
      expect(screen.getByRole('main', { name: 'Main content' })).toBeInTheDocument()
    })

    it('main content has id for skip link target', () => {
      renderWithRouter()
      const main = screen.getByRole('main')
      expect(main).toHaveAttribute('id', 'main-content')
      expect(main).toHaveAttribute('tabindex', '-1')
    })

    it('account menu has proper ARIA menu roles', () => {
      renderWithRouter()
      const trigger = screen.getByRole('button', { name: /Test Account/i })
      fireEvent.click(trigger)

      const menu = document.getElementById('account-menu')
      expect(menu).toHaveAttribute('role', 'menu')
      expect(menu).toHaveAttribute('aria-label', 'Account menu')

      // Check menu items have proper roles
      const menuItems = screen.getAllByRole('menuitemradio')
      expect(menuItems.length).toBeGreaterThan(0)
    })

    it('user menu has proper ARIA menu roles', () => {
      renderWithRouter()
      const userMenuTrigger = document.querySelector('.user-menu-trigger')!
      fireEvent.click(userMenuTrigger)

      const menu = document.getElementById('user-menu-dropdown')
      expect(menu).toHaveAttribute('role', 'menu')
      expect(menu).toHaveAttribute('aria-label', 'User menu')

      // Check menu items have proper roles
      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems.length).toBe(4) // Profile, Settings, API Keys, Log Out
    })
  })

  describe('User Display Edge Cases', () => {
    it('shows ? when user has no name', () => {
      vi.mocked(useUserStore).mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        fetchUser: mockFetchUser,
        logout: mockLogout,
      } as unknown as ReturnType<typeof useUserStore>)

      renderWithRouter()
      expect(screen.getByText('?')).toBeInTheDocument()
    })

    it('shows User when name is missing in dropdown', () => {
      vi.mocked(useUserStore).mockReturnValue({
        user: { id: 'user-1' },
        fetchUser: mockFetchUser,
        logout: mockLogout,
      } as unknown as ReturnType<typeof useUserStore>)

      renderWithRouter()
      const userMenuTrigger = document.querySelector('.user-menu-trigger')!

      fireEvent.click(userMenuTrigger)

      expect(screen.getByText('User')).toBeInTheDocument()
    })

    it('handles null user gracefully', () => {
      vi.mocked(useUserStore).mockReturnValue({
        user: null,
        fetchUser: mockFetchUser,
        logout: mockLogout,
      } as unknown as ReturnType<typeof useUserStore>)

      renderWithRouter()
      expect(screen.getByText('?')).toBeInTheDocument()
    })
  })
})
