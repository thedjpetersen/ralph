package dto

import "time"

// =============================================================================
// Account DTOs
// =============================================================================

// AccountType represents different tax-advantaged account types
type AccountType string

const (
	AccountTypeTaxable     AccountType = "taxable"
	AccountTypeTraditional AccountType = "traditional"
	AccountTypeRoth        AccountType = "roth"
	AccountTypeHSA         AccountType = "hsa"
)

// AccountBalanceResponse represents account balance information
type AccountBalanceResponse struct {
	AccountType AccountType `json:"account_type"`
	Balance     float64     `json:"balance"`
	Name        string      `json:"name,omitempty"`
}

// AccountBalancesResponse represents all account balances
type AccountBalancesResponse struct {
	TaxableBalance     float64 `json:"taxable_balance"`
	TraditionalBalance float64 `json:"traditional_balance"`
	RothBalance        float64 `json:"roth_balance"`
	HSABalance         float64 `json:"hsa_balance"`
	TotalBalance       float64 `json:"total_balance"`
}

// AccountContributionsResponse represents contributions by account type
type AccountContributionsResponse struct {
	TaxableContribution     float64 `json:"taxable_contribution"`
	TraditionalContribution float64 `json:"traditional_contribution"`
	RothContribution        float64 `json:"roth_contribution"`
	HSAContribution         float64 `json:"hsa_contribution"`
	TotalContributions      float64 `json:"total_contributions"`
}

// AccountWithdrawalsResponse represents withdrawals by account type
type AccountWithdrawalsResponse struct {
	TaxableWithdrawal     float64 `json:"taxable_withdrawal"`
	TraditionalWithdrawal float64 `json:"traditional_withdrawal"`
	RothWithdrawal        float64 `json:"roth_withdrawal"`
	HSAWithdrawal         float64 `json:"hsa_withdrawal"`
	TotalWithdrawals      float64 `json:"total_withdrawals"`
	TaxOwed               float64 `json:"tax_owed"`
	ShortfallAmount       float64 `json:"shortfall_amount,omitempty"`
}

// =============================================================================
// Plan DTOs
// =============================================================================

// RetirementPlanResponse represents a complete retirement plan configuration
type RetirementPlanResponse struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Demographics
	CurrentAge     int `json:"current_age"`
	RetirementAge  int `json:"retirement_age"`
	LifeExpectancy int `json:"life_expectancy"`

	// Account balances
	Accounts AccountBalancesResponse `json:"accounts"`

	// Contributions
	Contributions AccountContributionsResponse `json:"contributions"`

	// Market assumptions
	ExpectedReturn float64 `json:"expected_return"`
	InflationRate  float64 `json:"inflation_rate"`

	// Retirement income
	SocialSecurityBenefit  float64 `json:"social_security_benefit"`
	SocialSecurityStartAge int     `json:"social_security_start_age"`
	PensionBenefit         float64 `json:"pension_benefit"`
	PensionStartAge        int     `json:"pension_start_age"`

	// Expenses
	AnnualExpenses float64 `json:"annual_expenses"`

	// Withdrawal strategy
	WithdrawalStrategy WithdrawalStrategyType `json:"withdrawal_strategy"`

	// Tax configuration
	FederalTaxRate float64 `json:"federal_tax_rate"`
	StateTaxRate   float64 `json:"state_tax_rate"`
}

// WithdrawalStrategyType represents different withdrawal ordering strategies
type WithdrawalStrategyType string

const (
	WithdrawalStrategyProRata          WithdrawalStrategyType = "pro_rata"
	WithdrawalStrategyTaxableFirst     WithdrawalStrategyType = "taxable_first"
	WithdrawalStrategyTraditionalFirst WithdrawalStrategyType = "traditional_first"
	WithdrawalStrategyRothFirst        WithdrawalStrategyType = "roth_first"
	WithdrawalStrategyTaxOptimized     WithdrawalStrategyType = "tax_optimized"
)

// =============================================================================
// Income DTOs
// =============================================================================

// IncomeSourceType represents different income source categories
type IncomeSourceType string

const (
	IncomeSourceEmployment  IncomeSourceType = "employment"
	IncomeSourceSocialSec   IncomeSourceType = "social_security"
	IncomeSourcePension     IncomeSourceType = "pension"
	IncomeSourceInvestment  IncomeSourceType = "investment"
	IncomeSourceRental      IncomeSourceType = "rental"
	IncomeSourceOther       IncomeSourceType = "other"
	IncomeSourceWithdrawal  IncomeSourceType = "withdrawal"
)

// IncomeSourceResponse represents a single income source
type IncomeSourceResponse struct {
	Type        IncomeSourceType `json:"type"`
	Name        string           `json:"name"`
	Amount      float64          `json:"amount"`
	StartAge    int              `json:"start_age,omitempty"`
	EndAge      int              `json:"end_age,omitempty"`
	GrowthRate  float64          `json:"growth_rate,omitempty"`
	IsTaxable   bool             `json:"is_taxable"`
	Description string           `json:"description,omitempty"`
}

// IncomeBreakdownResponse represents all income sources for a period
type IncomeBreakdownResponse struct {
	EmploymentIncome   float64 `json:"employment_income"`
	SocialSecurity     float64 `json:"social_security"`
	Pension            float64 `json:"pension"`
	InvestmentIncome   float64 `json:"investment_income"`
	RentalIncome       float64 `json:"rental_income"`
	OtherIncome        float64 `json:"other_income"`
	TotalIncome        float64 `json:"total_income"`
}

// =============================================================================
// Expense DTOs
// =============================================================================

// ExpenseCategoryType represents different expense categories
type ExpenseCategoryType string

const (
	ExpenseCategoryHousing        ExpenseCategoryType = "housing"
	ExpenseCategoryHealthcare     ExpenseCategoryType = "healthcare"
	ExpenseCategoryFood           ExpenseCategoryType = "food"
	ExpenseCategoryTransportation ExpenseCategoryType = "transportation"
	ExpenseCategoryUtilities      ExpenseCategoryType = "utilities"
	ExpenseCategoryInsurance      ExpenseCategoryType = "insurance"
	ExpenseCategoryDiscretionary  ExpenseCategoryType = "discretionary"
	ExpenseCategoryOther          ExpenseCategoryType = "other"
)

// ExpenseResponse represents a single expense item
type ExpenseResponse struct {
	Category    ExpenseCategoryType `json:"category"`
	Name        string              `json:"name"`
	Amount      float64             `json:"amount"`
	GrowthRate  float64             `json:"growth_rate,omitempty"`
	Description string              `json:"description,omitempty"`
}

// ExpenseBreakdownResponse represents all expenses for a period
type ExpenseBreakdownResponse struct {
	HousingExpense        float64 `json:"housing_expense"`
	HealthcareExpense     float64 `json:"healthcare_expense"`
	FoodExpense           float64 `json:"food_expense"`
	TransportationExpense float64 `json:"transportation_expense"`
	UtilitiesExpense      float64 `json:"utilities_expense"`
	InsuranceExpense      float64 `json:"insurance_expense"`
	DiscretionaryExpense  float64 `json:"discretionary_expense"`
	OtherExpenses         float64 `json:"other_expenses"`
	TotalExpenses         float64 `json:"total_expenses"`
}

// =============================================================================
// Tax DTOs
// =============================================================================

// TaxBreakdownResponse represents tax breakdown for a period
type TaxBreakdownResponse struct {
	FederalTax      float64 `json:"federal_tax"`
	StateTax        float64 `json:"state_tax"`
	FICATax         float64 `json:"fica_tax"`
	CapitalGainsTax float64 `json:"capital_gains_tax"`
	TotalTax        float64 `json:"total_tax"`
}

// TaxImpactResponse represents detailed tax impact analysis
type TaxImpactResponse struct {
	GrossIncome       float64 `json:"gross_income"`
	TaxableIncome     float64 `json:"taxable_income"`
	EffectiveTaxRate  float64 `json:"effective_tax_rate"`
	MarginalTaxRate   float64 `json:"marginal_tax_rate"`
	TotalTaxLiability float64 `json:"total_tax_liability"`

	// Tax breakdown
	FederalTax      float64 `json:"federal_tax"`
	StateTax        float64 `json:"state_tax"`
	FICATax         float64 `json:"fica_tax"`
	CapitalGainsTax float64 `json:"capital_gains_tax"`

	// Tax-advantaged benefits
	TraditionalTaxSavings float64 `json:"traditional_tax_savings"`
	RothTaxBenefit        float64 `json:"roth_tax_benefit"`
	HSATaxBenefit         float64 `json:"hsa_tax_benefit"`

	// Optimization opportunities
	RothConversionOpportunity float64 `json:"roth_conversion_opportunity"`
	TaxLossHarvestingAmount   float64 `json:"tax_loss_harvesting_amount"`
	AdditionalTraditionalRoom float64 `json:"additional_traditional_room"`
}

// TaxBracketResponse represents a tax bracket
type TaxBracketResponse struct {
	MinIncome float64 `json:"min_income"`
	MaxIncome float64 `json:"max_income"`
	Rate      float64 `json:"rate"`
}

// =============================================================================
// Projection Result DTOs
// =============================================================================

// YearProjectionResponse represents financial state for a single year
type YearProjectionResponse struct {
	Year int `json:"year"`
	Age  int `json:"age"`

	// Account balances at start of year
	StartBalances AccountBalancesResponse `json:"start_balances"`

	// Contributions during the year
	Contributions AccountContributionsResponse `json:"contributions"`

	// Withdrawals during the year
	Withdrawals AccountWithdrawalsResponse `json:"withdrawals"`

	// Roth conversion
	RothConversion float64 `json:"roth_conversion"`

	// SEPP/72(t) distribution
	SEPPDistribution float64 `json:"sepp_distribution"`

	// Income sources
	Income IncomeBreakdownResponse `json:"income"`

	// Expenses
	Expenses ExpenseBreakdownResponse `json:"expenses"`

	// Investment growth
	InvestmentGrowth float64 `json:"investment_growth"`

	// Tax paid
	TaxPaid float64 `json:"tax_paid"`

	// Net cash flow
	NetCashFlow float64 `json:"net_cash_flow"`

	// Status flags
	IsRetired  bool `json:"is_retired"`
	IsDepleted bool `json:"is_depleted"`

	// End of year balances
	EndBalances AccountBalancesResponse `json:"end_balances"`
}

// ProjectionResultsResponse represents complete projection results
type ProjectionResultsResponse struct {
	// Year-by-year projections
	Projections []YearProjectionResponse `json:"projections"`

	// Summary statistics
	TotalYears                int     `json:"total_years"`
	RetirementYears           int     `json:"retirement_years"`
	FinalPortfolioValue       float64 `json:"final_portfolio_value"`
	PortfolioDepletionAge     int     `json:"portfolio_depletion_age"`
	TotalContributions        float64 `json:"total_contributions"`
	TotalWithdrawals          float64 `json:"total_withdrawals"`
	TotalRothConversions      float64 `json:"total_roth_conversions"`
	TotalSocialSecurity       float64 `json:"total_social_security"`
	TotalPension              float64 `json:"total_pension"`
	TotalTaxPaid              float64 `json:"total_tax_paid"`
	PeakPortfolioValue        float64 `json:"peak_portfolio_value"`
	PeakPortfolioAge          int     `json:"peak_portfolio_age"`
	MinRetirementPortfolio    float64 `json:"min_retirement_portfolio"`
	MinRetirementPortfolioAge int     `json:"min_retirement_portfolio_age"`
	SuccessfulRetirement      bool    `json:"successful_retirement"`
	SafeWithdrawalRate        float64 `json:"safe_withdrawal_rate"`

	// Calculation metadata
	CalculationDurationMs int64 `json:"calculation_duration_ms"`
}

// =============================================================================
// Cash Flow DTOs
// =============================================================================

// CashFlowResponse represents a single cash flow item
type CashFlowResponse struct {
	Category    string  `json:"category"`
	Type        string  `json:"type"`
	Amount      float64 `json:"amount"`
	Description string  `json:"description"`
	TaxImpact   float64 `json:"tax_impact"`
}

// YearCashFlowResponse represents all cash flows for a single year
type YearCashFlowResponse struct {
	Year int `json:"year"`
	Age  int `json:"age"`

	// Income
	Income IncomeBreakdownResponse `json:"income"`

	// Withdrawals
	Withdrawals AccountWithdrawalsResponse `json:"withdrawals"`

	// Expenses
	Expenses ExpenseBreakdownResponse `json:"expenses"`

	// Taxes
	Taxes TaxBreakdownResponse `json:"taxes"`

	// Savings
	Savings AccountContributionsResponse `json:"savings"`

	// Net flows
	NetCashFlow       float64 `json:"net_cash_flow"`
	CumulativeSurplus float64 `json:"cumulative_surplus"`

	// Portfolio state
	TotalPortfolio float64 `json:"total_portfolio"`
	IsRetired      bool    `json:"is_retired"`
}

// CashFlowResultsResponse represents complete cash flow analysis results
type CashFlowResultsResponse struct {
	// Year-by-year cash flows
	YearlyFlows []YearCashFlowResponse `json:"yearly_flows"`

	// Aggregated totals
	TotalLifetimeIncome      float64 `json:"total_lifetime_income"`
	TotalLifetimeExpenses    float64 `json:"total_lifetime_expenses"`
	TotalLifetimeTax         float64 `json:"total_lifetime_tax"`
	TotalLifetimeSavings     float64 `json:"total_lifetime_savings"`
	TotalLifetimeWithdrawals float64 `json:"total_lifetime_withdrawals"`

	// Tax analysis
	LifetimeTaxAnalysis     TaxImpactResponse `json:"lifetime_tax_analysis"`
	AverageEffectiveTaxRate float64           `json:"average_effective_tax_rate"`

	// Sankey diagram data
	AccumulationSankey SankeyDataResponse `json:"accumulation_sankey"`
	RetirementSankey   SankeyDataResponse `json:"retirement_sankey"`

	// Summary metrics
	YearsOfData          int     `json:"years_of_data"`
	RetirementReadiness  float64 `json:"retirement_readiness"`
	ExpensesCoveredYears int     `json:"expenses_covered_years"`

	// Calculation metadata
	CalculationDurationMs int64 `json:"calculation_duration_ms"`
}

// SankeyNodeResponse represents a node in a Sankey diagram
type SankeyNodeResponse struct {
	ID       string  `json:"id"`
	Label    string  `json:"label"`
	Category string  `json:"category"`
	Value    float64 `json:"value"`
}

// SankeyLinkResponse represents a link in a Sankey diagram
type SankeyLinkResponse struct {
	Source string  `json:"source"`
	Target string  `json:"target"`
	Value  float64 `json:"value"`
	Label  string  `json:"label,omitempty"`
}

// SankeyDataResponse represents complete Sankey diagram data
type SankeyDataResponse struct {
	Nodes []SankeyNodeResponse `json:"nodes"`
	Links []SankeyLinkResponse `json:"links"`
}

// =============================================================================
// Monte Carlo Simulation DTOs
// =============================================================================

// SimulationResultResponse represents a single simulation run result
type SimulationResultResponse struct {
	FinalValue         float64 `json:"final_value"`
	Success            bool    `json:"success"`
	DepletionYear      int     `json:"depletion_year"`
	PeakValue          float64 `json:"peak_value"`
	MinRetirementValue float64 `json:"min_retirement_value"`
}

// PercentileResultsResponse represents portfolio values at various percentiles
type PercentileResultsResponse struct {
	P5  float64 `json:"p5"`
	P10 float64 `json:"p10"`
	P25 float64 `json:"p25"`
	P50 float64 `json:"p50"`
	P75 float64 `json:"p75"`
	P90 float64 `json:"p90"`
	P95 float64 `json:"p95"`
}

// MonteCarloResultsResponse represents aggregate Monte Carlo simulation results
type MonteCarloResultsResponse struct {
	SuccessProbability   float64                   `json:"success_probability"`
	SuccessCount         int                       `json:"success_count"`
	TotalSimulations     int                       `json:"total_simulations"`
	Percentiles          PercentileResultsResponse `json:"percentiles"`
	AverageFinalValue    float64                   `json:"average_final_value"`
	MedianFinalValue     float64                   `json:"median_final_value"`
	FinalValueStdDev     float64                   `json:"final_value_std_dev"`
	AverageDepletionYear float64                   `json:"average_depletion_year"`
	CalculationDurationMs int64                    `json:"calculation_duration_ms"`
}

// =============================================================================
// FIRE Calculation DTOs
// =============================================================================

// FIREType represents different FIRE movement strategies
type FIREType string

const (
	FIRETypeTraditional FIREType = "traditional" // 4% rule
	FIRETypeLean        FIREType = "lean"        // Minimal expenses
	FIRETypeFat         FIREType = "fat"         // Higher spending
	FIRETypeBarista     FIREType = "barista"     // Part-time income
	FIRETypeCoast       FIREType = "coast"       // Stop contributing, let compound
)

// FIRECalculationRequest represents input for FIRE calculations
type FIRECalculationRequest struct {
	// Current financial status
	CurrentAge     int     `json:"current_age"`
	AnnualIncome   float64 `json:"annual_income"`
	AnnualExpenses float64 `json:"annual_expenses"`
	TotalSavings   float64 `json:"total_savings"`
	SavingsRate    float64 `json:"savings_rate"`

	// Assumptions
	ExpectedReturn float64 `json:"expected_return"`
	InflationRate  float64 `json:"inflation_rate"`
	SafeWithdrawal float64 `json:"safe_withdrawal_rate"`

	// FIRE type
	FIREType FIREType `json:"fire_type"`

	// Additional income (for Barista FIRE)
	PartTimeIncome float64 `json:"part_time_income,omitempty"`

	// Target retirement age (for Coast FIRE)
	TargetRetirementAge int `json:"target_retirement_age,omitempty"`
}

// FIREResultResponse represents FIRE calculation results
type FIREResultResponse struct {
	// Core results
	FIRENumber       float64 `json:"fire_number"`
	YearsToFIRE      float64 `json:"years_to_fire"`
	FIREAge          int     `json:"fire_age"`
	CurrentProgress  float64 `json:"current_progress"` // 0-1 percentage

	// Financial metrics
	AnnualSavings       float64 `json:"annual_savings"`
	ProjectedSavingsAtFIRE float64 `json:"projected_savings_at_fire"`
	SafeAnnualWithdrawal   float64 `json:"safe_annual_withdrawal"`

	// Sensitivity analysis
	YearsIfReturnLower  float64 `json:"years_if_return_lower"`  // -2% return
	YearsIfReturnHigher float64 `json:"years_if_return_higher"` // +2% return
	YearsIfExpenseMore  float64 `json:"years_if_expense_more"`  // +20% expenses
	YearsIfExpenseLess  float64 `json:"years_if_expense_less"`  // -20% expenses

	// FIRE type specific
	FIREType        FIREType `json:"fire_type"`
	CoastFIRENumber float64  `json:"coast_fire_number,omitempty"` // For Coast FIRE
	PartTimeYears   float64  `json:"part_time_years,omitempty"`   // For Barista FIRE
}

// FIREMilestoneResponse represents a milestone on the FIRE journey
type FIREMilestoneResponse struct {
	Name           string  `json:"name"`
	TargetAmount   float64 `json:"target_amount"`
	CurrentAmount  float64 `json:"current_amount"`
	Progress       float64 `json:"progress"` // 0-1 percentage
	YearsToReach   float64 `json:"years_to_reach"`
	Description    string  `json:"description"`
}

// FIRETimelineResponse represents the FIRE journey timeline
type FIRETimelineResponse struct {
	Milestones        []FIREMilestoneResponse `json:"milestones"`
	YearlyProjections []FIREYearResponse      `json:"yearly_projections"`
	FIREResult        FIREResultResponse      `json:"fire_result"`
}

// FIREYearResponse represents a single year in the FIRE projection
type FIREYearResponse struct {
	Year            int     `json:"year"`
	Age             int     `json:"age"`
	StartBalance    float64 `json:"start_balance"`
	Contributions   float64 `json:"contributions"`
	InvestmentGrowth float64 `json:"investment_growth"`
	EndBalance      float64 `json:"end_balance"`
	FIREProgress    float64 `json:"fire_progress"` // 0-1 percentage
	IsFIREReached   bool    `json:"is_fire_reached"`
}

// =============================================================================
// SEPP/72(t) DTOs
// =============================================================================

// SEPPMethodType represents SEPP calculation methods
type SEPPMethodType string

const (
	SEPPMethodRMD              SEPPMethodType = "rmd"               // Required Minimum Distribution
	SEPPMethodFixedAmortization SEPPMethodType = "fixed_amortization"
	SEPPMethodFixedAnnuitization SEPPMethodType = "fixed_annuitization"
)

// SEPPResultResponse represents SEPP calculation result
type SEPPResultResponse struct {
	AnnualDistribution float64        `json:"annual_distribution"`
	Method             SEPPMethodType `json:"method"`
	AccountBalance     float64        `json:"account_balance"`
	Age                int            `json:"age"`
	InterestRate       float64        `json:"interest_rate"`
	LifeExpectancy     float64        `json:"life_expectancy"`
}

// SEPPComparisonResponse compares all SEPP methods
type SEPPComparisonResponse struct {
	RMD              SEPPResultResponse `json:"rmd"`
	FixedAmortization SEPPResultResponse `json:"fixed_amortization"`
	FixedAnnuitization SEPPResultResponse `json:"fixed_annuitization"`
	RecommendedMethod SEPPMethodType    `json:"recommended_method"`
	Recommendation    string            `json:"recommendation"`
}

// =============================================================================
// Roth Conversion DTOs
// =============================================================================

// RothConversionPlanResponse represents a planned Roth conversion
type RothConversionPlanResponse struct {
	Year             int     `json:"year"`
	Age              int     `json:"age"`
	ConversionAmount float64 `json:"conversion_amount"`
	TaxOwed          float64 `json:"tax_owed"`
	AccessibleYear   int     `json:"accessible_year"`
	TaxBracket       float64 `json:"tax_bracket"`
}

// RothConversionLadderResponse represents a Roth conversion ladder strategy
type RothConversionLadderResponse struct {
	Conversions            []RothConversionPlanResponse `json:"conversions"`
	TotalConverted         float64                      `json:"total_converted"`
	TotalTaxPaid           float64                      `json:"total_tax_paid"`
	EffectiveTaxRate       float64                      `json:"effective_tax_rate"`
	YearsToComplete        int                          `json:"years_to_complete"`
	FirstAccessibleYear    int                          `json:"first_accessible_year"`
	RecommendedAnnualAmount float64                     `json:"recommended_annual_amount"`
}

// =============================================================================
// Retirement Readiness DTOs
// =============================================================================

// RetirementReadinessResponse represents overall retirement readiness assessment
type RetirementReadinessResponse struct {
	// Overall score (0-100)
	OverallScore int `json:"overall_score"`

	// Component scores
	SavingsScore     int `json:"savings_score"`
	IncomeScore      int `json:"income_score"`
	ExpenseScore     int `json:"expense_score"`
	DiversityScore   int `json:"diversity_score"`
	TimelineScore    int `json:"timeline_score"`

	// Key metrics
	YearsOfExpensesCovered float64 `json:"years_of_expenses_covered"`
	IncomeReplacementRatio float64 `json:"income_replacement_ratio"`
	SuccessProbability     float64 `json:"success_probability"`

	// Recommendations
	Recommendations []RecommendationResponse `json:"recommendations"`

	// Status
	Status      string `json:"status"` // "on_track", "needs_attention", "at_risk"
	StatusColor string `json:"status_color"` // "green", "yellow", "red"
}

// RecommendationResponse represents a single recommendation
type RecommendationResponse struct {
	Priority    string  `json:"priority"` // "high", "medium", "low"
	Category    string  `json:"category"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Impact      string  `json:"impact"`
	Savings     float64 `json:"savings,omitempty"`
}

// =============================================================================
// Strategy Comparison DTOs
// =============================================================================

// StrategyComparisonResponse compares different withdrawal strategies
type StrategyComparisonResponse struct {
	Strategies []StrategyResultResponse `json:"strategies"`
	Recommended StrategyResultResponse  `json:"recommended"`
	Comparison  string                   `json:"comparison"`
}

// StrategyResultResponse represents results for a single strategy
type StrategyResultResponse struct {
	Strategy            WithdrawalStrategyType `json:"strategy"`
	Name                string                 `json:"name"`
	Description         string                 `json:"description"`
	FinalPortfolioValue float64                `json:"final_portfolio_value"`
	TotalTaxPaid        float64                `json:"total_tax_paid"`
	SuccessfulYears     int                    `json:"successful_years"`
	PortfolioDepletionAge int                  `json:"portfolio_depletion_age"`
	EffectiveTaxRate    float64                `json:"effective_tax_rate"`
	IsRecommended       bool                   `json:"is_recommended"`
}
