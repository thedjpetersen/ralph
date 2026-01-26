import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAccountStore } from '../stores/account';
import { useBillsStore, type Bill, type BillStatus, type BillFrequency } from '../stores/bills';
import { PageTransition } from '../components/PageTransition';
import { AccountsListSkeleton } from '../components/skeletons';
import { Modal } from '../components/ui/Modal';
import { toast } from '../stores/toast';
import { announce } from '../stores/announcer';
import type { CreateBillRequest, UpdateBillRequest } from '../api/bills';
import './Bills.css';

const STATUS_OPTIONS: { value: BillStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'due', label: 'Due' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

const FREQUENCY_OPTIONS: { value: BillFrequency; label: string }[] = [
  { value: 'once', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const FREQUENCY_LABELS: Record<BillFrequency, string> = {
  once: 'One-time',
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const REMINDER_OPTIONS = [
  { value: 0, label: 'Same day' },
  { value: 1, label: '1 day before' },
  { value: 3, label: '3 days before' },
  { value: 7, label: '1 week before' },
  { value: 14, label: '2 weeks before' },
  { value: 30, label: '1 month before' },
];

type ViewMode = 'list' | 'calendar';

interface BillFormData {
  payee_name: string;
  description: string;
  amount: string;
  currency: string;
  due_date: string;
  is_recurring: boolean;
  frequency: BillFrequency;
  reminder_days_before: number;
  reminder_enabled: boolean;
  category: string;
  notes: string;
  auto_pay: boolean;
  payment_method: string;
}

const initialFormData: BillFormData = {
  payee_name: '',
  description: '',
  amount: '',
  currency: 'USD',
  due_date: '',
  is_recurring: false,
  frequency: 'monthly',
  reminder_days_before: 3,
  reminder_enabled: true,
  category: '',
  notes: '',
  auto_pay: false,
  payment_method: '',
};

// Calendar helper functions
function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  // Add days from previous month to fill the first week
  const startDayOfWeek = firstDay.getDay();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const prevDay = new Date(year, month, -i);
    days.push(prevDay);
  }

  // Add all days of current month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day));
  }

  // Add days from next month to complete the last week
  const endDayOfWeek = lastDay.getDay();
  for (let i = 1; i <= 6 - endDayOfWeek; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function Bills() {
  const navigate = useNavigate();
  const { currentAccount } = useAccountStore();
  const { bills, isLoading, error, fetchBills, createBill, updateBill, deleteBill, markAsPaid, markAsUnpaid } = useBillsStore();

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Filter states
  const [statusFilter, setStatusFilter] = useState<BillStatus | ''>('');
  const [recurringFilter, setRecurringFilter] = useState<'' | 'true' | 'false'>('');
  const [payeeFilter, setPayeeFilter] = useState('');
  const prevBillCountRef = useRef<number | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [deletingBill, setDeletingBill] = useState<Bill | null>(null);
  const [reminderBill, setReminderBill] = useState<Bill | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<BillFormData>(initialFormData);

  // Fetch bills when account changes
  useEffect(() => {
    if (currentAccount?.id) {
      fetchBills(currentAccount.id, {
        status: statusFilter || undefined,
        is_recurring: recurringFilter ? recurringFilter === 'true' : undefined,
      });
    }
  }, [currentAccount?.id, statusFilter, recurringFilter, fetchBills]);

  // Announce filter results to screen readers
  useEffect(() => {
    if (prevBillCountRef.current !== null && prevBillCountRef.current !== bills.length) {
      const message = bills.length === 0
        ? 'No bills found matching your filters'
        : `Showing ${bills.length} bill${bills.length === 1 ? '' : 's'}`;
      announce(message);
    }
    prevBillCountRef.current = bills.length;
  }, [bills.length]);

  // Extract unique payees for filter dropdown
  const uniquePayees = useMemo(() => {
    return Array.from(new Set(bills.map(b => b.payee_name).filter(Boolean))).sort();
  }, [bills]);

  // Client-side filtering
  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      if (payeeFilter && bill.payee_name !== payeeFilter) return false;
      return true;
    });
  }, [bills, payeeFilter]);

  // Sort bills by due date
  const sortedBills = useMemo(() => {
    return [...filteredBills].sort((a, b) => {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [filteredBills]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const unpaidBills = filteredBills.filter(b => b.status !== 'paid' && b.status !== 'cancelled');
    const paidBills = filteredBills.filter(b => b.status === 'paid');
    const overdueBills = filteredBills.filter(b => b.status === 'overdue');
    const upcomingBills = filteredBills.filter(b => b.status === 'upcoming' || b.status === 'due');

    const totalUnpaid = unpaidBills.reduce((sum, b) => sum + b.amount, 0);
    const totalPaid = paidBills.reduce((sum, b) => sum + b.amount, 0);

    return {
      totalBills: filteredBills.length,
      unpaidCount: unpaidBills.length,
      paidCount: paidBills.length,
      overdueCount: overdueBills.length,
      upcomingCount: upcomingBills.length,
      totalUnpaid,
      totalPaid,
    };
  }, [filteredBills]);

  // Get bills for calendar view
  const calendarDays = useMemo(() => {
    return getMonthDays(calendarDate.getFullYear(), calendarDate.getMonth());
  }, [calendarDate]);

  const billsByDate = useMemo(() => {
    const map = new Map<string, Bill[]>();
    filteredBills.forEach(bill => {
      const dateKey = bill.due_date.split('T')[0];
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, bill]);
    });
    return map;
  }, [filteredBills]);

  // Handlers
  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as BillStatus | '');
  }, []);

  const handleRecurringChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setRecurringFilter(e.target.value as '' | 'true' | 'false');
  }, []);

  const handlePayeeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setPayeeFilter(e.target.value);
  }, []);

  const clearFilters = useCallback(() => {
    setStatusFilter('');
    setRecurringFilter('');
    setPayeeFilter('');
  }, []);

  const formatAmount = useCallback((amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }, []);

  const formatDate = useCallback((dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const getStatusClass = useCallback((status: BillStatus) => {
    switch (status) {
      case 'upcoming':
        return 'status-upcoming';
      case 'due':
        return 'status-due';
      case 'paid':
        return 'status-paid';
      case 'overdue':
        return 'status-overdue';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  }, []);

  const getDaysUntilDue = useCallback((dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, []);

  const getDueDateLabel = useCallback((dueDate: string, status: BillStatus) => {
    if (status === 'paid') return 'Paid';
    const days = getDaysUntilDue(dueDate);
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `Due in ${days} days`;
  }, [getDaysUntilDue]);

  // Form handlers
  const handleFormChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
  }, []);

  const openCreateModal = useCallback(() => {
    resetForm();
    setIsCreateModalOpen(true);
  }, [resetForm]);

  const openEditModal = useCallback((bill: Bill) => {
    setEditingBill(bill);
    setFormData({
      payee_name: bill.payee_name,
      description: bill.description || '',
      amount: bill.amount.toString(),
      currency: bill.currency,
      due_date: bill.due_date.split('T')[0],
      is_recurring: bill.is_recurring,
      frequency: bill.frequency || 'monthly',
      reminder_days_before: bill.reminder_days_before ?? 3,
      reminder_enabled: bill.reminder_enabled,
      category: bill.category || '',
      notes: bill.notes || '',
      auto_pay: bill.auto_pay,
      payment_method: bill.payment_method || '',
    });
    setIsEditModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((bill: Bill) => {
    setDeletingBill(bill);
    setIsDeleteModalOpen(true);
  }, []);

  const openReminderModal = useCallback((bill: Bill) => {
    setReminderBill(bill);
    setFormData(prev => ({
      ...prev,
      reminder_enabled: bill.reminder_enabled,
      reminder_days_before: bill.reminder_days_before ?? 3,
    }));
    setIsReminderModalOpen(true);
  }, []);

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount?.id || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const createData: CreateBillRequest = {
        payee_name: formData.payee_name,
        description: formData.description || undefined,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        due_date: formData.due_date,
        is_recurring: formData.is_recurring,
        frequency: formData.is_recurring ? formData.frequency : undefined,
        reminder_days_before: formData.reminder_enabled ? formData.reminder_days_before : undefined,
        reminder_enabled: formData.reminder_enabled,
        category: formData.category || undefined,
        notes: formData.notes || undefined,
        auto_pay: formData.auto_pay,
        payment_method: formData.payment_method || undefined,
      };

      const newBill = await createBill(currentAccount.id, createData);
      setIsCreateModalOpen(false);
      resetForm();
      toast.success(`Bill "${newBill.payee_name}" created successfully`);
      announce(`Bill ${newBill.payee_name} created`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount?.id || !editingBill || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const updateData: UpdateBillRequest = {
        payee_name: formData.payee_name,
        description: formData.description || undefined,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        due_date: formData.due_date,
        is_recurring: formData.is_recurring,
        frequency: formData.is_recurring ? formData.frequency : undefined,
        reminder_days_before: formData.reminder_enabled ? formData.reminder_days_before : undefined,
        reminder_enabled: formData.reminder_enabled,
        category: formData.category || undefined,
        notes: formData.notes || undefined,
        auto_pay: formData.auto_pay,
        payment_method: formData.payment_method || undefined,
      };

      const updatedBill = await updateBill(currentAccount.id, editingBill.id, updateData);
      setIsEditModalOpen(false);
      setEditingBill(null);
      resetForm();
      toast.success(`Bill "${updatedBill.payee_name}" updated successfully`);
      announce(`Bill ${updatedBill.payee_name} updated`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBill = async () => {
    if (!currentAccount?.id || !deletingBill || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await deleteBill(currentAccount.id, deletingBill.id);
      setIsDeleteModalOpen(false);
      toast.success(`Bill "${deletingBill.payee_name}" deleted successfully`);
      announce(`Bill ${deletingBill.payee_name} deleted`);
      setDeletingBill(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsPaid = async (bill: Bill) => {
    if (!currentAccount?.id) return;

    try {
      await markAsPaid(currentAccount.id, bill.id);
      toast.success(`Bill "${bill.payee_name}" marked as paid`);
      announce(`Bill ${bill.payee_name} marked as paid`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark bill as paid');
    }
  };

  const handleMarkAsUnpaid = async (bill: Bill) => {
    if (!currentAccount?.id) return;

    try {
      await markAsUnpaid(currentAccount.id, bill.id);
      toast.success(`Bill "${bill.payee_name}" marked as unpaid`);
      announce(`Bill ${bill.payee_name} marked as unpaid`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark bill as unpaid');
    }
  };

  const handleUpdateReminders = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount?.id || !reminderBill || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const updateData: UpdateBillRequest = {
        reminder_enabled: formData.reminder_enabled,
        reminder_days_before: formData.reminder_enabled ? formData.reminder_days_before : undefined,
      };

      await updateBill(currentAccount.id, reminderBill.id, updateData);
      setIsReminderModalOpen(false);
      setReminderBill(null);
      toast.success('Reminder settings updated');
      announce('Reminder settings updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update reminder settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calendar navigation
  const goToPrevMonth = useCallback(() => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const goToToday = useCallback(() => {
    setCalendarDate(new Date());
  }, []);

  const hasActiveFilters = statusFilter !== '' || recurringFilter !== '' || payeeFilter !== '';

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="bills-page">
          <div className="bills-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to view bills.</p>
            <Link to="/accounts" className="select-account-link">
              Select an Account
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading && bills.length === 0) {
    return (
      <PageTransition>
        <div className="bills-page">
          <div className="bills-header">
            <h1>Bills</h1>
            <p className="bills-subtitle">Track and manage your recurring bills</p>
          </div>
          <AccountsListSkeleton count={6} />
        </div>
      </PageTransition>
    );
  }

  if (error && bills.length === 0) {
    return (
      <PageTransition>
        <div className="bills-page">
          <div className="bills-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => navigate(0)} className="retry-button">
              Retry
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="bills-page">
        <div className="bills-header">
          <div className="bills-header-row">
            <div>
              <h1>Bills</h1>
              <p className="bills-subtitle">Track and manage your recurring bills</p>
            </div>
            <div className="bills-header-actions">
              <div className="view-toggle" role="tablist" aria-label="View mode">
                <button
                  className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  role="tab"
                  aria-selected={viewMode === 'list'}
                  aria-controls="bills-list-view"
                >
                  List
                </button>
                <button
                  className={`view-toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
                  onClick={() => setViewMode('calendar')}
                  role="tab"
                  aria-selected={viewMode === 'calendar'}
                  aria-controls="bills-calendar-view"
                >
                  Calendar
                </button>
              </div>
              <button onClick={openCreateModal} className="create-bill-button">
                + New Bill
              </button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bills-summary">
          <div className="summary-card">
            <span className="summary-label">Total Unpaid</span>
            <span className="summary-value unpaid">{formatAmount(summaryStats.totalUnpaid)}</span>
            <span className="summary-count">{summaryStats.unpaidCount} bills</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Paid This Period</span>
            <span className="summary-value paid">{formatAmount(summaryStats.totalPaid)}</span>
            <span className="summary-count">{summaryStats.paidCount} bills</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Overdue</span>
            <span className="summary-value overdue">{summaryStats.overdueCount}</span>
            <span className="summary-count">bills</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Upcoming</span>
            <span className="summary-value upcoming">{summaryStats.upcomingCount}</span>
            <span className="summary-count">bills</span>
          </div>
        </div>

        {/* Filters */}
        <div className="bills-filters" role="search" aria-label="Filter bills">
          <div className="filter-row">
            <label htmlFor="status-filter" className="sr-only">Filter by status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={handleStatusChange}
              className="filter-select"
              aria-label="Filter by bill status"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <label htmlFor="recurring-filter" className="sr-only">Filter by type</label>
            <select
              id="recurring-filter"
              value={recurringFilter}
              onChange={handleRecurringChange}
              className="filter-select"
              aria-label="Filter by recurring type"
            >
              <option value="">All Types</option>
              <option value="true">Recurring</option>
              <option value="false">One-time</option>
            </select>

            <label htmlFor="payee-filter" className="sr-only">Filter by payee</label>
            <select
              id="payee-filter"
              value={payeeFilter}
              onChange={handlePayeeChange}
              className="filter-select"
              aria-label="Filter by payee"
            >
              <option value="">All Payees</option>
              {uniquePayees.map((payee) => (
                <option key={payee} value={payee}>
                  {payee}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="clear-filters-button" aria-label="Clear all filters">
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* List View */}
        {viewMode === 'list' && (
          <div id="bills-list-view" role="tabpanel" aria-labelledby="list-tab">
            {sortedBills.length === 0 ? (
              <div className="bills-empty">
                <span className="empty-icon" aria-hidden="true">📄</span>
                <h2>No Bills Found</h2>
                <p>
                  {hasActiveFilters
                    ? 'No bills match your filter criteria.'
                    : "You haven't added any bills yet."}
                </p>
                {!hasActiveFilters && (
                  <button onClick={openCreateModal} className="create-bill-link">
                    Add your first bill
                  </button>
                )}
              </div>
            ) : (
              <div className="bills-list" role="list" aria-label={`${sortedBills.length} bills`}>
                {sortedBills.map((bill) => {
                  const accessibleLabel = `${bill.payee_name}, ${formatAmount(bill.amount, bill.currency)}, ${getDueDateLabel(bill.due_date, bill.status)}, ${bill.status}`;

                  return (
                    <div
                      key={bill.id}
                      className={`bill-card ${bill.status === 'overdue' ? 'overdue' : ''}`}
                      role="listitem"
                      aria-label={accessibleLabel}
                    >
                      <div className="bill-card-main">
                        <div className="bill-card-info">
                          <div className="bill-card-header">
                            <h3 className="bill-payee">{bill.payee_name}</h3>
                            <span className={`bill-status ${getStatusClass(bill.status)}`}>
                              {bill.status}
                            </span>
                          </div>
                          {bill.description && (
                            <p className="bill-description">{bill.description}</p>
                          )}
                          <div className="bill-meta">
                            {bill.is_recurring && (
                              <span className="bill-recurring-badge">
                                {FREQUENCY_LABELS[bill.frequency || 'monthly']}
                              </span>
                            )}
                            {bill.category && (
                              <span className="bill-category">{bill.category}</span>
                            )}
                            {bill.auto_pay && (
                              <span className="bill-autopay-badge">Auto-pay</span>
                            )}
                          </div>
                        </div>
                        <div className="bill-card-amount">
                          <span className="bill-amount">{formatAmount(bill.amount, bill.currency)}</span>
                          <span className={`bill-due-label ${bill.status === 'overdue' ? 'overdue' : ''}`}>
                            {getDueDateLabel(bill.due_date, bill.status)}
                          </span>
                          <span className="bill-due-date">{formatDate(bill.due_date)}</span>
                        </div>
                      </div>
                      <div className="bill-card-actions">
                        {bill.status !== 'paid' && bill.status !== 'cancelled' && (
                          <button
                            onClick={() => handleMarkAsPaid(bill)}
                            className="bill-action-button mark-paid"
                            aria-label={`Mark ${bill.payee_name} as paid`}
                          >
                            Mark Paid
                          </button>
                        )}
                        {bill.status === 'paid' && (
                          <button
                            onClick={() => handleMarkAsUnpaid(bill)}
                            className="bill-action-button mark-unpaid"
                            aria-label={`Mark ${bill.payee_name} as unpaid`}
                          >
                            Mark Unpaid
                          </button>
                        )}
                        <button
                          onClick={() => openReminderModal(bill)}
                          className="bill-action-button reminder"
                          aria-label={`Configure reminders for ${bill.payee_name}`}
                        >
                          {bill.reminder_enabled ? 'Reminder On' : 'Set Reminder'}
                        </button>
                        <button
                          onClick={() => openEditModal(bill)}
                          className="bill-action-button edit"
                          aria-label={`Edit ${bill.payee_name}`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteModal(bill)}
                          className="bill-action-button delete"
                          aria-label={`Delete ${bill.payee_name}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div id="bills-calendar-view" role="tabpanel" aria-labelledby="calendar-tab">
            <div className="calendar-header">
              <button onClick={goToPrevMonth} className="calendar-nav-button" aria-label="Previous month">
                &lt;
              </button>
              <div className="calendar-title">
                <h2>{formatMonthYear(calendarDate)}</h2>
                <button onClick={goToToday} className="calendar-today-button">
                  Today
                </button>
              </div>
              <button onClick={goToNextMonth} className="calendar-nav-button" aria-label="Next month">
                &gt;
              </button>
            </div>
            <div className="calendar-grid">
              <div className="calendar-weekdays">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="calendar-weekday">{day}</div>
                ))}
              </div>
              <div className="calendar-days">
                {calendarDays.map((day, index) => {
                  const dateKey = day.toISOString().split('T')[0];
                  const dayBills = billsByDate.get(dateKey) || [];
                  const isCurrentMonth = day.getMonth() === calendarDate.getMonth();
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={index}
                      className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                    >
                      <span className="calendar-day-number">{day.getDate()}</span>
                      <div className="calendar-day-bills">
                        {dayBills.slice(0, 3).map(bill => (
                          <button
                            key={bill.id}
                            className={`calendar-bill ${getStatusClass(bill.status)}`}
                            onClick={() => openEditModal(bill)}
                            title={`${bill.payee_name}: ${formatAmount(bill.amount, bill.currency)}`}
                          >
                            <span className="calendar-bill-name">{bill.payee_name}</span>
                            <span className="calendar-bill-amount">{formatAmount(bill.amount, bill.currency)}</span>
                          </button>
                        ))}
                        {dayBills.length > 3 && (
                          <span className="calendar-more-bills">+{dayBills.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Create Bill Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Add New Bill"
          size="md"
        >
          <form onSubmit={handleCreateBill} className="bill-form">
            <div className="form-group">
              <label htmlFor="create-payee">Payee Name</label>
              <input
                id="create-payee"
                name="payee_name"
                type="text"
                value={formData.payee_name}
                onChange={handleFormChange}
                required
                placeholder="e.g., Electric Company"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="create-description">Description (optional)</label>
              <input
                id="create-description"
                name="description"
                type="text"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="e.g., Monthly electricity bill"
                className="form-input"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="create-amount">Amount</label>
                <input
                  id="create-amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={handleFormChange}
                  required
                  placeholder="0.00"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="create-due-date">Due Date</label>
                <input
                  id="create-due-date"
                  name="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={handleFormChange}
                  required
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group form-checkbox">
              <input
                id="create-recurring"
                name="is_recurring"
                type="checkbox"
                checked={formData.is_recurring}
                onChange={handleFormChange}
                className="form-checkbox-input"
              />
              <label htmlFor="create-recurring">This is a recurring bill</label>
            </div>

            {formData.is_recurring && (
              <div className="form-group">
                <label htmlFor="create-frequency">Frequency</label>
                <select
                  id="create-frequency"
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleFormChange}
                  className="form-select"
                >
                  {FREQUENCY_OPTIONS.map((freq) => (
                    <option key={freq.value} value={freq.value}>
                      {freq.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="create-category">Category (optional)</label>
                <input
                  id="create-category"
                  name="category"
                  type="text"
                  value={formData.category}
                  onChange={handleFormChange}
                  placeholder="e.g., Utilities"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="create-payment-method">Payment Method (optional)</label>
                <input
                  id="create-payment-method"
                  name="payment_method"
                  type="text"
                  value={formData.payment_method}
                  onChange={handleFormChange}
                  placeholder="e.g., Credit Card"
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group form-checkbox">
              <input
                id="create-reminder"
                name="reminder_enabled"
                type="checkbox"
                checked={formData.reminder_enabled}
                onChange={handleFormChange}
                className="form-checkbox-input"
              />
              <label htmlFor="create-reminder">Enable reminder notifications</label>
            </div>

            {formData.reminder_enabled && (
              <div className="form-group">
                <label htmlFor="create-reminder-days">Remind me</label>
                <select
                  id="create-reminder-days"
                  name="reminder_days_before"
                  value={formData.reminder_days_before}
                  onChange={handleFormChange}
                  className="form-select"
                >
                  {REMINDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group form-checkbox">
              <input
                id="create-autopay"
                name="auto_pay"
                type="checkbox"
                checked={formData.auto_pay}
                onChange={handleFormChange}
                className="form-checkbox-input"
              />
              <label htmlFor="create-autopay">Auto-pay is enabled for this bill</label>
            </div>

            <div className="form-group">
              <label htmlFor="create-notes">Notes (optional)</label>
              <textarea
                id="create-notes"
                name="notes"
                value={formData.notes}
                onChange={handleFormChange}
                placeholder="Add any additional notes..."
                className="form-textarea"
                rows={3}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="form-button cancel"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="form-button submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Add Bill'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Edit Bill Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingBill(null);
          }}
          title="Edit Bill"
          size="md"
        >
          <form onSubmit={handleUpdateBill} className="bill-form">
            <div className="form-group">
              <label htmlFor="edit-payee">Payee Name</label>
              <input
                id="edit-payee"
                name="payee_name"
                type="text"
                value={formData.payee_name}
                onChange={handleFormChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-description">Description (optional)</label>
              <input
                id="edit-description"
                name="description"
                type="text"
                value={formData.description}
                onChange={handleFormChange}
                className="form-input"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="edit-amount">Amount</label>
                <input
                  id="edit-amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={handleFormChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-due-date">Due Date</label>
                <input
                  id="edit-due-date"
                  name="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={handleFormChange}
                  required
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group form-checkbox">
              <input
                id="edit-recurring"
                name="is_recurring"
                type="checkbox"
                checked={formData.is_recurring}
                onChange={handleFormChange}
                className="form-checkbox-input"
              />
              <label htmlFor="edit-recurring">This is a recurring bill</label>
            </div>

            {formData.is_recurring && (
              <div className="form-group">
                <label htmlFor="edit-frequency">Frequency</label>
                <select
                  id="edit-frequency"
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleFormChange}
                  className="form-select"
                >
                  {FREQUENCY_OPTIONS.map((freq) => (
                    <option key={freq.value} value={freq.value}>
                      {freq.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="edit-category">Category (optional)</label>
                <input
                  id="edit-category"
                  name="category"
                  type="text"
                  value={formData.category}
                  onChange={handleFormChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-payment-method">Payment Method (optional)</label>
                <input
                  id="edit-payment-method"
                  name="payment_method"
                  type="text"
                  value={formData.payment_method}
                  onChange={handleFormChange}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group form-checkbox">
              <input
                id="edit-autopay"
                name="auto_pay"
                type="checkbox"
                checked={formData.auto_pay}
                onChange={handleFormChange}
                className="form-checkbox-input"
              />
              <label htmlFor="edit-autopay">Auto-pay is enabled for this bill</label>
            </div>

            <div className="form-group">
              <label htmlFor="edit-notes">Notes (optional)</label>
              <textarea
                id="edit-notes"
                name="notes"
                value={formData.notes}
                onChange={handleFormChange}
                className="form-textarea"
                rows={3}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingBill(null);
                }}
                className="form-button cancel"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="form-button submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingBill(null);
          }}
          title="Delete Bill"
          size="sm"
        >
          <div className="delete-confirmation">
            <p>
              Are you sure you want to delete the bill <strong>"{deletingBill?.payee_name}"</strong>?
              This action cannot be undone.
            </p>
            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingBill(null);
                }}
                className="form-button cancel"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBill}
                className="form-button delete"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Delete Bill'}
              </button>
            </div>
          </div>
        </Modal>

        {/* Reminder Configuration Modal */}
        <Modal
          isOpen={isReminderModalOpen}
          onClose={() => {
            setIsReminderModalOpen(false);
            setReminderBill(null);
          }}
          title="Configure Reminders"
          size="sm"
        >
          <form onSubmit={handleUpdateReminders} className="bill-form">
            <div className="reminder-bill-info">
              <strong>{reminderBill?.payee_name}</strong>
              <span>{reminderBill && formatAmount(reminderBill.amount, reminderBill.currency)}</span>
              <span>Due: {reminderBill && formatDate(reminderBill.due_date)}</span>
            </div>

            <div className="form-group form-checkbox">
              <input
                id="reminder-enabled"
                name="reminder_enabled"
                type="checkbox"
                checked={formData.reminder_enabled}
                onChange={handleFormChange}
                className="form-checkbox-input"
              />
              <label htmlFor="reminder-enabled">Enable reminder notifications</label>
            </div>

            {formData.reminder_enabled && (
              <div className="form-group">
                <label htmlFor="reminder-days">Remind me</label>
                <select
                  id="reminder-days"
                  name="reminder_days_before"
                  value={formData.reminder_days_before}
                  onChange={handleFormChange}
                  className="form-select"
                >
                  {REMINDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setIsReminderModalOpen(false);
                  setReminderBill(null);
                }}
                className="form-button cancel"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="form-button submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </PageTransition>
  );
}
