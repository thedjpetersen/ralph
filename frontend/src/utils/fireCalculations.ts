export interface SavedCalculation {
  id: string;
  timestamp: string;
  accountId: string;
  planId?: string;
  planName?: string;
  inputs: {
    annualSpending: number;
    safeWithdrawalRate: number;
    inflationRate: number;
    monthlyContribution: number;
    expectedReturnRate: number;
    includeSocialSecurity: boolean;
    socialSecurityBenefit: number;
  };
  results: {
    fireNumber: number;
    currentPortfolio?: number;
    percentageComplete?: number;
    remainingNeeded?: number;
    yearsToFire?: number;
    fireDate?: string;
    successRate?: number;
  };
}

const STORAGE_KEY = 'fire-calculator-history';

export function getStoredCalculations(): SavedCalculation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

export function saveCalculation(calculation: SavedCalculation): void {
  const existing = getStoredCalculations();
  const updated = [calculation, ...existing].slice(0, 50); // Keep last 50
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function deleteCalculation(id: string): void {
  const existing = getStoredCalculations();
  const updated = existing.filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function clearAllCalculations(): void {
  localStorage.removeItem(STORAGE_KEY);
}
