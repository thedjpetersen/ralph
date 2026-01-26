import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireRole } from '../RequireRole';
import { useUserStore } from '../../../stores/user';
import { useAccountStore } from '../../../stores/account';

// Mock the stores
vi.mock('../../../stores/user', () => ({
  useUserStore: vi.fn(),
}));

vi.mock('../../../stores/account', () => ({
  useAccountStore: vi.fn(),
}));

const mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'Test User',
  createdAt: '2024-01-01',
};

const mockAccount = {
  id: 'acc-1',
  name: 'Test Account',
  email: 'account@example.com',
  createdAt: '2024-01-01',
};

const mockMembers = [
  {
    id: 'member-1',
    accountId: 'acc-1',
    userId: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    role: 'owner' as const,
    joinedAt: '2024-01-01',
  },
  {
    id: 'member-2',
    accountId: 'acc-1',
    userId: 'user-2',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin' as const,
    joinedAt: '2024-01-02',
  },
  {
    id: 'member-3',
    accountId: 'acc-1',
    userId: 'user-3',
    email: 'member@example.com',
    name: 'Regular Member',
    role: 'member' as const,
    joinedAt: '2024-01-03',
  },
];

const renderWithRouter = (
  allowedRoles: ('owner' | 'admin' | 'member')[],
  options: {
    initialEntries?: string[];
    showForbidden?: boolean;
    redirectTo?: string;
    forbiddenMessage?: string;
  } = {}
) => {
  const { initialEntries = ['/protected'], ...props } = options;

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route
          path="/protected"
          element={
            <RequireRole allowedRoles={allowedRoles} {...props}>
              <div>Protected Content</div>
            </RequireRole>
          }
        />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/custom-redirect" element={<div>Custom Redirect Page</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('RequireRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useUserStore).mockReturnValue({
      user: mockUser,
    } as unknown as ReturnType<typeof useUserStore>);

    vi.mocked(useAccountStore).mockReturnValue({
      currentAccount: mockAccount,
      members: mockMembers,
      isLoading: false,
    } as unknown as ReturnType<typeof useAccountStore>);
  });

  describe('Loading State', () => {
    it('shows loading state when account store is loading', () => {
      vi.mocked(useAccountStore).mockReturnValue({
        currentAccount: mockAccount,
        members: [],
        isLoading: true,
      } as unknown as ReturnType<typeof useAccountStore>);

      renderWithRouter(['owner']);

      expect(document.querySelector('.require-role-loading')).toBeInTheDocument();
    });
  });

  describe('Authentication', () => {
    it('redirects to login when no user is logged in', () => {
      vi.mocked(useUserStore).mockReturnValue({
        user: null,
      } as unknown as ReturnType<typeof useUserStore>);

      renderWithRouter(['owner']);

      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    it('redirects to dashboard when no account is selected', () => {
      vi.mocked(useAccountStore).mockReturnValue({
        currentAccount: null,
        members: [],
        isLoading: false,
      } as unknown as ReturnType<typeof useAccountStore>);

      renderWithRouter(['owner']);

      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });
  });

  describe('Role-based Access', () => {
    it('renders children when user has owner role and owner is allowed', () => {
      renderWithRouter(['owner']);

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('renders children when user has owner role and multiple roles are allowed', () => {
      renderWithRouter(['owner', 'admin']);

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('renders children when admin user accesses admin-allowed route', () => {
      vi.mocked(useUserStore).mockReturnValue({
        user: { ...mockUser, id: 'user-2' },
      } as unknown as ReturnType<typeof useUserStore>);

      renderWithRouter(['admin', 'owner']);

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('renders children when member user accesses member-allowed route', () => {
      vi.mocked(useUserStore).mockReturnValue({
        user: { ...mockUser, id: 'user-3' },
      } as unknown as ReturnType<typeof useUserStore>);

      renderWithRouter(['member', 'admin', 'owner']);

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('redirects when user does not have required role', () => {
      vi.mocked(useUserStore).mockReturnValue({
        user: { ...mockUser, id: 'user-3' }, // member role
      } as unknown as ReturnType<typeof useUserStore>);

      renderWithRouter(['owner', 'admin']); // member not allowed

      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('redirects when user is not a member of the account', () => {
      vi.mocked(useUserStore).mockReturnValue({
        user: { ...mockUser, id: 'user-999' }, // not a member
      } as unknown as ReturnType<typeof useUserStore>);

      renderWithRouter(['owner']);

      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });
  });

  describe('Forbidden Message', () => {
    it('shows forbidden message instead of redirecting when showForbidden is true', () => {
      vi.mocked(useUserStore).mockReturnValue({
        user: { ...mockUser, id: 'user-3' }, // member role
      } as unknown as ReturnType<typeof useUserStore>);

      renderWithRouter(['owner', 'admin'], { showForbidden: true });

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('You do not have permission to access this page.')).toBeInTheDocument();
    });

    it('shows custom forbidden message', () => {
      vi.mocked(useUserStore).mockReturnValue({
        user: { ...mockUser, id: 'user-3' }, // member role
      } as unknown as ReturnType<typeof useUserStore>);

      renderWithRouter(['owner', 'admin'], {
        showForbidden: true,
        forbiddenMessage: 'Only admins can access this feature.',
      });

      expect(screen.getByText('Only admins can access this feature.')).toBeInTheDocument();
    });

    it('shows forbidden message when user is not a member and showForbidden is true', () => {
      vi.mocked(useUserStore).mockReturnValue({
        user: { ...mockUser, id: 'user-999' }, // not a member
      } as unknown as ReturnType<typeof useUserStore>);

      renderWithRouter(['owner'], { showForbidden: true });

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
  });

  describe('Custom Redirect', () => {
    it('redirects to custom path when specified', () => {
      vi.mocked(useUserStore).mockReturnValue({
        user: { ...mockUser, id: 'user-3' }, // member role
      } as unknown as ReturnType<typeof useUserStore>);

      renderWithRouter(['owner', 'admin'], { redirectTo: '/custom-redirect' });

      expect(screen.getByText('Custom Redirect Page')).toBeInTheDocument();
    });
  });

  describe('All Roles Allowed', () => {
    it('grants access when all roles are allowed', () => {
      renderWithRouter(['owner', 'admin', 'member']);

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('grants access to member when all roles allowed', () => {
      vi.mocked(useUserStore).mockReturnValue({
        user: { ...mockUser, id: 'user-3' },
      } as unknown as ReturnType<typeof useUserStore>);

      renderWithRouter(['owner', 'admin', 'member']);

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });
});
