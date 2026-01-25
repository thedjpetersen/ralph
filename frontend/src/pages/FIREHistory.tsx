import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAccountStore } from '../stores/account';
import { PageTransition } from '../components/PageTransition';
import { toast } from '../stores/toast';
import {
  type SavedCalculation,
  getStoredCalculations,
  deleteCalculation,
  clearAllCalculations,
} from '../utils/fireCalculations';
import './FIREHistory.css';

export function FIREHistory() {
  const { currentAccount } = useAccountStore();

  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Memoize calculations based on account and refresh key
  const calculations: SavedCalculation[] = useMemo(() => {
    const stored = getStoredCalculations();
    // Filter to current account if one is selected
    if (currentAccount?.id) {
      return stored.filter(c => c.accountId === currentAccount.id);
    }
    return stored;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccount?.id, refreshKey]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === calculations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(calculations.map(c => c.id)));
    }
  }, [calculations, selectedIds.size]);

  const handleDeleteSelected = useCallback(() => {
    selectedIds.forEach(id => deleteCalculation(id));
    setRefreshKey(prev => prev + 1);
    setSelectedIds(new Set());
    toast.success(`Deleted ${selectedIds.size} calculation(s)`);
  }, [selectedIds]);

  const handleDeleteSingle = useCallback((id: string) => {
    deleteCalculation(id);
    setRefreshKey(prev => prev + 1);
    toast.success('Calculation deleted');
  }, []);

  const handleClearAll = useCallback(() => {
    clearAllCalculations();
    setRefreshKey(prev => prev + 1);
    setSelectedIds(new Set());
    setShowDeleteConfirm(false);
    toast.success('All calculations cleared');
  }, []);

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="fire-history-page">
          <div className="fire-history-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to view calculation history.</p>
            <Link to="/accounts" className="select-account-link">
              Select an Account
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="fire-history-page">
        <div className="fire-history-header">
          <div className="fire-history-header-row">
            <div>
              <h1>FIRE Calculator History</h1>
              <p className="fire-history-subtitle">
                Review your past FIRE calculations
              </p>
            </div>
            <div className="header-actions">
              <Link to="/fire-calculator" className="calculator-link">
                New Calculation
              </Link>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        {calculations.length > 0 && (
          <div className="fire-history-actions">
            <div className="select-actions">
              <label className="select-all-label">
                <input
                  type="checkbox"
                  checked={selectedIds.size === calculations.length && calculations.length > 0}
                  onChange={handleSelectAll}
                />
                <span>Select All</span>
              </label>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="delete-selected-button"
                >
                  Delete Selected ({selectedIds.size})
                </button>
              )}
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="clear-all-button"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Calculations List */}
        {calculations.length === 0 ? (
          <div className="fire-history-empty">
            <div className="empty-icon">$</div>
            <h3>No Saved Calculations</h3>
            <p>
              Your FIRE calculations will appear here after you run them.
              Calculations are saved automatically when you use the calculator.
            </p>
            <Link to="/fire-calculator" className="calculator-link">
              Start Calculating
            </Link>
          </div>
        ) : (
          <div className="calculations-list">
            {calculations.map((calc) => (
              <div key={calc.id} className={`calculation-card ${selectedIds.has(calc.id) ? 'selected' : ''}`}>
                <div className="calculation-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(calc.id)}
                    onChange={() => handleSelect(calc.id)}
                  />
                </div>
                <div className="calculation-content">
                  <div className="calculation-header">
                    <div className="calculation-meta">
                      <span className="calculation-date">{formatDate(calc.timestamp)}</span>
                      {calc.planName && (
                        <span className="calculation-plan">{calc.planName}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteSingle(calc.id)}
                      className="delete-button"
                      title="Delete this calculation"
                    >
                      &times;
                    </button>
                  </div>

                  <div className="calculation-results">
                    <div className="result-item main">
                      <span className="result-label">FIRE Number</span>
                      <span className="result-value fire-number">{formatCurrency(calc.results.fireNumber)}</span>
                    </div>
                    {calc.results.currentPortfolio !== undefined && (
                      <div className="result-item">
                        <span className="result-label">Current</span>
                        <span className="result-value">{formatCurrency(calc.results.currentPortfolio)}</span>
                      </div>
                    )}
                    {calc.results.percentageComplete !== undefined && (
                      <div className="result-item">
                        <span className="result-label">Progress</span>
                        <span className="result-value progress">{calc.results.percentageComplete.toFixed(1)}%</span>
                      </div>
                    )}
                    {calc.results.yearsToFire !== undefined && (
                      <div className="result-item">
                        <span className="result-label">Years to FIRE</span>
                        <span className="result-value">{calc.results.yearsToFire}</span>
                      </div>
                    )}
                    {calc.results.successRate !== undefined && (
                      <div className="result-item">
                        <span className="result-label">Success Rate</span>
                        <span className={`result-value ${calc.results.successRate >= 0.9 ? 'success-high' : calc.results.successRate >= 0.75 ? 'success-medium' : 'success-low'}`}>
                          {(calc.results.successRate * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="calculation-inputs">
                    <span className="input-item">
                      Spending: {formatCurrency(calc.inputs.annualSpending)}/yr
                    </span>
                    <span className="input-item">
                      SWR: {calc.inputs.safeWithdrawalRate}%
                    </span>
                    <span className="input-item">
                      Return: {calc.inputs.expectedReturnRate}%
                    </span>
                    <span className="input-item">
                      Contribution: {formatCurrency(calc.inputs.monthlyContribution)}/mo
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>Clear All Calculations?</h3>
              <p>This will permanently delete all {calculations.length} saved calculations. This action cannot be undone.</p>
              <div className="modal-actions">
                <button onClick={() => setShowDeleteConfirm(false)} className="cancel-button">
                  Cancel
                </button>
                <button onClick={handleClearAll} className="confirm-delete-button">
                  Delete All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

