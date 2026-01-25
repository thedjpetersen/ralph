import { useState } from 'react';
import {
  usePaychecksStore,
  type PaycheckEarning,
  type AddEarningRequest,
} from '../stores/paychecks';
import { useAccountStore } from '../stores/account';
import { toast } from '../stores/toast';
import './EarningsTable.css';

const EARNING_TYPES = [
  { value: 'regular', label: 'Regular Pay' },
  { value: 'overtime', label: 'Overtime' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'commission', label: 'Commission' },
  { value: 'tips', label: 'Tips' },
  { value: 'holiday', label: 'Holiday Pay' },
  { value: 'vacation', label: 'Vacation Pay' },
  { value: 'sick', label: 'Sick Pay' },
  { value: 'pto', label: 'PTO' },
  { value: 'reimbursement', label: 'Reimbursement' },
  { value: 'other', label: 'Other' },
];

interface EarningsTableProps {
  earnings: PaycheckEarning[];
  paycheckId: string;
  currency: string;
}

interface NewEarningForm {
  type: string;
  description: string;
  hours: string;
  rate: string;
  amount: string;
  ytd_amount: string;
}

const initialNewEarning: NewEarningForm = {
  type: 'regular',
  description: '',
  hours: '',
  rate: '',
  amount: '',
  ytd_amount: '',
};

export function EarningsTable({ earnings, paycheckId, currency }: EarningsTableProps) {
  const { currentAccount } = useAccountStore();
  const { addEarning, updateEarning, deleteEarning } = usePaychecksStore();

  const [isAdding, setIsAdding] = useState(false);
  const [newEarning, setNewEarning] = useState<NewEarningForm>(initialNewEarning);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<NewEarningForm>(initialNewEarning);
  const [isSaving, setIsSaving] = useState(false);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const handleNewEarningChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewEarning((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddEarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount?.id) return;

    if (!newEarning.amount || parseFloat(newEarning.amount) <= 0) {
      toast.error('Amount is required');
      return;
    }

    setIsSaving(true);
    try {
      const data: AddEarningRequest = {
        type: newEarning.type,
        description: newEarning.description || undefined,
        hours: newEarning.hours ? parseFloat(newEarning.hours) : undefined,
        rate: newEarning.rate ? parseFloat(newEarning.rate) : undefined,
        amount: parseFloat(newEarning.amount),
        ytd_amount: newEarning.ytd_amount ? parseFloat(newEarning.ytd_amount) : undefined,
      };
      await addEarning(currentAccount.id, paycheckId, data);
      setNewEarning(initialNewEarning);
      setIsAdding(false);
      toast.success('Earning added');
    } catch {
      toast.error('Failed to add earning');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (earning: PaycheckEarning) => {
    setEditingId(earning.id);
    setEditForm({
      type: earning.type,
      description: earning.description || '',
      hours: earning.hours?.toString() || '',
      rate: earning.rate?.toString() || '',
      amount: earning.amount.toString(),
      ytd_amount: earning.ytd_amount?.toString() || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(initialNewEarning);
  };

  const handleSaveEdit = async (e: React.FormEvent, earningId: string) => {
    e.preventDefault();
    if (!currentAccount?.id) return;

    if (!editForm.amount || parseFloat(editForm.amount) <= 0) {
      toast.error('Amount is required');
      return;
    }

    setIsSaving(true);
    try {
      await updateEarning(currentAccount.id, paycheckId, earningId, {
        type: editForm.type,
        description: editForm.description || undefined,
        hours: editForm.hours ? parseFloat(editForm.hours) : undefined,
        rate: editForm.rate ? parseFloat(editForm.rate) : undefined,
        amount: parseFloat(editForm.amount),
        ytd_amount: editForm.ytd_amount ? parseFloat(editForm.ytd_amount) : undefined,
      });
      setEditingId(null);
      toast.success('Earning updated');
    } catch {
      toast.error('Failed to update earning');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (earningId: string) => {
    if (!currentAccount?.id) return;
    if (!confirm('Are you sure you want to delete this earning?')) return;

    try {
      await deleteEarning(currentAccount.id, paycheckId, earningId);
      toast.success('Earning deleted');
    } catch {
      toast.error('Failed to delete earning');
    }
  };

  const getTypeLabel = (type: string) => {
    const found = EARNING_TYPES.find((t) => t.value === type);
    return found?.label || type;
  };

  const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="earnings-table">
      {earnings.length === 0 && !isAdding ? (
        <div className="table-empty">
          <p>No earnings recorded</p>
          <button onClick={() => setIsAdding(true)} className="add-button">
            Add Earning
          </button>
        </div>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
                <th className="text-right">Hours</th>
                <th className="text-right">Rate</th>
                <th className="text-right">Amount</th>
                <th className="text-right">YTD</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((earning) =>
                editingId === earning.id ? (
                  <tr key={earning.id} className="edit-row">
                    <td colSpan={7}>
                      <form onSubmit={(e) => handleSaveEdit(e, earning.id)} className="inline-form">
                        <select
                          name="type"
                          value={editForm.type}
                          onChange={handleEditChange}
                          className="form-select"
                        >
                          {EARNING_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          name="description"
                          value={editForm.description}
                          onChange={handleEditChange}
                          placeholder="Description"
                          className="form-input"
                        />
                        <input
                          type="number"
                          name="hours"
                          value={editForm.hours}
                          onChange={handleEditChange}
                          placeholder="Hours"
                          step="0.01"
                          className="form-input input-small"
                        />
                        <input
                          type="number"
                          name="rate"
                          value={editForm.rate}
                          onChange={handleEditChange}
                          placeholder="Rate"
                          step="0.01"
                          className="form-input input-small"
                        />
                        <input
                          type="number"
                          name="amount"
                          value={editForm.amount}
                          onChange={handleEditChange}
                          placeholder="Amount"
                          required
                          step="0.01"
                          className="form-input input-small"
                        />
                        <input
                          type="number"
                          name="ytd_amount"
                          value={editForm.ytd_amount}
                          onChange={handleEditChange}
                          placeholder="YTD"
                          step="0.01"
                          className="form-input input-small"
                        />
                        <div className="inline-actions">
                          <button type="submit" className="save-btn" disabled={isSaving}>
                            Save
                          </button>
                          <button type="button" onClick={handleCancelEdit} className="cancel-btn">
                            Cancel
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={earning.id}>
                    <td>
                      <span className="earning-type">{getTypeLabel(earning.type)}</span>
                    </td>
                    <td>{earning.description || '-'}</td>
                    <td className="text-right">{earning.hours || '-'}</td>
                    <td className="text-right">
                      {earning.rate ? formatAmount(earning.rate) : '-'}
                    </td>
                    <td className="text-right amount">{formatAmount(earning.amount)}</td>
                    <td className="text-right ytd">
                      {earning.ytd_amount ? formatAmount(earning.ytd_amount) : '-'}
                    </td>
                    <td className="actions">
                      <button onClick={() => handleStartEdit(earning)} className="edit-btn">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(earning.id)} className="delete-btn">
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="total-label">
                  Total
                </td>
                <td className="text-right amount total-amount">{formatAmount(totalEarnings)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>

          {isAdding ? (
            <form onSubmit={handleAddEarning} className="add-form">
              <div className="form-row">
                <select
                  name="type"
                  value={newEarning.type}
                  onChange={handleNewEarningChange}
                  className="form-select"
                >
                  {EARNING_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  name="description"
                  value={newEarning.description}
                  onChange={handleNewEarningChange}
                  placeholder="Description"
                  className="form-input"
                />
                <input
                  type="number"
                  name="hours"
                  value={newEarning.hours}
                  onChange={handleNewEarningChange}
                  placeholder="Hours"
                  step="0.01"
                  className="form-input input-small"
                />
                <input
                  type="number"
                  name="rate"
                  value={newEarning.rate}
                  onChange={handleNewEarningChange}
                  placeholder="Rate"
                  step="0.01"
                  className="form-input input-small"
                />
                <input
                  type="number"
                  name="amount"
                  value={newEarning.amount}
                  onChange={handleNewEarningChange}
                  placeholder="Amount *"
                  required
                  step="0.01"
                  className="form-input input-small"
                />
                <input
                  type="number"
                  name="ytd_amount"
                  value={newEarning.ytd_amount}
                  onChange={handleNewEarningChange}
                  placeholder="YTD"
                  step="0.01"
                  className="form-input input-small"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="save-btn" disabled={isSaving}>
                  {isSaving ? 'Adding...' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setNewEarning(initialNewEarning);
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => setIsAdding(true)} className="add-button">
              Add Earning
            </button>
          )}
        </>
      )}
    </div>
  );
}
