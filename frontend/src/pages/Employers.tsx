import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { usePaychecksStore, type Employer, type EmployerStatus } from '../stores/paychecks';
import { useAccountStore } from '../stores/account';
import { PageTransition } from '../components/PageTransition';
import { AccountsListSkeleton } from '../components/skeletons';
import { toast } from '../stores/toast';
import './Employers.css';

const STATUS_OPTIONS: { value: EmployerStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

interface EmployerFormData {
  name: string;
  display_name: string;
  ein: string;
  phone: string;
  email: string;
  website: string;
}

const initialFormData: EmployerFormData = {
  name: '',
  display_name: '',
  ein: '',
  phone: '',
  email: '',
  website: '',
};

export function Employers() {
  const { currentAccount } = useAccountStore();
  const {
    employers,
    isLoading,
    error,
    fetchEmployers,
    createEmployer,
    updateEmployer,
    deleteEmployer,
  } = usePaychecksStore();

  const [statusFilter, setStatusFilter] = useState<EmployerStatus | ''>('');
  const [isAdding, setIsAdding] = useState(false);
  const [newEmployer, setNewEmployer] = useState<EmployerFormData>(initialFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EmployerFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentAccount?.id) {
      fetchEmployers(currentAccount.id, {
        status: statusFilter || undefined,
      });
    }
  }, [currentAccount?.id, statusFilter, fetchEmployers]);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as EmployerStatus | '');
  }, []);

  const handleNewEmployerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewEmployer((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddEmployer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount?.id) return;

    if (!newEmployer.name.trim()) {
      toast.error('Employer name is required');
      return;
    }

    setIsSaving(true);
    try {
      await createEmployer(currentAccount.id, {
        name: newEmployer.name.trim(),
        display_name: newEmployer.display_name.trim() || undefined,
        ein: newEmployer.ein.trim() || undefined,
        phone: newEmployer.phone.trim() || undefined,
        email: newEmployer.email.trim() || undefined,
        website: newEmployer.website.trim() || undefined,
      });
      setNewEmployer(initialFormData);
      setIsAdding(false);
      toast.success('Employer added');
    } catch {
      toast.error('Failed to add employer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (employer: Employer) => {
    setEditingId(employer.id);
    setEditForm({
      name: employer.name,
      display_name: employer.display_name || '',
      ein: employer.ein || '',
      phone: employer.phone || '',
      email: employer.email || '',
      website: employer.website || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(initialFormData);
  };

  const handleSaveEdit = async (e: React.FormEvent, employerId: string) => {
    e.preventDefault();
    if (!currentAccount?.id) return;

    if (!editForm.name.trim()) {
      toast.error('Employer name is required');
      return;
    }

    setIsSaving(true);
    try {
      await updateEmployer(currentAccount.id, employerId, {
        name: editForm.name.trim(),
        display_name: editForm.display_name.trim() || undefined,
        ein: editForm.ein.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        email: editForm.email.trim() || undefined,
        website: editForm.website.trim() || undefined,
      });
      setEditingId(null);
      toast.success('Employer updated');
    } catch {
      toast.error('Failed to update employer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (employer: Employer) => {
    if (!currentAccount?.id) return;

    const newStatus = employer.status === 'active' ? 'inactive' : 'active';
    try {
      await updateEmployer(currentAccount.id, employer.id, { status: newStatus });
      toast.success(`Employer marked as ${newStatus}`);
    } catch {
      toast.error('Failed to update employer status');
    }
  };

  const handleDelete = async (employerId: string) => {
    if (!currentAccount?.id) return;
    if (!confirm('Are you sure you want to delete this employer? This may affect associated paychecks.')) return;

    try {
      await deleteEmployer(currentAccount.id, employerId);
      toast.success('Employer deleted');
    } catch {
      toast.error('Failed to delete employer');
    }
  };

  const getStatusClass = (status: EmployerStatus) => {
    return status === 'active' ? 'status-active' : 'status-inactive';
  };

  const filteredEmployers = statusFilter
    ? employers.filter((e) => e.status === statusFilter)
    : employers;

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="employers-page">
          <div className="employers-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to manage employers.</p>
            <Link to="/accounts" className="select-account-link">
              Select an Account
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading && employers.length === 0) {
    return (
      <PageTransition>
        <div className="employers-page">
          <div className="employers-header">
            <h1>Employers</h1>
            <p className="employers-subtitle">Manage your employers</p>
          </div>
          <AccountsListSkeleton count={4} />
        </div>
      </PageTransition>
    );
  }

  if (error && employers.length === 0) {
    return (
      <PageTransition>
        <div className="employers-page">
          <div className="employers-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button
              onClick={() => fetchEmployers(currentAccount.id)}
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
      <div className="employers-page">
        <div className="employers-header">
          <div className="employers-header-row">
            <div>
              <h1>Employers</h1>
              <p className="employers-subtitle">Manage your employers</p>
            </div>
            <div className="header-actions">
              <Link to="/paychecks" className="view-paychecks-button">
                View Paychecks
              </Link>
              {!isAdding && (
                <button onClick={() => setIsAdding(true)} className="add-employer-button">
                  Add Employer
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="employers-filters">
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
        </div>

        {isAdding && (
          <form onSubmit={handleAddEmployer} className="employer-form">
            <h3>Add New Employer</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={newEmployer.name}
                  onChange={handleNewEmployerChange}
                  required
                  className="form-input"
                  placeholder="Company name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="display_name">Display Name</label>
                <input
                  type="text"
                  id="display_name"
                  name="display_name"
                  value={newEmployer.display_name}
                  onChange={handleNewEmployerChange}
                  className="form-input"
                  placeholder="Short name (optional)"
                />
              </div>
              <div className="form-group">
                <label htmlFor="ein">EIN</label>
                <input
                  type="text"
                  id="ein"
                  name="ein"
                  value={newEmployer.ein}
                  onChange={handleNewEmployerChange}
                  className="form-input"
                  placeholder="XX-XXXXXXX"
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={newEmployer.phone}
                  onChange={handleNewEmployerChange}
                  className="form-input"
                  placeholder="(555) 555-5555"
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={newEmployer.email}
                  onChange={handleNewEmployerChange}
                  className="form-input"
                  placeholder="hr@company.com"
                />
              </div>
              <div className="form-group">
                <label htmlFor="website">Website</label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={newEmployer.website}
                  onChange={handleNewEmployerChange}
                  className="form-input"
                  placeholder="https://company.com"
                />
              </div>
            </div>
            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setNewEmployer(initialFormData);
                }}
                className="cancel-button"
              >
                Cancel
              </button>
              <button type="submit" className="save-button" disabled={isSaving}>
                {isSaving ? 'Adding...' : 'Add Employer'}
              </button>
            </div>
          </form>
        )}

        {filteredEmployers.length === 0 ? (
          <div className="employers-empty">
            <h2>No Employers Found</h2>
            <p>
              {statusFilter
                ? 'No employers match your filter criteria.'
                : "You haven't added any employers yet."}
            </p>
            {!statusFilter && !isAdding && (
              <button onClick={() => setIsAdding(true)} className="add-employer-link">
                Add your first employer
              </button>
            )}
          </div>
        ) : (
          <div className="employers-list">
            {filteredEmployers.map((employer) =>
              editingId === employer.id ? (
                <form
                  key={employer.id}
                  onSubmit={(e) => handleSaveEdit(e, employer.id)}
                  className="employer-card editing"
                >
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={editForm.name}
                        onChange={handleEditChange}
                        required
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Display Name</label>
                      <input
                        type="text"
                        name="display_name"
                        value={editForm.display_name}
                        onChange={handleEditChange}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>EIN</label>
                      <input
                        type="text"
                        name="ein"
                        value={editForm.ein}
                        onChange={handleEditChange}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={editForm.phone}
                        onChange={handleEditChange}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        name="email"
                        value={editForm.email}
                        onChange={handleEditChange}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Website</label>
                      <input
                        type="url"
                        name="website"
                        value={editForm.website}
                        onChange={handleEditChange}
                        className="form-input"
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="button" onClick={handleCancelEdit} className="cancel-button">
                      Cancel
                    </button>
                    <button type="submit" className="save-button" disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              ) : (
                <div key={employer.id} className="employer-card">
                  <div className="employer-info">
                    <div className="employer-main">
                      <h3 className="employer-name">
                        {employer.display_name || employer.name}
                      </h3>
                      {employer.display_name && (
                        <span className="employer-legal-name">{employer.name}</span>
                      )}
                      <span className={`employer-status ${getStatusClass(employer.status)}`}>
                        {employer.status}
                      </span>
                    </div>
                    <div className="employer-details">
                      {employer.ein && (
                        <span className="detail-item">EIN: {employer.ein}</span>
                      )}
                      {employer.phone && (
                        <span className="detail-item">{employer.phone}</span>
                      )}
                      {employer.email && (
                        <span className="detail-item">{employer.email}</span>
                      )}
                      {employer.website && (
                        <a
                          href={employer.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="detail-item website-link"
                        >
                          Website
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="employer-actions">
                    <button onClick={() => handleStartEdit(employer)} className="edit-btn">
                      Edit
                    </button>
                    <button onClick={() => handleToggleStatus(employer)} className="toggle-btn">
                      {employer.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => handleDelete(employer.id)} className="delete-btn">
                      Delete
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
