import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../../stores/user';
import { useAccountStore } from '../../stores/account';
import type { AccountMember } from '../../stores/account';

export type Role = AccountMember['role'];

export interface RequireRoleProps {
  /** Roles that are allowed to access the content */
  allowedRoles: Role[];
  /** Content to render if user has required role */
  children: ReactNode;
  /** Path to redirect to if unauthorized (default: /dashboard) */
  redirectTo?: string;
  /** Whether to show forbidden message instead of redirecting */
  showForbidden?: boolean;
  /** Custom forbidden message */
  forbiddenMessage?: string;
}

/**
 * Component to protect routes based on user role in the current account.
 * Checks the current user's role in the current account and either
 * renders children, redirects, or shows a forbidden message.
 */
export function RequireRole({
  allowedRoles,
  children,
  redirectTo = '/dashboard',
  showForbidden = false,
  forbiddenMessage = 'You do not have permission to access this page.',
}: RequireRoleProps) {
  const location = useLocation();
  const { user } = useUserStore();
  const { currentAccount, members, isLoading } = useAccountStore();

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <div className="require-role-loading">
        <div className="require-role-spinner" />
      </div>
    );
  }

  // If no user is logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If no account is selected, redirect
  if (!currentAccount) {
    return <Navigate to={redirectTo} replace />;
  }

  // Find the current user's membership in the current account
  const currentMember = members.find(
    (member) => member.userId === user.id && member.accountId === currentAccount.id
  );

  // If user is not a member of this account, deny access
  if (!currentMember) {
    if (showForbidden) {
      return (
        <div className="require-role-forbidden">
          <h2>Access Denied</h2>
          <p>{forbiddenMessage}</p>
        </div>
      );
    }
    return <Navigate to={redirectTo} replace />;
  }

  // Check if user's role is in the allowed roles list
  const hasRequiredRole = allowedRoles.includes(currentMember.role);

  if (!hasRequiredRole) {
    if (showForbidden) {
      return (
        <div className="require-role-forbidden">
          <h2>Access Denied</h2>
          <p>{forbiddenMessage}</p>
        </div>
      );
    }
    return <Navigate to={redirectTo} replace />;
  }

  // User has required role, render children
  return <>{children}</>;
}
