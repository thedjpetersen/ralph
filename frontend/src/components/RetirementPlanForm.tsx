import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  retirementPlansApi,
  type RetirementPlan,
  type RetirementStrategy,
  type CreateRetirementPlanRequest,
} from '../api/client';
import { useAccountStore } from '../stores/account';
import { PageTransition } from './PageTransition';
import { SettingsFormSkeleton } from './skeletons';
import { toast } from '../stores/toast';
import './RetirementPlanForm.css';

const STRATEGY_OPTIONS: { value: RetirementStrategy; label: string; description: string }[] = [
  { value: 'traditional', label: 'Traditional', description: 'Standard retirement at 65+' },
  { value: 'fire', label: 'FIRE', description: 'Financial Independence, Retire Early' },
  { value: 'coast_fire', label: 'Coast FIRE', description: 'Save enough to coast to retirement' },
  { value: 'barista_fire', label: 'Barista FIRE', description: 'Part-time work covers expenses' },
  { value: 'lean_fire', label: 'Lean FIRE', description: 'Minimal expenses, early retirement' },
  { value: 'fat_fire', label: 'Fat FIRE', description: 'Comfortable lifestyle, high savings' },
];

interface FormData {
  name: string;
  description: string;
  strategy: RetirementStrategy;
  current_age: string;
  target_retirement_age: string;
  life_expectancy: string;
  target_annual_spending: string;
  inflation_rate: string;
  safe_withdrawal_rate: string;
  expected_return_rate: string;
  social_security_age: string;
  social_security_benefit: string;
  pension_benefit: string;
  pension_start_age: string;
  healthcare_cost_estimate: string;
  notes: string;
}

const initialFormData: FormData = {
  name: '',
  description: '',
  strategy: 'traditional',
  current_age: '',
  target_retirement_age: '65',
  life_expectancy: '90',
  target_annual_spending: '',
  inflation_rate: '3',
  safe_withdrawal_rate: '4',
  expected_return_rate: '7',
  social_security_age: '',
  social_security_benefit: '',
  pension_benefit: '',
  pension_start_age: '',
  healthcare_cost_estimate: '',
  notes: '',
};

export function RetirementPlanForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const { currentAccount } = useAccountStore();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id && currentAccount?.id) {
      setIsLoading(true);
      retirementPlansApi.get(currentAccount.id, id)
        .then((plan) => {
          populateForm(plan);
        })
        .catch(() => {
          setError('Failed to load retirement plan');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [id, currentAccount?.id]);

  const populateForm = (plan: RetirementPlan) => {
    setFormData({
      name: plan.name,
      description: plan.description || '',
      strategy: plan.strategy,
      current_age: plan.current_age.toString(),
      target_retirement_age: plan.target_retirement_age.toString(),
      life_expectancy: plan.life_expectancy.toString(),
      target_annual_spending: plan.target_annual_spending.toString(),
      inflation_rate: (plan.inflation_rate * 100).toString(),
      safe_withdrawal_rate: (plan.safe_withdrawal_rate * 100).toString(),
      expected_return_rate: (plan.expected_return_rate * 100).toString(),
      social_security_age: plan.social_security_age?.toString() || '',
      social_security_benefit: plan.social_security_benefit?.toString() || '',
      pension_benefit: plan.pension_benefit?.toString() || '',
      pension_start_age: plan.pension_start_age?.toString() || '',
      healthcare_cost_estimate: plan.healthcare_cost_estimate?.toString() || '',
      notes: plan.notes || '',
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSaveError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount?.id) {
      setSaveError('No account selected');
      return;
    }

    if (!formData.name.trim()) {
      setSaveError('Plan name is required');
      return;
    }

    if (!formData.current_age || parseInt(formData.current_age) <= 0) {
      setSaveError('Current age is required');
      return;
    }

    if (!formData.target_retirement_age || parseInt(formData.target_retirement_age) <= 0) {
      setSaveError('Target retirement age is required');
      return;
    }

    if (!formData.target_annual_spending || parseFloat(formData.target_annual_spending) <= 0) {
      setSaveError('Target annual spending is required');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const planData: CreateRetirementPlanRequest = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      strategy: formData.strategy,
      current_age: parseInt(formData.current_age),
      target_retirement_age: parseInt(formData.target_retirement_age),
      life_expectancy: formData.life_expectancy ? parseInt(formData.life_expectancy) : undefined,
      target_annual_spending: parseFloat(formData.target_annual_spending),
      inflation_rate: formData.inflation_rate ? parseFloat(formData.inflation_rate) / 100 : undefined,
      safe_withdrawal_rate: formData.safe_withdrawal_rate ? parseFloat(formData.safe_withdrawal_rate) / 100 : undefined,
      expected_return_rate: formData.expected_return_rate ? parseFloat(formData.expected_return_rate) / 100 : undefined,
      social_security_age: formData.social_security_age ? parseInt(formData.social_security_age) : undefined,
      social_security_benefit: formData.social_security_benefit ? parseFloat(formData.social_security_benefit) : undefined,
      pension_benefit: formData.pension_benefit ? parseFloat(formData.pension_benefit) : undefined,
      pension_start_age: formData.pension_start_age ? parseInt(formData.pension_start_age) : undefined,
      healthcare_cost_estimate: formData.healthcare_cost_estimate ? parseFloat(formData.healthcare_cost_estimate) : undefined,
      notes: formData.notes.trim() || undefined,
    };

    try {
      if (isEditing && id) {
        await retirementPlansApi.update(currentAccount.id, id, planData);
        toast.success('Retirement plan updated successfully');
        navigate(`/retirement-plans/${id}`);
      } else {
        const newPlan = await retirementPlansApi.create(currentAccount.id, planData);
        toast.success('Retirement plan created successfully');
        navigate(`/retirement-plans/${newPlan.id}`);
      }
    } catch {
      const errorMsg = isEditing ? 'Failed to update plan' : 'Failed to create plan';
      setSaveError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="retirement-plan-form-page">
          <div className="form-error-container">
            <h2>No Account Selected</h2>
            <p>Please select an account to create or edit retirement plans.</p>
            <button onClick={() => navigate('/accounts')} className="back-button">
              Select an Account
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading && isEditing && !formData.name) {
    return (
      <PageTransition>
        <div className="retirement-plan-form-page">
          <SettingsFormSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (error && isEditing && !formData.name) {
    return (
      <PageTransition>
        <div className="retirement-plan-form-page">
          <div className="form-error-container">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/retirement-plans')} className="back-button">
              Back to Plans
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="retirement-plan-form-page">
        <div className="form-header">
          <Link to={isEditing ? `/retirement-plans/${id}` : '/retirement-plans'} className="back-link">
            &larr; {isEditing ? 'Back to Plan' : 'Back to Plans'}
          </Link>
          <h1>{isEditing ? 'Edit Retirement Plan' : 'Create Retirement Plan'}</h1>
          <p className="form-subtitle">
            {isEditing
              ? 'Update your retirement plan details'
              : 'Set up your path to financial independence'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="retirement-plan-form">
          <div className="form-section">
            <h2>Basic Information</h2>

            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Plan Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="form-input"
                required
                maxLength={100}
                placeholder="e.g., My FIRE Plan, Retirement 2040"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="form-textarea"
                rows={2}
                maxLength={500}
                placeholder="Brief description of this retirement plan..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="strategy" className="form-label">
                Retirement Strategy
              </label>
              <select
                id="strategy"
                name="strategy"
                value={formData.strategy}
                onChange={handleInputChange}
                className="form-select"
              >
                {STRATEGY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-section">
            <h2>Age & Timeline</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="current_age" className="form-label">
                  Current Age *
                </label>
                <input
                  type="number"
                  id="current_age"
                  name="current_age"
                  value={formData.current_age}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                  min="18"
                  max="100"
                  placeholder="35"
                />
              </div>

              <div className="form-group">
                <label htmlFor="target_retirement_age" className="form-label">
                  Target Retirement Age *
                </label>
                <input
                  type="number"
                  id="target_retirement_age"
                  name="target_retirement_age"
                  value={formData.target_retirement_age}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                  min="18"
                  max="100"
                  placeholder="65"
                />
              </div>

              <div className="form-group">
                <label htmlFor="life_expectancy" className="form-label">
                  Life Expectancy
                </label>
                <input
                  type="number"
                  id="life_expectancy"
                  name="life_expectancy"
                  value={formData.life_expectancy}
                  onChange={handleInputChange}
                  className="form-input"
                  min="50"
                  max="120"
                  placeholder="90"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Financial Assumptions</h2>

            <div className="form-group">
              <label htmlFor="target_annual_spending" className="form-label">
                Target Annual Spending *
              </label>
              <input
                type="number"
                id="target_annual_spending"
                name="target_annual_spending"
                value={formData.target_annual_spending}
                onChange={handleInputChange}
                className="form-input"
                required
                min="0"
                step="1000"
                placeholder="50000"
              />
              <p className="form-help">
                How much you plan to spend annually in retirement (in today's dollars).
              </p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="safe_withdrawal_rate" className="form-label">
                  Safe Withdrawal Rate (%)
                </label>
                <input
                  type="number"
                  id="safe_withdrawal_rate"
                  name="safe_withdrawal_rate"
                  value={formData.safe_withdrawal_rate}
                  onChange={handleInputChange}
                  className="form-input"
                  min="1"
                  max="10"
                  step="0.1"
                  placeholder="4"
                />
                <p className="form-help">
                  Typically 3-4% for traditional retirement.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="expected_return_rate" className="form-label">
                  Expected Return Rate (%)
                </label>
                <input
                  type="number"
                  id="expected_return_rate"
                  name="expected_return_rate"
                  value={formData.expected_return_rate}
                  onChange={handleInputChange}
                  className="form-input"
                  min="0"
                  max="20"
                  step="0.1"
                  placeholder="7"
                />
                <p className="form-help">
                  Expected average annual return on investments.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="inflation_rate" className="form-label">
                  Inflation Rate (%)
                </label>
                <input
                  type="number"
                  id="inflation_rate"
                  name="inflation_rate"
                  value={formData.inflation_rate}
                  onChange={handleInputChange}
                  className="form-input"
                  min="0"
                  max="15"
                  step="0.1"
                  placeholder="3"
                />
                <p className="form-help">
                  Expected long-term inflation rate.
                </p>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Social Security & Pension</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="social_security_age" className="form-label">
                  Social Security Start Age
                </label>
                <input
                  type="number"
                  id="social_security_age"
                  name="social_security_age"
                  value={formData.social_security_age}
                  onChange={handleInputChange}
                  className="form-input"
                  min="62"
                  max="70"
                  placeholder="67"
                />
              </div>

              <div className="form-group">
                <label htmlFor="social_security_benefit" className="form-label">
                  Annual SS Benefit
                </label>
                <input
                  type="number"
                  id="social_security_benefit"
                  name="social_security_benefit"
                  value={formData.social_security_benefit}
                  onChange={handleInputChange}
                  className="form-input"
                  min="0"
                  step="100"
                  placeholder="24000"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pension_start_age" className="form-label">
                  Pension Start Age
                </label>
                <input
                  type="number"
                  id="pension_start_age"
                  name="pension_start_age"
                  value={formData.pension_start_age}
                  onChange={handleInputChange}
                  className="form-input"
                  min="50"
                  max="80"
                  placeholder="65"
                />
              </div>

              <div className="form-group">
                <label htmlFor="pension_benefit" className="form-label">
                  Annual Pension Benefit
                </label>
                <input
                  type="number"
                  id="pension_benefit"
                  name="pension_benefit"
                  value={formData.pension_benefit}
                  onChange={handleInputChange}
                  className="form-input"
                  min="0"
                  step="100"
                  placeholder="12000"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Healthcare</h2>

            <div className="form-group">
              <label htmlFor="healthcare_cost_estimate" className="form-label">
                Annual Healthcare Cost Estimate
              </label>
              <input
                type="number"
                id="healthcare_cost_estimate"
                name="healthcare_cost_estimate"
                value={formData.healthcare_cost_estimate}
                onChange={handleInputChange}
                className="form-input"
                min="0"
                step="100"
                placeholder="12000"
              />
              <p className="form-help">
                Estimated annual healthcare costs in retirement.
              </p>
            </div>
          </div>

          <div className="form-section">
            <h2>Notes</h2>

            <div className="form-group">
              <label htmlFor="notes" className="form-label">
                Additional Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="form-textarea"
                rows={3}
                maxLength={2000}
                placeholder="Any additional notes about your retirement plan..."
              />
            </div>
          </div>

          {saveError && <div className="form-error">{saveError}</div>}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate(isEditing ? `/retirement-plans/${id}` : '/retirement-plans')}
              className="cancel-button"
            >
              Cancel
            </button>
            <button type="submit" className="save-button" disabled={isSaving}>
              {isSaving
                ? isEditing
                  ? 'Saving...'
                  : 'Creating...'
                : isEditing
                  ? 'Save Changes'
                  : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </PageTransition>
  );
}
