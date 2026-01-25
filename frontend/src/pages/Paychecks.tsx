import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { usePaychecksStore, type PaycheckStatus } from '../stores/paychecks';
import { useAccountStore } from '../stores/account';
import { PageTransition } from '../components/PageTransition';
import { AccountsListSkeleton } from '../components/skeletons';
import './Paychecks.css';

const STATUS_OPTIONS: { value: PaycheckStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processed', label: 'Processed' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'archived', label: 'Archived' },
];

const NEEDS_REVIEW_OPTIONS: { value: '' | 'true' | 'false'; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Needs Review' },
  { value: 'false', label: 'Reviewed' },
];

export function Paychecks() {
  const { currentAccount } = useAccountStore();
  const {
    paychecks,
    employers,
    isLoading,
    error,
    fetchPaychecks,
    fetchEmployers,
  } = usePaychecksStore();

  const [statusFilter, setStatusFilter] = useState<PaycheckStatus | ''>('');
  const [employerFilter, setEmployerFilter] = useState('');
  const [needsReviewFilter, setNeedsReviewFilter] = useState<'' | 'true' | 'false'>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Load paychecks when account or filters change
  useEffect(() => {
    if (currentAccount?.id) {
      fetchPaychecks(currentAccount.id, {
        status: statusFilter || undefined,
        employer_id: employerFilter || undefined,
        needs_review: needsReviewFilter ? needsReviewFilter === 'true' : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
    }
  }, [currentAccount?.id, statusFilter, employerFilter, needsReviewFilter, startDate, endDate, fetchPaychecks]);

  // Load employers for filter dropdown
  useEffect(() => {
    if (currentAccount?.id) {
      fetchEmployers(currentAccount.id);
    }
  }, [currentAccount?.id, fetchEmployers]);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as PaycheckStatus | '');
  }, []);

  const handleEmployerChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setEmployerFilter(e.target.value);
  }, []);

  const handleNeedsReviewChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setNeedsReviewFilter(e.target.value as '' | 'true' | 'false');
  }, []);

  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
  }, []);

  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
  }, []);

  const clearFilters = useCallback(() => {
    setStatusFilter('');
    setEmployerFilter('');
    setNeedsReviewFilter('');
    setStartDate('');
    setEndDate('');
  }, []);

  const getStatusClass = (status: PaycheckStatus) => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'processed':
        return 'status-processed';
      case 'reviewed':
        return 'status-reviewed';
      case 'archived':
        return 'status-archived';
      default:
        return '';
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const hasActiveFilters = statusFilter || employerFilter || needsReviewFilter || startDate || endDate;

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="paychecks-page">
          <div className="paychecks-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to view paychecks.</p>
            <Link to="/accounts" className="select-account-link">
              Select an Account
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading && paychecks.length === 0) {
    return (
      <PageTransition>
        <div className="paychecks-page">
          <div className="paychecks-header">
            <h1>Paychecks</h1>
            <p className="paychecks-subtitle">View and manage your paychecks</p>
          </div>
          <AccountsListSkeleton count={6} />
        </div>
      </PageTransition>
    );
  }

  if (error && paychecks.length === 0) {
    return (
      <PageTransition>
        <div className="paychecks-page">
          <div className="paychecks-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button
              onClick={() => fetchPaychecks(currentAccount.id)}
              className="retry-button"
            >
              Retry
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="paychecks-page">
        <div className="paychecks-header">
          <div className="paychecks-header-row">
            <div>
              <h1>Paychecks</h1>
              <p className="paychecks-subtitle">View and manage your paychecks</p>
            </div>
            <div className="header-actions">
              <Link to="/employers" className="manage-employers-button">
                Manage Employers
              </Link>
              <Link to="/paychecks/new" className="create-paycheck-button">
                Add Paycheck
              </Link>
            </div>
          </div>
        </div>

        <div className="paychecks-filters">
          <div className="filter-row">
            <div className="date-filter">
              <label htmlFor="start-date" className="filter-label">Pay Date From</label>
              <input
                type="date"
                id="start-date"
                value={startDate}
                onChange={handleStartDateChange}
                className="date-input"
              />
            </div>
            <div className="date-filter">
              <label htmlFor="end-date" className="filter-label">Pay Date To</label>
              <input
                type="date"
                id="end-date"
                value={endDate}
                onChange={handleEndDateChange}
                className="date-input"
              />
            </div>
            <select
              value={statusFilter}
              onChange={handleStatusChange}
              className="filter-select"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <select
              value={employerFilter}
              onChange={handleEmployerChange}
              className="filter-select"
            >
              <option value="">All Employers</option>
              {employers.map((employer) => (
                <option key={employer.id} value={employer.id}>
                  {employer.display_name || employer.name}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-row">
            <select
              value={needsReviewFilter}
              onChange={handleNeedsReviewChange}
              className="filter-select"
            >
              {NEEDS_REVIEW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="clear-filters-button">
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {paychecks.length === 0 ? (
          <div className="paychecks-empty">
            <h2>No Paychecks Found</h2>
            <p>
              {hasActiveFilters
                ? 'No paychecks match your filter criteria.'
                : "You don't have any paychecks yet."}
            </p>
            {!hasActiveFilters && (
              <Link to="/paychecks/new" className="create-paycheck-link">
                Add your first paycheck
              </Link>
            )}
          </div>
        ) : (
          <div className="paychecks-list">
            <div className="paychecks-table-header">
              <div className="table-col col-date">Pay Date</div>
              <div className="table-col col-employer">Employer</div>
              <div className="table-col col-period">Pay Period</div>
              <div className="table-col col-gross">Gross Pay</div>
              <div className="table-col col-net">Net Pay</div>
              <div className="table-col col-status">Status</div>
            </div>
            {paychecks.map((paycheck) => (
              <Link
                key={paycheck.id}
                to={`/paychecks/${paycheck.id}`}
                className={`paycheck-row ${paycheck.needs_review ? 'needs-review' : ''}`}
              >
                <div className="table-col col-date">
                  {formatDate(paycheck.pay_date)}
                </div>
                <div className="table-col col-employer">
                  <span className="employer-name">
                    {paycheck.employer_name || 'Unknown Employer'}
                  </span>
                  {paycheck.check_number && (
                    <span className="check-number">Check #{paycheck.check_number}</span>
                  )}
                </div>
                <div className="table-col col-period">
                  <span className="period-dates">
                    {formatDate(paycheck.pay_period_start)} - {formatDate(paycheck.pay_period_end)}
                  </span>
                </div>
                <div className="table-col col-gross">
                  <span className="amount-gross">
                    {formatAmount(paycheck.gross_pay, paycheck.currency)}
                  </span>
                </div>
                <div className="table-col col-net">
                  <span className="amount-net">
                    {formatAmount(paycheck.net_pay, paycheck.currency)}
                  </span>
                </div>
                <div className="table-col col-status">
                  <span className={`paycheck-status ${getStatusClass(paycheck.status)}`}>
                    {paycheck.status}
                  </span>
                  {paycheck.needs_review && (
                    <span className="review-badge">Review</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
