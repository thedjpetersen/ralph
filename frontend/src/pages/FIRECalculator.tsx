import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  fireCalculationsApi,
  retirementPlansApi,
  retirementProjectionsApi,
  type FIRECalculationResult,
  type FIRENumberResult,
  type TimeToFIREResult,
  type MonteCarloResult,
  type ProjectionResult,
  type RetirementPlan,
} from '../api/client';
import { useAccountStore } from '../stores/account';
import { PageTransition } from '../components/PageTransition';
import { FIREProgress } from '../components/FIREProgress';
import { FIREProjection } from '../components/FIREProjection';
import { MonteCarloResults } from '../components/MonteCarloResults';
import { toast } from '../stores/toast';
import './FIRECalculator.css';

interface FIREInputs {
  planId: string;
  annualSpending: number;
  safeWithdrawalRate: number;
  inflationRate: number;
  monthlyContribution: number;
  expectedReturnRate: number;
  includeSocialSecurity: boolean;
  socialSecurityBenefit: number;
  simulationCount: number;
  yearsInRetirement: number;
}

const DEFAULT_INPUTS: FIREInputs = {
  planId: '',
  annualSpending: 40000,
  safeWithdrawalRate: 4,
  inflationRate: 3,
  monthlyContribution: 2000,
  expectedReturnRate: 7,
  includeSocialSecurity: false,
  socialSecurityBenefit: 0,
  simulationCount: 1000,
  yearsInRetirement: 30,
};

export function FIRECalculator() {
  const { currentAccount } = useAccountStore();

  const [plans, setPlans] = useState<RetirementPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [inputs, setInputs] = useState<FIREInputs>(DEFAULT_INPUTS);
  const [isCalculating, setIsCalculating] = useState(false);

  // Results state
  const [fireResult, setFireResult] = useState<FIRECalculationResult | null>(null);
  const [fireNumberResult, setFireNumberResult] = useState<FIRENumberResult | null>(null);
  const [timeToFireResult, setTimeToFireResult] = useState<TimeToFIREResult | null>(null);
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloResult | null>(null);
  const [projectionResult, setProjectionResult] = useState<ProjectionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'progress' | 'projection' | 'montecarlo'>('progress');

  // Fetch retirement plans for the dropdown
  useEffect(() => {
    async function fetchPlans() {
      if (!currentAccount?.id) return;

      setIsLoadingPlans(true);
      try {
        const response = await retirementPlansApi.list(currentAccount.id, { status: 'active' });
        setPlans(response.plans);
        // Auto-select the first plan if available
        if (response.plans.length > 0 && !inputs.planId) {
          const defaultPlan = response.plans.find(p => p.is_default) || response.plans[0];
          setInputs(prev => ({
            ...prev,
            planId: defaultPlan.id,
            annualSpending: defaultPlan.target_annual_spending,
            safeWithdrawalRate: defaultPlan.safe_withdrawal_rate * 100,
            inflationRate: defaultPlan.inflation_rate * 100,
            expectedReturnRate: defaultPlan.expected_return_rate * 100,
          }));
        }
      } catch {
        toast.error('Failed to load retirement plans');
      } finally {
        setIsLoadingPlans(false);
      }
    }
    fetchPlans();
  }, [currentAccount?.id, inputs.planId]);

  const handleInputChange = useCallback((field: keyof FIREInputs, value: string | number | boolean) => {
    setInputs(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handlePlanChange = useCallback((planId: string) => {
    const selectedPlan = plans.find(p => p.id === planId);
    if (selectedPlan) {
      setInputs(prev => ({
        ...prev,
        planId,
        annualSpending: selectedPlan.target_annual_spending,
        safeWithdrawalRate: selectedPlan.safe_withdrawal_rate * 100,
        inflationRate: selectedPlan.inflation_rate * 100,
        expectedReturnRate: selectedPlan.expected_return_rate * 100,
      }));
    } else {
      setInputs(prev => ({ ...prev, planId }));
    }
  }, [plans]);

  const calculateFIRE = useCallback(async () => {
    if (!currentAccount?.id) return;

    setIsCalculating(true);
    setFireResult(null);
    setFireNumberResult(null);
    setTimeToFireResult(null);
    setMonteCarloResult(null);
    setProjectionResult(null);

    try {
      // Run all calculations in parallel
      const promises: Promise<unknown>[] = [];

      // FIRE Number calculation (simple)
      promises.push(
        fireCalculationsApi.calculateNumber(currentAccount.id, {
          annual_spending: inputs.annualSpending,
          safe_withdrawal_rate: inputs.safeWithdrawalRate / 100,
          include_social_security: inputs.includeSocialSecurity,
          social_security_benefit: inputs.includeSocialSecurity ? inputs.socialSecurityBenefit : undefined,
        })
      );

      // If a plan is selected, run additional calculations
      if (inputs.planId) {
        // Full FIRE calculation
        promises.push(
          fireCalculationsApi.calculate(currentAccount.id, {
            plan_id: inputs.planId,
            annual_spending: inputs.annualSpending,
            safe_withdrawal_rate: inputs.safeWithdrawalRate / 100,
            inflation_rate: inputs.inflationRate / 100,
          })
        );

        // Time to FIRE
        promises.push(
          fireCalculationsApi.timeToFIRE(currentAccount.id, {
            plan_id: inputs.planId,
            monthly_contribution: inputs.monthlyContribution,
            expected_return_rate: inputs.expectedReturnRate / 100,
          })
        );

        // Monte Carlo simulation
        promises.push(
          fireCalculationsApi.monteCarlo(currentAccount.id, {
            plan_id: inputs.planId,
            simulations: inputs.simulationCount,
            years_in_retirement: inputs.yearsInRetirement,
            return_mean: inputs.expectedReturnRate / 100,
          })
        );

        // Projections
        promises.push(
          retirementProjectionsApi.generate(currentAccount.id, {
            plan_id: inputs.planId,
            years: 40,
            scenario: 'baseline',
          })
        );
      }

      const results = await Promise.allSettled(promises);

      // Process results
      if (results[0].status === 'fulfilled') {
        setFireNumberResult(results[0].value as FIRENumberResult);
      }

      if (inputs.planId && results.length > 1) {
        if (results[1].status === 'fulfilled') {
          setFireResult(results[1].value as FIRECalculationResult);
        }
        if (results[2].status === 'fulfilled') {
          setTimeToFireResult(results[2].value as TimeToFIREResult);
        }
        if (results[3].status === 'fulfilled') {
          setMonteCarloResult(results[3].value as MonteCarloResult);
        }
        if (results[4].status === 'fulfilled') {
          setProjectionResult(results[4].value as ProjectionResult);
        }
      }

      toast.success('FIRE calculations completed');
    } catch {
      toast.error('Failed to calculate FIRE numbers');
    } finally {
      setIsCalculating(false);
    }
  }, [currentAccount?.id, inputs]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="fire-calculator-page">
          <div className="fire-calculator-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to use the FIRE calculator.</p>
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
      <div className="fire-calculator-page">
        <div className="fire-calculator-header">
          <div className="fire-calculator-header-row">
            <div>
              <h1>FIRE Calculator</h1>
              <p className="fire-calculator-subtitle">
                Calculate your Financial Independence, Retire Early number
              </p>
            </div>
            <div className="header-actions">
              <Link to="/fire-history" className="history-link">
                View History
              </Link>
            </div>
          </div>
        </div>

        <div className="fire-calculator-content">
          {/* Input Panel */}
          <div className="fire-inputs-panel">
            <h2>Calculator Inputs</h2>

            {/* Plan Selection */}
            <div className="input-section">
              <h3>Retirement Plan</h3>
              <div className="form-group">
                <label htmlFor="planId">Select Plan (Optional)</label>
                <select
                  id="planId"
                  value={inputs.planId}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  className="form-select"
                  disabled={isLoadingPlans}
                >
                  <option value="">Quick Calculation (No Plan)</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} {plan.is_default ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
                <span className="input-hint">
                  Select a plan for detailed calculations including projections and Monte Carlo
                </span>
              </div>
            </div>

            {/* Core Inputs */}
            <div className="input-section">
              <h3>Core Assumptions</h3>
              <div className="form-group">
                <label htmlFor="annualSpending">Annual Spending</label>
                <div className="input-with-prefix">
                  <span className="input-prefix">$</span>
                  <input
                    type="number"
                    id="annualSpending"
                    value={inputs.annualSpending}
                    onChange={(e) => handleInputChange('annualSpending', Number(e.target.value))}
                    min={0}
                    className="form-input"
                  />
                </div>
                <span className="input-hint">Expected annual expenses in retirement</span>
              </div>

              <div className="form-group">
                <label htmlFor="safeWithdrawalRate">Safe Withdrawal Rate (%)</label>
                <div className="input-with-suffix">
                  <input
                    type="number"
                    id="safeWithdrawalRate"
                    value={inputs.safeWithdrawalRate}
                    onChange={(e) => handleInputChange('safeWithdrawalRate', Number(e.target.value))}
                    min={1}
                    max={10}
                    step={0.1}
                    className="form-input"
                  />
                  <span className="input-suffix">%</span>
                </div>
                <span className="input-hint">Traditional rule is 4% (Trinity Study)</span>
              </div>

              <div className="form-group">
                <label htmlFor="inflationRate">Inflation Rate (%)</label>
                <div className="input-with-suffix">
                  <input
                    type="number"
                    id="inflationRate"
                    value={inputs.inflationRate}
                    onChange={(e) => handleInputChange('inflationRate', Number(e.target.value))}
                    min={0}
                    max={15}
                    step={0.1}
                    className="form-input"
                  />
                  <span className="input-suffix">%</span>
                </div>
                <span className="input-hint">Historical average is ~3%</span>
              </div>
            </div>

            {/* Growth Inputs */}
            <div className="input-section">
              <h3>Growth Assumptions</h3>
              <div className="form-group">
                <label htmlFor="monthlyContribution">Monthly Contribution</label>
                <div className="input-with-prefix">
                  <span className="input-prefix">$</span>
                  <input
                    type="number"
                    id="monthlyContribution"
                    value={inputs.monthlyContribution}
                    onChange={(e) => handleInputChange('monthlyContribution', Number(e.target.value))}
                    min={0}
                    className="form-input"
                  />
                </div>
                <span className="input-hint">Monthly savings towards FIRE</span>
              </div>

              <div className="form-group">
                <label htmlFor="expectedReturnRate">Expected Return Rate (%)</label>
                <div className="input-with-suffix">
                  <input
                    type="number"
                    id="expectedReturnRate"
                    value={inputs.expectedReturnRate}
                    onChange={(e) => handleInputChange('expectedReturnRate', Number(e.target.value))}
                    min={0}
                    max={20}
                    step={0.1}
                    className="form-input"
                  />
                  <span className="input-suffix">%</span>
                </div>
                <span className="input-hint">S&P 500 historical average is ~10% nominal</span>
              </div>
            </div>

            {/* Social Security */}
            <div className="input-section">
              <h3>Social Security</h3>
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={inputs.includeSocialSecurity}
                    onChange={(e) => handleInputChange('includeSocialSecurity', e.target.checked)}
                  />
                  <span>Include Social Security Benefits</span>
                </label>
              </div>

              {inputs.includeSocialSecurity && (
                <div className="form-group">
                  <label htmlFor="socialSecurityBenefit">Annual SS Benefit</label>
                  <div className="input-with-prefix">
                    <span className="input-prefix">$</span>
                    <input
                      type="number"
                      id="socialSecurityBenefit"
                      value={inputs.socialSecurityBenefit}
                      onChange={(e) => handleInputChange('socialSecurityBenefit', Number(e.target.value))}
                      min={0}
                      className="form-input"
                    />
                  </div>
                  <span className="input-hint">Estimated annual Social Security benefit</span>
                </div>
              )}
            </div>

            {/* Monte Carlo Settings */}
            {inputs.planId && (
              <div className="input-section">
                <h3>Simulation Settings</h3>
                <div className="form-group">
                  <label htmlFor="simulationCount">Monte Carlo Simulations</label>
                  <input
                    type="number"
                    id="simulationCount"
                    value={inputs.simulationCount}
                    onChange={(e) => handleInputChange('simulationCount', Number(e.target.value))}
                    min={100}
                    max={10000}
                    step={100}
                    className="form-input"
                  />
                  <span className="input-hint">More simulations = more accurate</span>
                </div>

                <div className="form-group">
                  <label htmlFor="yearsInRetirement">Years in Retirement</label>
                  <input
                    type="number"
                    id="yearsInRetirement"
                    value={inputs.yearsInRetirement}
                    onChange={(e) => handleInputChange('yearsInRetirement', Number(e.target.value))}
                    min={10}
                    max={50}
                    className="form-input"
                  />
                  <span className="input-hint">How long your portfolio needs to last</span>
                </div>
              </div>
            )}

            <button
              onClick={calculateFIRE}
              disabled={isCalculating || isLoadingPlans}
              className="calculate-button"
            >
              {isCalculating ? 'Calculating...' : 'Calculate FIRE'}
            </button>
          </div>

          {/* Results Panel */}
          <div className="fire-results-panel">
            {/* Quick Results Summary */}
            {(fireNumberResult || fireResult) && (
              <div className="fire-summary-cards">
                <div className="summary-card fire-number-card">
                  <span className="summary-label">FIRE Number</span>
                  <span className="summary-value">
                    {formatCurrency(fireResult?.fire_number ?? fireNumberResult?.fire_number ?? 0)}
                  </span>
                  <span className="summary-detail">
                    {inputs.safeWithdrawalRate}% SWR &times; {formatCurrency(inputs.annualSpending)}/yr
                  </span>
                </div>

                {fireResult && (
                  <>
                    <div className="summary-card current-portfolio-card">
                      <span className="summary-label">Current Portfolio</span>
                      <span className="summary-value">{formatCurrency(fireResult.current_portfolio)}</span>
                      <span className="summary-detail">
                        {fireResult.percentage_complete.toFixed(1)}% of FIRE number
                      </span>
                    </div>

                    <div className="summary-card remaining-card">
                      <span className="summary-label">Remaining Needed</span>
                      <span className="summary-value">{formatCurrency(fireResult.remaining_needed)}</span>
                      <span className="summary-detail">
                        to reach financial independence
                      </span>
                    </div>
                  </>
                )}

                {timeToFireResult && (
                  <div className="summary-card time-card">
                    <span className="summary-label">Time to FIRE</span>
                    <span className="summary-value">
                      {timeToFireResult.years_to_fire} years
                    </span>
                    <span className="summary-detail">
                      Target date: {new Date(timeToFireResult.fire_date).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {monteCarloResult && (
                  <div className="summary-card success-card">
                    <span className="summary-label">Success Rate</span>
                    <span className={`summary-value ${monteCarloResult.success_rate >= 90 ? 'success-high' : monteCarloResult.success_rate >= 75 ? 'success-medium' : 'success-low'}`}>
                      {(monteCarloResult.success_rate * 100).toFixed(1)}%
                    </span>
                    <span className="summary-detail">
                      Based on {monteCarloResult.simulations_run.toLocaleString()} simulations
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Detailed Results Tabs */}
            {(fireResult || projectionResult || monteCarloResult) && (
              <div className="fire-results-details">
                <div className="results-tabs">
                  <button
                    className={`tab-button ${activeTab === 'progress' ? 'active' : ''}`}
                    onClick={() => setActiveTab('progress')}
                  >
                    Progress
                  </button>
                  <button
                    className={`tab-button ${activeTab === 'projection' ? 'active' : ''}`}
                    onClick={() => setActiveTab('projection')}
                    disabled={!projectionResult}
                  >
                    Projection
                  </button>
                  <button
                    className={`tab-button ${activeTab === 'montecarlo' ? 'active' : ''}`}
                    onClick={() => setActiveTab('montecarlo')}
                    disabled={!monteCarloResult}
                  >
                    Monte Carlo
                  </button>
                </div>

                <div className="tab-content">
                  {activeTab === 'progress' && fireResult && (
                    <FIREProgress
                      currentPortfolio={fireResult.current_portfolio}
                      fireNumber={fireResult.fire_number}
                      percentageComplete={fireResult.percentage_complete}
                      remainingNeeded={fireResult.remaining_needed}
                      timeToFire={timeToFireResult}
                    />
                  )}

                  {activeTab === 'projection' && projectionResult && (
                    <FIREProjection
                      projections={projectionResult.projections}
                      summary={projectionResult.summary}
                      fireNumber={fireResult?.fire_number ?? fireNumberResult?.fire_number ?? 0}
                    />
                  )}

                  {activeTab === 'montecarlo' && monteCarloResult && (
                    <MonteCarloResults
                      result={monteCarloResult}
                      fireNumber={fireResult?.fire_number ?? fireNumberResult?.fire_number ?? 0}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!fireResult && !fireNumberResult && (
              <div className="fire-results-empty">
                <div className="empty-icon">$</div>
                <h3>Ready to Calculate</h3>
                <p>
                  Enter your spending, withdrawal rate, and other assumptions to calculate your FIRE number.
                  {!inputs.planId && (
                    <span> Select a retirement plan for detailed projections and Monte Carlo simulations.</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
