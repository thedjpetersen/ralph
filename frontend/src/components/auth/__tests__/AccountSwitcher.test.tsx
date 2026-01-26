import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AccountSwitcher } from '../AccountSwitcher';
import { useAccountStore } from '../../../stores/account';

// Mock the account store
vi.mock('../../../stores/account', () => ({
  useAccountStore: vi.fn(),
}));

const mockAccounts = [
  { id: 'acc-1', name: 'Personal Account', email: 'user@example.com', createdAt: '2024-01-01' },
  { id: 'acc-2', name: 'Work Account', email: 'work@example.com', createdAt: '2024-01-02' },
  { id: 'acc-3', name: 'Business Account', email: 'biz@example.com', createdAt: '2024-01-03' },
];

const renderWithRouter = (props = {}) => {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<AccountSwitcher {...props} />} />
        <Route path="/accounts/:id/settings" element={<div>Account Settings Page</div>} />
        <Route path="/accounts/:id/members" element={<div>Account Members Page</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('AccountSwitcher', () => {
  const mockSwitchAccount = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAccountStore).mockReturnValue({
      currentAccount: mockAccounts[0],
      accounts: mockAccounts,
      isLoading: false,
      switchAccount: mockSwitchAccount,
    } as unknown as ReturnType<typeof useAccountStore>);
  });

  describe('Rendering', () => {
    it('renders current account name', () => {
      renderWithRouter();
      expect(screen.getByText('Personal Account')).toBeInTheDocument();
    });

    it('renders dropdown trigger with correct ARIA attributes', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
      expect(trigger).toHaveAttribute('aria-controls', 'account-switcher-menu');
    });

    it('renders skeleton when loading', () => {
      vi.mocked(useAccountStore).mockReturnValue({
        currentAccount: null,
        accounts: [],
        isLoading: true,
        switchAccount: mockSwitchAccount,
      } as unknown as ReturnType<typeof useAccountStore>);

      renderWithRouter();
      expect(document.querySelector('.skeleton')).toBeInTheDocument();
    });

    it('renders placeholder when no account is selected', () => {
      vi.mocked(useAccountStore).mockReturnValue({
        currentAccount: null,
        accounts: mockAccounts,
        isLoading: false,
        switchAccount: mockSwitchAccount,
      } as unknown as ReturnType<typeof useAccountStore>);

      renderWithRouter();
      expect(screen.getByText('No account selected')).toBeInTheDocument();
    });
  });

  describe('Dropdown Behavior', () => {
    it('opens dropdown on click', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Switch Account')).toBeInTheDocument();
    });

    it('shows all accounts in dropdown', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);

      expect(screen.getByText('Work Account')).toBeInTheDocument();
      expect(screen.getByText('Business Account')).toBeInTheDocument();
    });

    it('shows checkmark on current account', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);

      const activeItem = document.querySelector('.account-switcher-item.active');
      expect(activeItem).toBeInTheDocument();
      expect(activeItem).toHaveTextContent('Personal Account');
    });

    it('closes dropdown when clicking outside', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);
      expect(screen.getByText('Switch Account')).toBeInTheDocument();

      fireEvent.mouseDown(document.body);

      expect(screen.queryByText('Switch Account')).not.toBeInTheDocument();
    });

    it('toggles dropdown on repeated clicks', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Account Switching', () => {
    it('calls switchAccount when different account is clicked', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);
      fireEvent.click(screen.getByText('Work Account'));

      expect(mockSwitchAccount).toHaveBeenCalledWith('acc-2');
    });

    it('closes dropdown after switching account', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);
      fireEvent.click(screen.getByText('Work Account'));

      expect(screen.queryByText('Switch Account')).not.toBeInTheDocument();
    });

    it('calls onAccountSwitch callback when account is switched', () => {
      const onAccountSwitch = vi.fn();
      renderWithRouter({ onAccountSwitch });

      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);
      fireEvent.click(screen.getByText('Work Account'));

      expect(onAccountSwitch).toHaveBeenCalledWith('acc-2');
    });
  });

  describe('Action Buttons', () => {
    it('shows Account Settings option by default', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);

      expect(screen.getByText('Account Settings')).toBeInTheDocument();
    });

    it('shows Manage Members option by default', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);

      expect(screen.getByText('Manage Members')).toBeInTheDocument();
    });

    it('hides action buttons when showActions is false', () => {
      renderWithRouter({ showActions: false });
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);

      expect(screen.queryByText('Account Settings')).not.toBeInTheDocument();
      expect(screen.queryByText('Manage Members')).not.toBeInTheDocument();
    });

    it('navigates to account settings when clicked', async () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);
      fireEvent.click(screen.getByText('Account Settings'));

      await waitFor(() => {
        expect(screen.getByText('Account Settings Page')).toBeInTheDocument();
      });
    });

    it('navigates to account members when clicked', async () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);
      fireEvent.click(screen.getByText('Manage Members'));

      await waitFor(() => {
        expect(screen.getByText('Account Members Page')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('opens dropdown with Enter key', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      trigger.focus();
      fireEvent.keyDown(trigger, { key: 'Enter' });

      expect(screen.getByText('Switch Account')).toBeInTheDocument();
    });

    it('opens dropdown with Space key', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      trigger.focus();
      fireEvent.keyDown(trigger, { key: ' ' });

      expect(screen.getByText('Switch Account')).toBeInTheDocument();
    });

    it('opens dropdown with ArrowDown key', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      trigger.focus();
      fireEvent.keyDown(trigger, { key: 'ArrowDown' });

      expect(screen.getByText('Switch Account')).toBeInTheDocument();
    });

    it('closes dropdown with Escape key', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);
      expect(screen.getByText('Switch Account')).toBeInTheDocument();

      fireEvent.keyDown(trigger, { key: 'Escape' });

      expect(screen.queryByText('Switch Account')).not.toBeInTheDocument();
    });

    it('navigates through items with ArrowDown key', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);

      // First item should be focused by default after using keyboard to open
      fireEvent.keyDown(trigger, { key: 'ArrowDown' });

      const focusedItem = document.querySelector('.account-switcher-item.focused');
      expect(focusedItem).toBeInTheDocument();
    });

    it('navigates through items with ArrowUp key', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);
      fireEvent.keyDown(trigger, { key: 'ArrowDown' });
      fireEvent.keyDown(trigger, { key: 'ArrowDown' });
      fireEvent.keyDown(trigger, { key: 'ArrowUp' });

      const focusedItem = document.querySelector('.account-switcher-item.focused');
      expect(focusedItem).toBeInTheDocument();
    });

    it('selects account with Enter key', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);
      fireEvent.keyDown(trigger, { key: 'ArrowDown' }); // Focus first item
      fireEvent.keyDown(trigger, { key: 'ArrowDown' }); // Focus second item
      fireEvent.keyDown(trigger, { key: 'Enter' });

      expect(mockSwitchAccount).toHaveBeenCalledWith('acc-2');
    });

    it('wraps around when navigating past last item', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);
      // Navigate past all items (3 accounts + 2 actions = 5 items)
      for (let i = 0; i < 6; i++) {
        fireEvent.keyDown(trigger, { key: 'ArrowDown' });
      }

      const focusedItems = document.querySelectorAll('.account-switcher-item.focused');
      expect(focusedItems.length).toBe(1);
    });

    it('jumps to first item with Home key', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);
      fireEvent.keyDown(trigger, { key: 'ArrowDown' });
      fireEvent.keyDown(trigger, { key: 'ArrowDown' });
      fireEvent.keyDown(trigger, { key: 'Home' });

      const items = document.querySelectorAll('.account-switcher-item');
      expect(items[0]).toHaveClass('focused');
    });

    it('jumps to last item with End key', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);
      fireEvent.keyDown(trigger, { key: 'End' });

      const items = document.querySelectorAll('.account-switcher-item');
      expect(items[items.length - 1]).toHaveClass('focused');
    });
  });

  describe('Accessibility', () => {
    it('has proper menu role on dropdown', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);

      const menu = document.getElementById('account-switcher-menu');
      expect(menu).toHaveAttribute('role', 'menu');
      expect(menu).toHaveAttribute('aria-label', 'Account menu');
    });

    it('has proper menuitemradio role on account items', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);

      const menuItems = screen.getAllByRole('menuitemradio');
      expect(menuItems).toHaveLength(3);
    });

    it('has aria-checked on current account', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);

      const currentItem = screen.getAllByRole('menuitemradio').find(
        (item) => item.getAttribute('aria-checked') === 'true'
      );
      expect(currentItem).toHaveTextContent('Personal Account');
    });

    it('has proper menuitem role on action buttons', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);

      expect(screen.getByRole('menuitem', { name: 'Account Settings' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Manage Members' })).toBeInTheDocument();
    });

    it('has proper separator between sections', () => {
      renderWithRouter();
      const trigger = screen.getByRole('button', { name: /Personal Account/i });

      fireEvent.click(trigger);

      const separator = document.querySelector('.account-switcher-divider');
      expect(separator).toHaveAttribute('role', 'separator');
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      renderWithRouter({ className: 'custom-switcher' });

      const container = document.querySelector('.account-switcher-container');
      expect(container).toHaveClass('custom-switcher');
    });
  });
});
