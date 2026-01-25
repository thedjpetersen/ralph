import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePaychecksStore, type PaycheckStatus } from '../stores/paychecks';
import { useAccountStore } from '../stores/account';
import { PageTransition } from '../components/PageTransition';
import { SettingsFormSkeleton } from '../components/skeletons';
import { EarningsTable } from '../components/EarningsTable';
import { DeductionsTable } from '../components/DeductionsTable';
import { toast } from '../stores/toast';
import './PaycheckDetail.css';

export function PaycheckDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentAccount } = useAccountStore();
  const {
    currentPaycheck,
    isLoading,
    error,
    fetchPaycheckDetails,
    deletePaycheck,
    markPaycheckReviewed,
  } = usePaychecksStore();

  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  useEffect(() => {
    if (currentAccount?.id && id) {
      fetchPaycheckDetails(currentAccount.id, id);
    }
  }, [currentAccount?.id, id, fetchPaycheckDetails]);

  const handleDelete = async () => {
    if (!currentAccount?.id || !id) return;
    if (!confirm('Are you sure you want to delete this paycheck?')) return;

    setIsDeleting(true);
    try {
      await deletePaycheck(currentAccount.id, id);
      toast.success('Paycheck deleted successfully');
      navigate('/paychecks');
    } catch {
      toast.error('Failed to delete paycheck');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkReviewed = async () => {
    if (!currentAccount?.id || !id) return;

    setIsMarking(true);
    try {
      await markPaycheckReviewed(currentAccount.id, id);
      toast.success('Paycheck marked as reviewed');
    } catch {
      toast.error('Failed to mark paycheck as reviewed');
    } finally {
      setIsMarking(false);
    }
  };

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
      month: 'long',
      day: 'numeric',
    });
  };

  const formatFrequency = (frequency?: string) => {
    if (!frequency) return 'Not specified';
    const labels: Record<string, string> = {
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      semimonthly: 'Semi-monthly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      annual: 'Annual',
      other: 'Other',
    };
    return labels[frequency] || frequency;
  };

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="paycheck-detail-page">
          <div className="paycheck-detail-error">
            <h2>No Account Selected</h2>
            <Link to="/accounts">Select an Account</Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading && !currentPaycheck) {
    return (
      <PageTransition>
        <div className="paycheck-detail-page">
          <SettingsFormSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (error || !currentPaycheck) {
    return (
      <PageTransition>
        <div className="paycheck-detail-page">
          <div className="paycheck-detail-error">
            <h2>Error</h2>
            <p>{error || 'Paycheck not found'}</p>
            <Link to="/paychecks">Back to Paychecks</Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="paycheck-detail-page">
        <div className="paycheck-detail-header">
          <Link to="/paychecks" className="back-link">
            &larr; Back to Paychecks
          </Link>
          <div className="header-content">
            <div className="header-info">
              <h1>{currentPaycheck.employer_name || 'Paycheck'}</h1>
              <p className="pay-date">{formatDate(currentPaycheck.pay_date)}</p>
            </div>
            <div className="header-actions">
              {currentPaycheck.needs_review && (
                <button
                  onClick={handleMarkReviewed}
                  className="mark-reviewed-button"
                  disabled={isMarking}
                >
                  {isMarking ? 'Marking...' : 'Mark as Reviewed'}
                </button>
              )}
              <Link to={`/paychecks/${id}/edit`} className="edit-button">
                Edit
              </Link>
              <button
                onClick={handleDelete}
                className="delete-button"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>

        <div className="paycheck-detail-content">
          <div className="summary-section">
            <div className="summary-card">
              <h3>Gross Pay</h3>
              <p className="amount amount-gross">
                {formatAmount(currentPaycheck.gross_pay, currentPaycheck.currency)}
              </p>
            </div>
            <div className="summary-card">
              <h3>Total Deductions</h3>
              <p className="amount amount-deductions">
                -{formatAmount(currentPaycheck.total_deductions, currentPaycheck.currency)}
              </p>
            </div>
            <div className="summary-card">
              <h3>Total Taxes</h3>
              <p className="amount amount-taxes">
                -{formatAmount(currentPaycheck.total_taxes, currentPaycheck.currency)}
              </p>
            </div>
            <div className="summary-card highlight">
              <h3>Net Pay</h3>
              <p className="amount amount-net">
                {formatAmount(currentPaycheck.net_pay, currentPaycheck.currency)}
              </p>
            </div>
          </div>

          <div className="details-section">
            <div className="info-grid">
              <div className="info-item">
                <label>Status</label>
                <span className={`paycheck-status ${getStatusClass(currentPaycheck.status)}`}>
                  {currentPaycheck.status}
                </span>
              </div>
              <div className="info-item">
                <label>Pay Period</label>
                <span>
                  {formatDate(currentPaycheck.pay_period_start)} - {formatDate(currentPaycheck.pay_period_end)}
                </span>
              </div>
              <div className="info-item">
                <label>Pay Frequency</label>
                <span>{formatFrequency(currentPaycheck.pay_frequency)}</span>
              </div>
              {currentPaycheck.check_number && (
                <div className="info-item">
                  <label>Check Number</label>
                  <span>{currentPaycheck.check_number}</span>
                </div>
              )}
              {currentPaycheck.direct_deposit_account && (
                <div className="info-item">
                  <label>Direct Deposit Account</label>
                  <span>{currentPaycheck.direct_deposit_account}</span>
                </div>
              )}
              {currentPaycheck.needs_review && (
                <div className="info-item">
                  <label>Review Status</label>
                  <span className="review-badge">Needs Review</span>
                </div>
              )}
              {currentPaycheck.reviewed_at && (
                <div className="info-item">
                  <label>Reviewed At</label>
                  <span>{formatDate(currentPaycheck.reviewed_at)}</span>
                </div>
              )}
            </div>

            {currentPaycheck.notes && (
              <div className="notes-section">
                <h3>Notes</h3>
                <p>{currentPaycheck.notes}</p>
              </div>
            )}
          </div>

          <div className="breakdown-section">
            <div className="breakdown-card">
              <h3>Earnings</h3>
              <EarningsTable
                earnings={currentPaycheck.earnings}
                paycheckId={currentPaycheck.id}
                currency={currentPaycheck.currency}
              />
            </div>

            <div className="breakdown-card">
              <h3>Deductions</h3>
              <DeductionsTable
                deductions={currentPaycheck.deductions}
                paycheckId={currentPaycheck.id}
                currency={currentPaycheck.currency}
              />
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
