import { Link } from 'react-router-dom';
import { useId } from 'react';
import './QuickActions.css';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  href: string;
  color: string;
}

const DEFAULT_ACTIONS: QuickAction[] = [
  {
    id: 'upload-receipt',
    label: 'Upload Receipt',
    description: 'Scan or upload a receipt',
    icon: '^',
    href: '/receipts/upload',
    color: '#2ecc71',
  },
  {
    id: 'add-transaction',
    label: 'Add Transaction',
    description: 'Record a new transaction',
    icon: '+',
    href: '/transactions/new',
    color: '#646cff',
  },
  {
    id: 'view-budgets',
    label: 'View Budgets',
    description: 'Check your budget progress',
    icon: '$',
    href: '/budgets',
    color: '#f1c40f',
  },
  {
    id: 'connect-account',
    label: 'Connect Account',
    description: 'Link a bank account',
    icon: 'B',
    href: '/accounts/connect',
    color: '#3498db',
  },
];

interface QuickActionsProps {
  actions?: QuickAction[];
  isLoading?: boolean;
}

export function QuickActions({
  actions = DEFAULT_ACTIONS,
  isLoading,
}: QuickActionsProps) {
  const headingId = useId();

  if (isLoading) {
    return (
      <section
        className="quick-actions"
        aria-labelledby={headingId}
        aria-busy="true"
      >
        <div className="quick-actions-header">
          <h3 id={headingId}>Quick Actions</h3>
        </div>
        <div
          className="quick-actions-grid"
          role="list"
          aria-label="Loading quick actions"
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="quick-action-item skeleton"
              role="listitem"
              aria-hidden="true"
            >
              <div className="skeleton-icon" />
              <div className="skeleton-content">
                <div className="skeleton-title" />
                <div className="skeleton-subtitle" />
              </div>
            </div>
          ))}
        </div>
        <span className="sr-only" role="status">Loading quick actions</span>
      </section>
    );
  }

  return (
    <section
      className="quick-actions"
      aria-labelledby={headingId}
    >
      <div className="quick-actions-header">
        <h3 id={headingId}>Quick Actions</h3>
      </div>
      <nav
        className="quick-actions-grid"
        role="navigation"
        aria-label="Quick actions"
      >
        {actions.map((action) => (
          <Link
            key={action.id}
            to={action.href}
            className="quick-action-item"
            aria-label={`${action.label}: ${action.description}`}
          >
            <div
              className="quick-action-icon"
              style={{ backgroundColor: `${action.color}20`, color: action.color }}
              aria-hidden="true"
            >
              <span>{action.icon}</span>
            </div>
            <div className="quick-action-content">
              <span className="quick-action-label">{action.label}</span>
              <span className="quick-action-description">{action.description}</span>
            </div>
          </Link>
        ))}
      </nav>
    </section>
  );
}
