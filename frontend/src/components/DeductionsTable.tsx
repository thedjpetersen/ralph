import { useState } from 'react';
import {
  usePaychecksStore,
  type PaycheckDeduction,
  type AddDeductionRequest,
} from '../stores/paychecks';
import { useAccountStore } from '../stores/account';
import { toast } from '../stores/toast';
import './DeductionsTable.css';

const DEDUCTION_TYPES = [
  { value: 'federal_tax', label: 'Federal Tax' },
  { value: 'state_tax', label: 'State Tax' },
  { value: 'local_tax', label: 'Local Tax' },
  { value: 'social_security', label: 'Social Security' },
  { value: 'medicare', label: 'Medicare' },
  { value: '401k', label: '401(k)' },
  { value: 'roth_401k', label: 'Roth 401(k)' },
  { value: 'ira', label: 'IRA' },
  { value: 'health_insurance', label: 'Health Insurance' },
  { value: 'dental_insurance', label: 'Dental Insurance' },
  { value: 'vision_insurance', label: 'Vision Insurance' },
  { value: 'life_insurance', label: 'Life Insurance' },
  { value: 'disability', label: 'Disability Insurance' },
  { value: 'hsa', label: 'HSA' },
  { value: 'fsa', label: 'FSA' },
  { value: 'union_dues', label: 'Union Dues' },
  { value: 'garnishment', label: 'Garnishment' },
  { value: 'other', label: 'Other' },
];

interface DeductionsTableProps {
  deductions: PaycheckDeduction[];
  paycheckId: string;
  currency: string;
}

interface NewDeductionForm {
  type: string;
  description: string;
  amount: string;
  ytd_amount: string;
  is_pretax: boolean;
}

const initialNewDeduction: NewDeductionForm = {
  type: '401k',
  description: '',
  amount: '',
  ytd_amount: '',
  is_pretax: true,
};

export function DeductionsTable({ deductions, paycheckId, currency }: DeductionsTableProps) {
  const { currentAccount } = useAccountStore();
  const { addDeduction, updateDeduction, deleteDeduction } = usePaychecksStore();

  const [isAdding, setIsAdding] = useState(false);
  const [newDeduction, setNewDeduction] = useState<NewDeductionForm>(initialNewDeduction);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<NewDeductionForm>(initialNewDeduction);
  const [isSaving, setIsSaving] = useState(false);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const handleNewDeductionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setNewDeduction((prev) => ({ ...prev, [name]: checked }));
    } else {
      setNewDeduction((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setEditForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setEditForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount?.id) return;

    if (!newDeduction.amount || parseFloat(newDeduction.amount) <= 0) {
      toast.error('Amount is required');
      return;
    }

    setIsSaving(true);
    try {
      const data: AddDeductionRequest = {
        type: newDeduction.type,
        description: newDeduction.description || undefined,
        amount: parseFloat(newDeduction.amount),
        ytd_amount: newDeduction.ytd_amount ? parseFloat(newDeduction.ytd_amount) : undefined,
        is_pretax: newDeduction.is_pretax,
      };
      await addDeduction(currentAccount.id, paycheckId, data);
      setNewDeduction(initialNewDeduction);
      setIsAdding(false);
      toast.success('Deduction added');
    } catch {
      toast.error('Failed to add deduction');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (deduction: PaycheckDeduction) => {
    setEditingId(deduction.id);
    setEditForm({
      type: deduction.type,
      description: deduction.description || '',
      amount: deduction.amount.toString(),
      ytd_amount: deduction.ytd_amount?.toString() || '',
      is_pretax: deduction.is_pretax,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(initialNewDeduction);
  };

  const handleSaveEdit = async (e: React.FormEvent, deductionId: string) => {
    e.preventDefault();
    if (!currentAccount?.id) return;

    if (!editForm.amount || parseFloat(editForm.amount) <= 0) {
      toast.error('Amount is required');
      return;
    }

    setIsSaving(true);
    try {
      await updateDeduction(currentAccount.id, paycheckId, deductionId, {
        type: editForm.type,
        description: editForm.description || undefined,
        amount: parseFloat(editForm.amount),
        ytd_amount: editForm.ytd_amount ? parseFloat(editForm.ytd_amount) : undefined,
        is_pretax: editForm.is_pretax,
      });
      setEditingId(null);
      toast.success('Deduction updated');
    } catch {
      toast.error('Failed to update deduction');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (deductionId: string) => {
    if (!currentAccount?.id) return;
    if (!confirm('Are you sure you want to delete this deduction?')) return;

    try {
      await deleteDeduction(currentAccount.id, paycheckId, deductionId);
      toast.success('Deduction deleted');
    } catch {
      toast.error('Failed to delete deduction');
    }
  };

  const getTypeLabel = (type: string) => {
    const found = DEDUCTION_TYPES.find((t) => t.value === type);
    return found?.label || type;
  };

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const preTaxTotal = deductions.filter((d) => d.is_pretax).reduce((sum, d) => sum + d.amount, 0);
  const postTaxTotal = deductions.filter((d) => !d.is_pretax).reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="deductions-table">
      {deductions.length === 0 && !isAdding ? (
        <div className="table-empty">
          <p>No deductions recorded</p>
          <button onClick={() => setIsAdding(true)} className="add-button">
            Add Deduction
          </button>
        </div>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
                <th className="text-center">Pre-Tax</th>
                <th className="text-right">Amount</th>
                <th className="text-right">YTD</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {deductions.map((deduction) =>
                editingId === deduction.id ? (
                  <tr key={deduction.id} className="edit-row">
                    <td colSpan={6}>
                      <form onSubmit={(e) => handleSaveEdit(e, deduction.id)} className="inline-form">
                        <select
                          name="type"
                          value={editForm.type}
                          onChange={handleEditChange}
                          className="form-select"
                        >
                          {DEDUCTION_TYPES.map((type) => (
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
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            name="is_pretax"
                            checked={editForm.is_pretax}
                            onChange={handleEditChange}
                            className="checkbox-input"
                          />
                          Pre-Tax
                        </label>
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
                  <tr key={deduction.id}>
                    <td>
                      <span className="deduction-type">{getTypeLabel(deduction.type)}</span>
                    </td>
                    <td>{deduction.description || '-'}</td>
                    <td className="text-center">
                      {deduction.is_pretax ? (
                        <span className="pretax-badge">Yes</span>
                      ) : (
                        <span className="posttax-badge">No</span>
                      )}
                    </td>
                    <td className="text-right amount">{formatAmount(deduction.amount)}</td>
                    <td className="text-right ytd">
                      {deduction.ytd_amount ? formatAmount(deduction.ytd_amount) : '-'}
                    </td>
                    <td className="actions">
                      <button onClick={() => handleStartEdit(deduction)} className="edit-btn">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(deduction.id)} className="delete-btn">
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
            <tfoot>
              <tr className="subtotal-row">
                <td colSpan={3} className="total-label">
                  Pre-Tax Total
                </td>
                <td className="text-right amount">{formatAmount(preTaxTotal)}</td>
                <td colSpan={2}></td>
              </tr>
              <tr className="subtotal-row">
                <td colSpan={3} className="total-label">
                  Post-Tax Total
                </td>
                <td className="text-right amount">{formatAmount(postTaxTotal)}</td>
                <td colSpan={2}></td>
              </tr>
              <tr>
                <td colSpan={3} className="total-label">
                  Total Deductions
                </td>
                <td className="text-right amount total-amount">{formatAmount(totalDeductions)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>

          {isAdding ? (
            <form onSubmit={handleAddDeduction} className="add-form">
              <div className="form-row">
                <select
                  name="type"
                  value={newDeduction.type}
                  onChange={handleNewDeductionChange}
                  className="form-select"
                >
                  {DEDUCTION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  name="description"
                  value={newDeduction.description}
                  onChange={handleNewDeductionChange}
                  placeholder="Description"
                  className="form-input"
                />
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="is_pretax"
                    checked={newDeduction.is_pretax}
                    onChange={handleNewDeductionChange}
                    className="checkbox-input"
                  />
                  Pre-Tax
                </label>
                <input
                  type="number"
                  name="amount"
                  value={newDeduction.amount}
                  onChange={handleNewDeductionChange}
                  placeholder="Amount *"
                  required
                  step="0.01"
                  className="form-input input-small"
                />
                <input
                  type="number"
                  name="ytd_amount"
                  value={newDeduction.ytd_amount}
                  onChange={handleNewDeductionChange}
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
                    setNewDeduction(initialNewDeduction);
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => setIsAdding(true)} className="add-button">
              Add Deduction
            </button>
          )}
        </>
      )}
    </div>
  );
}
