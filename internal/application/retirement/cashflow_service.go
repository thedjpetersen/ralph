package retirement

import (
	"errors"
	"math"
	"time"
)

// FlowCategory represents the category of a cash flow
type FlowCategory string

const (
	// Income categories
	FlowCategoryEmploymentIncome   FlowCategory = "employment_income"
	FlowCategorySocialSecurity     FlowCategory = "social_security"
	FlowCategoryPension            FlowCategory = "pension"
	FlowCategoryInvestmentIncome   FlowCategory = "investment_income"
	FlowCategoryRentalIncome       FlowCategory = "rental_income"
	FlowCategoryOtherIncome        FlowCategory = "other_income"

	// Withdrawal categories
	FlowCategoryTaxableWithdrawal     FlowCategory = "taxable_withdrawal"
	FlowCategoryTraditionalWithdrawal FlowCategory = "traditional_withdrawal"
	FlowCategoryRothWithdrawal        FlowCategory = "roth_withdrawal"
	FlowCategoryHSAWithdrawal         FlowCategory = "hsa_withdrawal"

	// Expense categories
	FlowCategoryHousing       FlowCategory = "housing"
	FlowCategoryHealthcare    FlowCategory = "healthcare"
	FlowCategoryFood          FlowCategory = "food"
	FlowCategoryTransportation FlowCategory = "transportation"
	FlowCategoryUtilities     FlowCategory = "utilities"
	FlowCategoryInsurance     FlowCategory = "insurance"
	FlowCategoryDiscretionary FlowCategory = "discretionary"
	FlowCategoryOtherExpenses FlowCategory = "other_expenses"

	// Tax categories
	FlowCategoryFederalTax   FlowCategory = "federal_tax"
	FlowCategoryStateTax     FlowCategory = "state_tax"
	FlowCategoryFICATax      FlowCategory = "fica_tax"
	FlowCategoryCapitalGains FlowCategory = "capital_gains_tax"

	// Savings/Investment categories
	FlowCategoryTaxableSavings     FlowCategory = "taxable_savings"
	FlowCategoryTraditionalSavings FlowCategory = "traditional_savings"
	FlowCategoryRothSavings        FlowCategory = "roth_savings"
	FlowCategoryHSASavings         FlowCategory = "hsa_savings"
)

// FlowType represents whether a flow is income, expense, tax, or transfer
type FlowType string

const (
	FlowTypeIncome     FlowType = "income"
	FlowTypeExpense    FlowType = "expense"
	FlowTypeTax        FlowType = "tax"
	FlowTypeTransfer   FlowType = "transfer"
	FlowTypeSavings    FlowType = "savings"
	FlowTypeWithdrawal FlowType = "withdrawal"
)

// CashFlowConfig holds configuration for cash flow analysis
type CashFlowConfig struct {
	// Basic demographics
	CurrentAge     int
	RetirementAge  int
	LifeExpectancy int

	// Income sources
	EmploymentIncome         float64
	EmploymentIncomeGrowth   float64 // Annual growth rate (e.g., 0.03 for 3%)
	SocialSecurityBenefit    float64
	SocialSecurityStartAge   int
	PensionBenefit           float64
	PensionStartAge          int
	RentalIncome             float64
	OtherIncome              float64

	// Portfolio balances
	TaxableBalance     float64
	TraditionalBalance float64
	RothBalance        float64
	HSABalance         float64

	// Contribution rates (percentage of employment income)
	TaxableContributionRate     float64
	TraditionalContributionRate float64
	RothContributionRate        float64
	HSAContributionRate         float64

	// Fixed contributions (used when not employed)
	FixedTaxableContribution     float64
	FixedTraditionalContribution float64
	FixedRothContribution        float64
	FixedHSAContribution         float64

	// Expenses (annual amounts in today's dollars)
	HousingExpense        float64
	HealthcareExpense     float64
	FoodExpense           float64
	TransportationExpense float64
	UtilitiesExpense      float64
	InsuranceExpense      float64
	DiscretionaryExpense  float64
	OtherExpenses         float64

	// Expense growth rates (can differ from inflation)
	HealthcareGrowthRate float64 // Typically higher than general inflation

	// Market assumptions
	ExpectedReturn float64
	InflationRate  float64

	// Tax configuration
	FederalTaxRate     float64
	StateTaxRate       float64
	FICATaxRate        float64
	CapitalGainsRate   float64
	StateHasNoIncomeTax bool

	// Withdrawal strategy
	WithdrawalStrategy WithdrawalStrategy

	// Tax optimization settings
	UseTaxGainHarvesting  bool
	UseRothConversion     bool
	RothConversionAmount  float64
	RothConversionEndAge  int
}

// CashFlow represents a single cash flow item
type CashFlow struct {
	Category    FlowCategory
	Type        FlowType
	Amount      float64
	Description string
	TaxImpact   float64 // Tax generated or saved by this flow
}

// SankeyNode represents a node in the Sankey diagram
type SankeyNode struct {
	ID       string       `json:"id"`
	Label    string       `json:"label"`
	Category FlowType     `json:"category"`
	Value    float64      `json:"value"`
}

// SankeyLink represents a link between nodes in the Sankey diagram
type SankeyLink struct {
	Source string  `json:"source"`
	Target string  `json:"target"`
	Value  float64 `json:"value"`
	Label  string  `json:"label,omitempty"`
}

// SankeyData represents complete data for a Sankey diagram
type SankeyData struct {
	Nodes []SankeyNode `json:"nodes"`
	Links []SankeyLink `json:"links"`
}

// YearCashFlow represents all cash flows for a single year
type YearCashFlow struct {
	Year int
	Age  int

	// Income flows
	EmploymentIncome   float64
	SocialSecurity     float64
	Pension            float64
	InvestmentIncome   float64
	RentalIncome       float64
	OtherIncome        float64
	TotalIncome        float64

	// Withdrawal flows
	TaxableWithdrawal     float64
	TraditionalWithdrawal float64
	RothWithdrawal        float64
	HSAWithdrawal         float64
	TotalWithdrawals      float64

	// Expense flows
	HousingExpense        float64
	HealthcareExpense     float64
	FoodExpense           float64
	TransportationExpense float64
	UtilitiesExpense      float64
	InsuranceExpense      float64
	DiscretionaryExpense  float64
	OtherExpenses         float64
	TotalExpenses         float64

	// Tax flows
	FederalTax       float64
	StateTax         float64
	FICATax          float64
	CapitalGainsTax  float64
	TotalTax         float64

	// Savings flows
	TaxableSavings     float64
	TraditionalSavings float64
	RothSavings        float64
	HSASavings         float64
	TotalSavings       float64

	// Net flows
	NetCashFlow    float64
	CumulativeSurplus float64

	// Portfolio state
	TotalPortfolio float64
	IsRetired      bool
}

// TaxImpactAnalysis represents the tax impact for a scenario
type TaxImpactAnalysis struct {
	// Current year tax metrics
	GrossIncome        float64
	TaxableIncome      float64
	EffectiveTaxRate   float64
	MarginalTaxRate    float64
	TotalTaxLiability  float64

	// Tax breakdown
	FederalTax     float64
	StateTax       float64
	FICATax        float64
	CapitalGainsTax float64

	// Tax-advantaged benefits
	TraditionalTaxSavings float64 // Tax savings from traditional contributions
	RothTaxBenefit        float64 // Estimated future tax benefit from Roth
	HSATaxBenefit         float64 // Triple tax advantage from HSA

	// Optimization suggestions
	RothConversionOpportunity float64 // Amount that could be converted in lower bracket
	TaxLossHarvestingAmount   float64 // Potential tax loss harvesting
	AdditionalTraditionalRoom float64 // Room to contribute more to traditional
}

// CashFlowResults holds the complete cash flow analysis results
type CashFlowResults struct {
	// Year-by-year cash flows
	YearlyFlows []YearCashFlow

	// Aggregated totals
	TotalLifetimeIncome      float64
	TotalLifetimeExpenses    float64
	TotalLifetimeTax         float64
	TotalLifetimeSavings     float64
	TotalLifetimeWithdrawals float64

	// Tax analysis
	LifetimeTaxAnalysis TaxImpactAnalysis
	AverageEffectiveTaxRate float64

	// Sankey diagram data
	AccumulationSankey SankeyData
	RetirementSankey   SankeyData

	// Summary metrics
	YearsOfData         int
	RetirementReadiness float64 // 0-1 score
	ExpensesCoveredYears int

	// Calculation duration
	Duration time.Duration
}

// CashFlowService provides cash flow analysis for retirement planning
type CashFlowService struct {
	config CashFlowConfig
}

// DefaultCashFlowConfig returns a CashFlowConfig with reasonable defaults
func DefaultCashFlowConfig() CashFlowConfig {
	return CashFlowConfig{
		CurrentAge:     35,
		RetirementAge:  65,
		LifeExpectancy: 95,

		EmploymentIncome:       100000,
		EmploymentIncomeGrowth: 0.03,
		SocialSecurityBenefit:  24000,
		SocialSecurityStartAge: 67,
		PensionBenefit:         0,
		PensionStartAge:        0,
		RentalIncome:           0,
		OtherIncome:            0,

		TaxableBalance:     50000,
		TraditionalBalance: 200000,
		RothBalance:        50000,
		HSABalance:         10000,

		TraditionalContributionRate: 0.15, // 15% of income
		RothContributionRate:        0.05, // 5% of income
		HSAContributionRate:         0.03, // 3% of income
		TaxableContributionRate:     0.05, // 5% of income

		HousingExpense:        24000,
		HealthcareExpense:     6000,
		FoodExpense:           9600,
		TransportationExpense: 9600,
		UtilitiesExpense:      3600,
		InsuranceExpense:      6000,
		DiscretionaryExpense:  12000,
		OtherExpenses:         4200,

		HealthcareGrowthRate: 0.05, // Healthcare typically grows faster than inflation

		ExpectedReturn: 0.07,
		InflationRate:  0.025,

		FederalTaxRate:   0.22,
		StateTaxRate:     0.05,
		FICATaxRate:      0.0765,
		CapitalGainsRate: 0.15,

		WithdrawalStrategy: TaxOptimized,

		UseTaxGainHarvesting: true,
		UseRothConversion:    false,
		RothConversionAmount: 40000,
		RothConversionEndAge: 65,
	}
}

// NewCashFlowService creates a new cash flow analysis service
func NewCashFlowService(config CashFlowConfig) (*CashFlowService, error) {
	if err := validateCashFlowConfig(config); err != nil {
		return nil, err
	}

	return &CashFlowService{
		config: config,
	}, nil
}

// validateCashFlowConfig validates the cash flow configuration
func validateCashFlowConfig(config CashFlowConfig) error {
	if config.CurrentAge < 0 || config.CurrentAge > 120 {
		return errors.New("CurrentAge must be between 0 and 120")
	}
	if config.RetirementAge < config.CurrentAge {
		return errors.New("RetirementAge must be >= CurrentAge")
	}
	if config.LifeExpectancy <= config.RetirementAge {
		return errors.New("LifeExpectancy must be > RetirementAge")
	}
	if config.ExpectedReturn < -1 || config.ExpectedReturn > 1 {
		return errors.New("ExpectedReturn must be between -1 and 1")
	}
	if config.InflationRate < 0 || config.InflationRate > 1 {
		return errors.New("InflationRate must be between 0 and 1")
	}
	if config.SocialSecurityStartAge != 0 &&
		(config.SocialSecurityStartAge < 62 || config.SocialSecurityStartAge > 70) {
		return errors.New("SocialSecurityStartAge must be between 62 and 70")
	}
	return nil
}

// RunAnalysis executes the cash flow analysis and returns results
func (s *CashFlowService) RunAnalysis() (*CashFlowResults, error) {
	return s.RunAnalysisWithConfig(s.config)
}

// RunAnalysisWithConfig executes cash flow analysis with custom config
func (s *CashFlowService) RunAnalysisWithConfig(config CashFlowConfig) (*CashFlowResults, error) {
	if err := validateCashFlowConfig(config); err != nil {
		return nil, err
	}

	startTime := time.Now()

	totalYears := config.LifeExpectancy - config.CurrentAge
	yearlyFlows := make([]YearCashFlow, totalYears)

	// Initialize portfolio balances
	taxable := config.TaxableBalance
	traditional := config.TraditionalBalance
	roth := config.RothBalance
	hsa := config.HSABalance

	// Tracking variables
	var (
		totalIncome      float64
		totalExpenses    float64
		totalTax         float64
		totalSavings     float64
		totalWithdrawals float64
		cumulativeSurplus float64
	)

	for year := range totalYears {
		age := config.CurrentAge + year
		isRetired := age >= config.RetirementAge
		inflationFactor := math.Pow(1+config.InflationRate, float64(year))
		healthcareInflation := math.Pow(1+config.HealthcareGrowthRate, float64(year))

		yearFlow := YearCashFlow{
			Year:      year + 1,
			Age:       age,
			IsRetired: isRetired,
		}

		// Calculate income
		if !isRetired {
			// Employment income with growth
			yearFlow.EmploymentIncome = config.EmploymentIncome * math.Pow(1+config.EmploymentIncomeGrowth, float64(year))
		}

		if config.SocialSecurityStartAge > 0 && age >= config.SocialSecurityStartAge {
			yearFlow.SocialSecurity = config.SocialSecurityBenefit * inflationFactor
		}

		if config.PensionStartAge > 0 && age >= config.PensionStartAge {
			yearFlow.Pension = config.PensionBenefit * inflationFactor
		}

		// Investment income (dividends, interest) - assume 2% of taxable portfolio
		yearFlow.InvestmentIncome = taxable * 0.02

		yearFlow.RentalIncome = config.RentalIncome * inflationFactor
		yearFlow.OtherIncome = config.OtherIncome * inflationFactor

		yearFlow.TotalIncome = yearFlow.EmploymentIncome + yearFlow.SocialSecurity +
			yearFlow.Pension + yearFlow.InvestmentIncome + yearFlow.RentalIncome + yearFlow.OtherIncome

		// Calculate expenses (inflation-adjusted)
		yearFlow.HousingExpense = config.HousingExpense * inflationFactor
		yearFlow.HealthcareExpense = config.HealthcareExpense * healthcareInflation
		yearFlow.FoodExpense = config.FoodExpense * inflationFactor
		yearFlow.TransportationExpense = config.TransportationExpense * inflationFactor
		yearFlow.UtilitiesExpense = config.UtilitiesExpense * inflationFactor
		yearFlow.InsuranceExpense = config.InsuranceExpense * inflationFactor
		yearFlow.DiscretionaryExpense = config.DiscretionaryExpense * inflationFactor
		yearFlow.OtherExpenses = config.OtherExpenses * inflationFactor

		yearFlow.TotalExpenses = yearFlow.HousingExpense + yearFlow.HealthcareExpense +
			yearFlow.FoodExpense + yearFlow.TransportationExpense + yearFlow.UtilitiesExpense +
			yearFlow.InsuranceExpense + yearFlow.DiscretionaryExpense + yearFlow.OtherExpenses

		// Calculate taxes
		taxAnalysis := s.CalculateTaxImpact(yearFlow, config, isRetired)
		yearFlow.FederalTax = taxAnalysis.FederalTax
		yearFlow.StateTax = taxAnalysis.StateTax
		yearFlow.FICATax = taxAnalysis.FICATax
		yearFlow.CapitalGainsTax = taxAnalysis.CapitalGainsTax
		yearFlow.TotalTax = taxAnalysis.TotalTaxLiability

		// Calculate savings/contributions
		if !isRetired && yearFlow.EmploymentIncome > 0 {
			yearFlow.TaxableSavings = yearFlow.EmploymentIncome * config.TaxableContributionRate
			yearFlow.TraditionalSavings = yearFlow.EmploymentIncome * config.TraditionalContributionRate
			yearFlow.RothSavings = yearFlow.EmploymentIncome * config.RothContributionRate
			yearFlow.HSASavings = yearFlow.EmploymentIncome * config.HSAContributionRate
		} else if !isRetired {
			yearFlow.TaxableSavings = config.FixedTaxableContribution
			yearFlow.TraditionalSavings = config.FixedTraditionalContribution
			yearFlow.RothSavings = config.FixedRothContribution
			yearFlow.HSASavings = config.FixedHSAContribution
		}
		yearFlow.TotalSavings = yearFlow.TaxableSavings + yearFlow.TraditionalSavings +
			yearFlow.RothSavings + yearFlow.HSASavings

		// Calculate withdrawals needed in retirement
		if isRetired {
			netNeeded := yearFlow.TotalExpenses + yearFlow.TotalTax - yearFlow.TotalIncome
			if netNeeded > 0 {
				withdrawals := s.CalculateWithdrawals(netNeeded, taxable, traditional, roth, hsa, config)
				yearFlow.TaxableWithdrawal = withdrawals.TaxableWithdrawal
				yearFlow.TraditionalWithdrawal = withdrawals.TraditionalWithdrawal
				yearFlow.RothWithdrawal = withdrawals.RothWithdrawal
				yearFlow.HSAWithdrawal = withdrawals.HSAWithdrawal
				yearFlow.TotalWithdrawals = withdrawals.TotalWithdrawal

				// Update account balances
				taxable -= withdrawals.TaxableWithdrawal
				traditional -= withdrawals.TraditionalWithdrawal
				roth -= withdrawals.RothWithdrawal
				hsa -= withdrawals.HSAWithdrawal
			}
		} else {
			// Add savings to accounts
			taxable += yearFlow.TaxableSavings
			traditional += yearFlow.TraditionalSavings
			roth += yearFlow.RothSavings
			hsa += yearFlow.HSASavings
		}

		// Apply investment growth
		taxable *= (1 + config.ExpectedReturn)
		traditional *= (1 + config.ExpectedReturn)
		roth *= (1 + config.ExpectedReturn)
		hsa *= (1 + config.ExpectedReturn)

		// Ensure no negative balances
		taxable = math.Max(0, taxable)
		traditional = math.Max(0, traditional)
		roth = math.Max(0, roth)
		hsa = math.Max(0, hsa)

		yearFlow.TotalPortfolio = taxable + traditional + roth + hsa

		// Calculate net cash flow
		yearFlow.NetCashFlow = yearFlow.TotalIncome + yearFlow.TotalWithdrawals -
			yearFlow.TotalExpenses - yearFlow.TotalTax - yearFlow.TotalSavings

		cumulativeSurplus += yearFlow.NetCashFlow
		yearFlow.CumulativeSurplus = cumulativeSurplus

		// Track totals
		totalIncome += yearFlow.TotalIncome
		totalExpenses += yearFlow.TotalExpenses
		totalTax += yearFlow.TotalTax
		totalSavings += yearFlow.TotalSavings
		totalWithdrawals += yearFlow.TotalWithdrawals

		yearlyFlows[year] = yearFlow
	}

	// Generate Sankey diagrams
	accumulationSankey := s.GenerateSankeyData(yearlyFlows, false)
	retirementSankey := s.GenerateSankeyData(yearlyFlows, true)

	// Calculate retirement readiness
	retirementReadiness := s.calculateRetirementReadiness(yearlyFlows, config)

	// Count years expenses are covered
	expensesCovered := 0
	for _, flow := range yearlyFlows {
		if flow.IsRetired && flow.TotalPortfolio > 0 {
			expensesCovered++
		}
	}

	results := &CashFlowResults{
		YearlyFlows:              yearlyFlows,
		TotalLifetimeIncome:      totalIncome,
		TotalLifetimeExpenses:    totalExpenses,
		TotalLifetimeTax:         totalTax,
		TotalLifetimeSavings:     totalSavings,
		TotalLifetimeWithdrawals: totalWithdrawals,
		AccumulationSankey:       accumulationSankey,
		RetirementSankey:         retirementSankey,
		YearsOfData:              totalYears,
		RetirementReadiness:      retirementReadiness,
		ExpensesCoveredYears:     expensesCovered,
		Duration:                 time.Since(startTime),
	}

	// Calculate average effective tax rate
	if totalIncome > 0 {
		results.AverageEffectiveTaxRate = totalTax / totalIncome
	}

	return results, nil
}

// GenerateSankeyData creates Sankey diagram data from yearly cash flows
func (s *CashFlowService) GenerateSankeyData(yearlyFlows []YearCashFlow, retirementOnly bool) SankeyData {
	// Aggregate flows based on phase
	var aggregateFlow YearCashFlow
	count := 0

	for _, flow := range yearlyFlows {
		if retirementOnly && !flow.IsRetired {
			continue
		}
		if !retirementOnly && flow.IsRetired {
			continue
		}

		aggregateFlow.EmploymentIncome += flow.EmploymentIncome
		aggregateFlow.SocialSecurity += flow.SocialSecurity
		aggregateFlow.Pension += flow.Pension
		aggregateFlow.InvestmentIncome += flow.InvestmentIncome
		aggregateFlow.RentalIncome += flow.RentalIncome
		aggregateFlow.OtherIncome += flow.OtherIncome

		aggregateFlow.TaxableWithdrawal += flow.TaxableWithdrawal
		aggregateFlow.TraditionalWithdrawal += flow.TraditionalWithdrawal
		aggregateFlow.RothWithdrawal += flow.RothWithdrawal
		aggregateFlow.HSAWithdrawal += flow.HSAWithdrawal

		aggregateFlow.HousingExpense += flow.HousingExpense
		aggregateFlow.HealthcareExpense += flow.HealthcareExpense
		aggregateFlow.FoodExpense += flow.FoodExpense
		aggregateFlow.TransportationExpense += flow.TransportationExpense
		aggregateFlow.UtilitiesExpense += flow.UtilitiesExpense
		aggregateFlow.InsuranceExpense += flow.InsuranceExpense
		aggregateFlow.DiscretionaryExpense += flow.DiscretionaryExpense
		aggregateFlow.OtherExpenses += flow.OtherExpenses

		aggregateFlow.FederalTax += flow.FederalTax
		aggregateFlow.StateTax += flow.StateTax
		aggregateFlow.FICATax += flow.FICATax
		aggregateFlow.CapitalGainsTax += flow.CapitalGainsTax

		aggregateFlow.TaxableSavings += flow.TaxableSavings
		aggregateFlow.TraditionalSavings += flow.TraditionalSavings
		aggregateFlow.RothSavings += flow.RothSavings
		aggregateFlow.HSASavings += flow.HSASavings

		count++
	}

	// Build nodes
	nodes := []SankeyNode{}
	links := []SankeyLink{}

	// Income nodes
	totalIncome := 0.0
	if aggregateFlow.EmploymentIncome > 0 {
		nodes = append(nodes, SankeyNode{ID: "employment", Label: "Employment Income", Category: FlowTypeIncome, Value: aggregateFlow.EmploymentIncome})
		totalIncome += aggregateFlow.EmploymentIncome
	}
	if aggregateFlow.SocialSecurity > 0 {
		nodes = append(nodes, SankeyNode{ID: "social_security", Label: "Social Security", Category: FlowTypeIncome, Value: aggregateFlow.SocialSecurity})
		totalIncome += aggregateFlow.SocialSecurity
	}
	if aggregateFlow.Pension > 0 {
		nodes = append(nodes, SankeyNode{ID: "pension", Label: "Pension", Category: FlowTypeIncome, Value: aggregateFlow.Pension})
		totalIncome += aggregateFlow.Pension
	}
	if aggregateFlow.InvestmentIncome > 0 {
		nodes = append(nodes, SankeyNode{ID: "investment_income", Label: "Investment Income", Category: FlowTypeIncome, Value: aggregateFlow.InvestmentIncome})
		totalIncome += aggregateFlow.InvestmentIncome
	}
	if aggregateFlow.RentalIncome > 0 {
		nodes = append(nodes, SankeyNode{ID: "rental", Label: "Rental Income", Category: FlowTypeIncome, Value: aggregateFlow.RentalIncome})
		totalIncome += aggregateFlow.RentalIncome
	}
	if aggregateFlow.OtherIncome > 0 {
		nodes = append(nodes, SankeyNode{ID: "other_income", Label: "Other Income", Category: FlowTypeIncome, Value: aggregateFlow.OtherIncome})
		totalIncome += aggregateFlow.OtherIncome
	}

	// Withdrawal nodes (retirement only)
	totalWithdrawals := 0.0
	if aggregateFlow.TaxableWithdrawal > 0 {
		nodes = append(nodes, SankeyNode{ID: "taxable_withdrawal", Label: "Taxable Account", Category: FlowTypeWithdrawal, Value: aggregateFlow.TaxableWithdrawal})
		totalWithdrawals += aggregateFlow.TaxableWithdrawal
	}
	if aggregateFlow.TraditionalWithdrawal > 0 {
		nodes = append(nodes, SankeyNode{ID: "traditional_withdrawal", Label: "Traditional 401k/IRA", Category: FlowTypeWithdrawal, Value: aggregateFlow.TraditionalWithdrawal})
		totalWithdrawals += aggregateFlow.TraditionalWithdrawal
	}
	if aggregateFlow.RothWithdrawal > 0 {
		nodes = append(nodes, SankeyNode{ID: "roth_withdrawal", Label: "Roth 401k/IRA", Category: FlowTypeWithdrawal, Value: aggregateFlow.RothWithdrawal})
		totalWithdrawals += aggregateFlow.RothWithdrawal
	}
	if aggregateFlow.HSAWithdrawal > 0 {
		nodes = append(nodes, SankeyNode{ID: "hsa_withdrawal", Label: "HSA", Category: FlowTypeWithdrawal, Value: aggregateFlow.HSAWithdrawal})
		totalWithdrawals += aggregateFlow.HSAWithdrawal
	}

	// Central pool node
	totalPool := totalIncome + totalWithdrawals
	if totalPool > 0 {
		nodes = append(nodes, SankeyNode{ID: "total_pool", Label: "Total Available", Category: FlowTypeTransfer, Value: totalPool})
	}

	// Create income links to pool
	if aggregateFlow.EmploymentIncome > 0 {
		links = append(links, SankeyLink{Source: "employment", Target: "total_pool", Value: aggregateFlow.EmploymentIncome})
	}
	if aggregateFlow.SocialSecurity > 0 {
		links = append(links, SankeyLink{Source: "social_security", Target: "total_pool", Value: aggregateFlow.SocialSecurity})
	}
	if aggregateFlow.Pension > 0 {
		links = append(links, SankeyLink{Source: "pension", Target: "total_pool", Value: aggregateFlow.Pension})
	}
	if aggregateFlow.InvestmentIncome > 0 {
		links = append(links, SankeyLink{Source: "investment_income", Target: "total_pool", Value: aggregateFlow.InvestmentIncome})
	}
	if aggregateFlow.RentalIncome > 0 {
		links = append(links, SankeyLink{Source: "rental", Target: "total_pool", Value: aggregateFlow.RentalIncome})
	}
	if aggregateFlow.OtherIncome > 0 {
		links = append(links, SankeyLink{Source: "other_income", Target: "total_pool", Value: aggregateFlow.OtherIncome})
	}

	// Create withdrawal links to pool
	if aggregateFlow.TaxableWithdrawal > 0 {
		links = append(links, SankeyLink{Source: "taxable_withdrawal", Target: "total_pool", Value: aggregateFlow.TaxableWithdrawal})
	}
	if aggregateFlow.TraditionalWithdrawal > 0 {
		links = append(links, SankeyLink{Source: "traditional_withdrawal", Target: "total_pool", Value: aggregateFlow.TraditionalWithdrawal})
	}
	if aggregateFlow.RothWithdrawal > 0 {
		links = append(links, SankeyLink{Source: "roth_withdrawal", Target: "total_pool", Value: aggregateFlow.RothWithdrawal})
	}
	if aggregateFlow.HSAWithdrawal > 0 {
		links = append(links, SankeyLink{Source: "hsa_withdrawal", Target: "total_pool", Value: aggregateFlow.HSAWithdrawal})
	}

	// Tax nodes
	totalTax := aggregateFlow.FederalTax + aggregateFlow.StateTax + aggregateFlow.FICATax + aggregateFlow.CapitalGainsTax
	if totalTax > 0 {
		nodes = append(nodes, SankeyNode{ID: "taxes", Label: "Taxes", Category: FlowTypeTax, Value: totalTax})
		links = append(links, SankeyLink{Source: "total_pool", Target: "taxes", Value: totalTax})
	}

	if aggregateFlow.FederalTax > 0 {
		nodes = append(nodes, SankeyNode{ID: "federal_tax", Label: "Federal Tax", Category: FlowTypeTax, Value: aggregateFlow.FederalTax})
		links = append(links, SankeyLink{Source: "taxes", Target: "federal_tax", Value: aggregateFlow.FederalTax})
	}
	if aggregateFlow.StateTax > 0 {
		nodes = append(nodes, SankeyNode{ID: "state_tax", Label: "State Tax", Category: FlowTypeTax, Value: aggregateFlow.StateTax})
		links = append(links, SankeyLink{Source: "taxes", Target: "state_tax", Value: aggregateFlow.StateTax})
	}
	if aggregateFlow.FICATax > 0 {
		nodes = append(nodes, SankeyNode{ID: "fica_tax", Label: "FICA Tax", Category: FlowTypeTax, Value: aggregateFlow.FICATax})
		links = append(links, SankeyLink{Source: "taxes", Target: "fica_tax", Value: aggregateFlow.FICATax})
	}
	if aggregateFlow.CapitalGainsTax > 0 {
		nodes = append(nodes, SankeyNode{ID: "capital_gains_tax", Label: "Capital Gains Tax", Category: FlowTypeTax, Value: aggregateFlow.CapitalGainsTax})
		links = append(links, SankeyLink{Source: "taxes", Target: "capital_gains_tax", Value: aggregateFlow.CapitalGainsTax})
	}

	// Expense nodes
	totalExpenses := aggregateFlow.HousingExpense + aggregateFlow.HealthcareExpense +
		aggregateFlow.FoodExpense + aggregateFlow.TransportationExpense +
		aggregateFlow.UtilitiesExpense + aggregateFlow.InsuranceExpense +
		aggregateFlow.DiscretionaryExpense + aggregateFlow.OtherExpenses

	if totalExpenses > 0 {
		nodes = append(nodes, SankeyNode{ID: "expenses", Label: "Living Expenses", Category: FlowTypeExpense, Value: totalExpenses})
		links = append(links, SankeyLink{Source: "total_pool", Target: "expenses", Value: totalExpenses})
	}

	if aggregateFlow.HousingExpense > 0 {
		nodes = append(nodes, SankeyNode{ID: "housing", Label: "Housing", Category: FlowTypeExpense, Value: aggregateFlow.HousingExpense})
		links = append(links, SankeyLink{Source: "expenses", Target: "housing", Value: aggregateFlow.HousingExpense})
	}
	if aggregateFlow.HealthcareExpense > 0 {
		nodes = append(nodes, SankeyNode{ID: "healthcare", Label: "Healthcare", Category: FlowTypeExpense, Value: aggregateFlow.HealthcareExpense})
		links = append(links, SankeyLink{Source: "expenses", Target: "healthcare", Value: aggregateFlow.HealthcareExpense})
	}
	if aggregateFlow.FoodExpense > 0 {
		nodes = append(nodes, SankeyNode{ID: "food", Label: "Food", Category: FlowTypeExpense, Value: aggregateFlow.FoodExpense})
		links = append(links, SankeyLink{Source: "expenses", Target: "food", Value: aggregateFlow.FoodExpense})
	}
	if aggregateFlow.TransportationExpense > 0 {
		nodes = append(nodes, SankeyNode{ID: "transportation", Label: "Transportation", Category: FlowTypeExpense, Value: aggregateFlow.TransportationExpense})
		links = append(links, SankeyLink{Source: "expenses", Target: "transportation", Value: aggregateFlow.TransportationExpense})
	}
	if aggregateFlow.UtilitiesExpense > 0 {
		nodes = append(nodes, SankeyNode{ID: "utilities", Label: "Utilities", Category: FlowTypeExpense, Value: aggregateFlow.UtilitiesExpense})
		links = append(links, SankeyLink{Source: "expenses", Target: "utilities", Value: aggregateFlow.UtilitiesExpense})
	}
	if aggregateFlow.InsuranceExpense > 0 {
		nodes = append(nodes, SankeyNode{ID: "insurance", Label: "Insurance", Category: FlowTypeExpense, Value: aggregateFlow.InsuranceExpense})
		links = append(links, SankeyLink{Source: "expenses", Target: "insurance", Value: aggregateFlow.InsuranceExpense})
	}
	if aggregateFlow.DiscretionaryExpense > 0 {
		nodes = append(nodes, SankeyNode{ID: "discretionary", Label: "Discretionary", Category: FlowTypeExpense, Value: aggregateFlow.DiscretionaryExpense})
		links = append(links, SankeyLink{Source: "expenses", Target: "discretionary", Value: aggregateFlow.DiscretionaryExpense})
	}
	if aggregateFlow.OtherExpenses > 0 {
		nodes = append(nodes, SankeyNode{ID: "other_expenses", Label: "Other Expenses", Category: FlowTypeExpense, Value: aggregateFlow.OtherExpenses})
		links = append(links, SankeyLink{Source: "expenses", Target: "other_expenses", Value: aggregateFlow.OtherExpenses})
	}

	// Savings nodes (accumulation phase only)
	totalSavings := aggregateFlow.TaxableSavings + aggregateFlow.TraditionalSavings +
		aggregateFlow.RothSavings + aggregateFlow.HSASavings

	if totalSavings > 0 {
		nodes = append(nodes, SankeyNode{ID: "savings", Label: "Savings", Category: FlowTypeSavings, Value: totalSavings})
		links = append(links, SankeyLink{Source: "total_pool", Target: "savings", Value: totalSavings})

		if aggregateFlow.TaxableSavings > 0 {
			nodes = append(nodes, SankeyNode{ID: "taxable_savings", Label: "Taxable Account", Category: FlowTypeSavings, Value: aggregateFlow.TaxableSavings})
			links = append(links, SankeyLink{Source: "savings", Target: "taxable_savings", Value: aggregateFlow.TaxableSavings})
		}
		if aggregateFlow.TraditionalSavings > 0 {
			nodes = append(nodes, SankeyNode{ID: "traditional_savings", Label: "Traditional 401k/IRA", Category: FlowTypeSavings, Value: aggregateFlow.TraditionalSavings})
			links = append(links, SankeyLink{Source: "savings", Target: "traditional_savings", Value: aggregateFlow.TraditionalSavings})
		}
		if aggregateFlow.RothSavings > 0 {
			nodes = append(nodes, SankeyNode{ID: "roth_savings", Label: "Roth 401k/IRA", Category: FlowTypeSavings, Value: aggregateFlow.RothSavings})
			links = append(links, SankeyLink{Source: "savings", Target: "roth_savings", Value: aggregateFlow.RothSavings})
		}
		if aggregateFlow.HSASavings > 0 {
			nodes = append(nodes, SankeyNode{ID: "hsa_savings", Label: "HSA", Category: FlowTypeSavings, Value: aggregateFlow.HSASavings})
			links = append(links, SankeyLink{Source: "savings", Target: "hsa_savings", Value: aggregateFlow.HSASavings})
		}
	}

	return SankeyData{
		Nodes: nodes,
		Links: links,
	}
}

// CalculateTaxImpact calculates detailed tax impact for a given cash flow year
func (s *CashFlowService) CalculateTaxImpact(yearFlow YearCashFlow, config CashFlowConfig, isRetired bool) TaxImpactAnalysis {
	analysis := TaxImpactAnalysis{}

	// Calculate gross income
	analysis.GrossIncome = yearFlow.EmploymentIncome + yearFlow.SocialSecurity +
		yearFlow.Pension + yearFlow.InvestmentIncome + yearFlow.RentalIncome +
		yearFlow.OtherIncome + yearFlow.TraditionalWithdrawal

	// Calculate taxable income (gross minus traditional contributions)
	traditionalDeduction := yearFlow.EmploymentIncome * config.TraditionalContributionRate
	hsaDeduction := yearFlow.EmploymentIncome * config.HSAContributionRate

	// Standard deduction (2024 values, married filing jointly)
	standardDeduction := 29200.0

	analysis.TaxableIncome = math.Max(0, analysis.GrossIncome-traditionalDeduction-hsaDeduction-standardDeduction)

	// Calculate federal tax using progressive brackets
	analysis.FederalTax = s.calculateProgressiveTax(analysis.TaxableIncome, getFederalTaxBrackets())

	// Calculate state tax (simplified flat rate)
	if !config.StateHasNoIncomeTax {
		analysis.StateTax = analysis.TaxableIncome * config.StateTaxRate
	}

	// FICA tax (only on employment income, up to Social Security wage base)
	if !isRetired && yearFlow.EmploymentIncome > 0 {
		socialSecurityWageBase := 168600.0 // 2024 limit
		socialSecurityTax := math.Min(yearFlow.EmploymentIncome, socialSecurityWageBase) * 0.062
		medicareTax := yearFlow.EmploymentIncome * 0.0145

		// Additional Medicare tax on high earners
		if yearFlow.EmploymentIncome > 200000 {
			medicareTax += (yearFlow.EmploymentIncome - 200000) * 0.009
		}

		analysis.FICATax = socialSecurityTax + medicareTax
	}

	// Capital gains tax on investment income
	if yearFlow.InvestmentIncome > 0 {
		// Assume qualified dividends and long-term gains get preferential rate
		analysis.CapitalGainsTax = yearFlow.InvestmentIncome * config.CapitalGainsRate
	}

	// Total tax liability
	analysis.TotalTaxLiability = analysis.FederalTax + analysis.StateTax + analysis.FICATax + analysis.CapitalGainsTax

	// Calculate effective and marginal rates
	if analysis.GrossIncome > 0 {
		analysis.EffectiveTaxRate = analysis.TotalTaxLiability / analysis.GrossIncome
	}
	analysis.MarginalTaxRate = s.getMarginalTaxRate(analysis.TaxableIncome)

	// Calculate tax-advantaged benefits
	analysis.TraditionalTaxSavings = traditionalDeduction * analysis.MarginalTaxRate
	analysis.HSATaxBenefit = hsaDeduction * analysis.MarginalTaxRate

	// Calculate Roth conversion opportunity (fill up to current bracket)
	currentBracketCeiling := s.getCurrentBracketCeiling(analysis.TaxableIncome)
	analysis.RothConversionOpportunity = math.Max(0, currentBracketCeiling-analysis.TaxableIncome)

	return analysis
}

// CalculateWithdrawals determines optimal withdrawal amounts from each account
func (s *CashFlowService) CalculateWithdrawals(
	needed float64,
	taxable, traditional, roth, hsa float64,
	config CashFlowConfig,
) WithdrawalResult {
	result := WithdrawalResult{}
	remaining := needed
	totalBalance := taxable + traditional + roth + hsa
	taxRate := config.FederalTaxRate + config.StateTaxRate

	if totalBalance <= 0 || remaining <= 0 {
		return result
	}

	switch config.WithdrawalStrategy {
	case TaxOptimized:
		// Tax-optimized: taxable first (favorable rates), then traditional, then Roth, HSA last
		if remaining > 0 && taxable > 0 {
			withdrawal := math.Min(remaining, taxable)
			result.TaxableWithdrawal = withdrawal
			remaining -= withdrawal
		}
		if remaining > 0 && traditional > 0 {
			// Gross up for taxes
			grossNeeded := remaining / (1 - taxRate)
			withdrawal := math.Min(grossNeeded, traditional)
			result.TraditionalWithdrawal = withdrawal
			result.TaxOwed += withdrawal * taxRate
			remaining -= (withdrawal - withdrawal*taxRate)
		}
		if remaining > 0 && roth > 0 {
			withdrawal := math.Min(remaining, roth)
			result.RothWithdrawal = withdrawal
			remaining -= withdrawal
		}
		if remaining > 0 && hsa > 0 {
			withdrawal := math.Min(remaining, hsa)
			result.HSAWithdrawal = withdrawal
			remaining -= withdrawal
		}

	case ProRata:
		// Withdraw proportionally
		if totalBalance > 0 {
			taxableRatio := taxable / totalBalance
			traditionalRatio := traditional / totalBalance
			rothRatio := roth / totalBalance
			hsaRatio := hsa / totalBalance

			grossAmount := needed / (1 - traditionalRatio*taxRate)
			result.TaxableWithdrawal = math.Min(grossAmount*taxableRatio, taxable)
			result.TraditionalWithdrawal = math.Min(grossAmount*traditionalRatio, traditional)
			result.RothWithdrawal = math.Min(grossAmount*rothRatio, roth)
			result.HSAWithdrawal = math.Min(grossAmount*hsaRatio, hsa)
			result.TaxOwed = result.TraditionalWithdrawal * taxRate
		}

	default:
		// Default to taxable first
		if remaining > 0 && taxable > 0 {
			withdrawal := math.Min(remaining, taxable)
			result.TaxableWithdrawal = withdrawal
			remaining -= withdrawal
		}
		if remaining > 0 && traditional > 0 {
			grossNeeded := remaining / (1 - taxRate)
			withdrawal := math.Min(grossNeeded, traditional)
			result.TraditionalWithdrawal = withdrawal
			result.TaxOwed += withdrawal * taxRate
			remaining -= (withdrawal - withdrawal*taxRate)
		}
		if remaining > 0 && roth > 0 {
			withdrawal := math.Min(remaining, roth)
			result.RothWithdrawal = withdrawal
			remaining -= withdrawal
		}
		if remaining > 0 && hsa > 0 {
			withdrawal := math.Min(remaining, hsa)
			result.HSAWithdrawal = withdrawal
			remaining -= withdrawal
		}
	}

	result.TotalWithdrawal = result.TaxableWithdrawal + result.TraditionalWithdrawal +
		result.RothWithdrawal + result.HSAWithdrawal

	if remaining > 0 {
		result.ShortfallAmount = remaining
	}

	return result
}

// calculateProgressiveTax calculates tax using progressive brackets
func (s *CashFlowService) calculateProgressiveTax(income float64, brackets []TaxBracket) float64 {
	totalTax := 0.0
	remaining := income

	for _, bracket := range brackets {
		if remaining <= 0 {
			break
		}
		bracketWidth := bracket.MaxIncome - bracket.MinIncome
		taxableInBracket := math.Min(remaining, bracketWidth)
		totalTax += taxableInBracket * bracket.Rate
		remaining -= taxableInBracket
	}

	return totalTax
}

// getMarginalTaxRate returns the marginal tax rate for given income
func (s *CashFlowService) getMarginalTaxRate(income float64) float64 {
	brackets := getFederalTaxBrackets()
	for _, bracket := range brackets {
		if income <= bracket.MaxIncome {
			return bracket.Rate
		}
	}
	return brackets[len(brackets)-1].Rate
}

// getCurrentBracketCeiling returns the ceiling of the current tax bracket
func (s *CashFlowService) getCurrentBracketCeiling(income float64) float64 {
	brackets := getFederalTaxBrackets()
	for _, bracket := range brackets {
		if income <= bracket.MaxIncome {
			return bracket.MaxIncome
		}
	}
	return math.MaxFloat64
}

// getFederalTaxBrackets returns 2024 federal tax brackets (married filing jointly)
func getFederalTaxBrackets() []TaxBracket {
	return []TaxBracket{
		{0, 23200, 0.10},
		{23200, 94300, 0.12},
		{94300, 201050, 0.22},
		{201050, 383900, 0.24},
		{383900, 487450, 0.32},
		{487450, 731200, 0.35},
		{731200, math.MaxFloat64, 0.37},
	}
}

// calculateRetirementReadiness calculates a 0-1 score for retirement readiness
func (s *CashFlowService) calculateRetirementReadiness(yearlyFlows []YearCashFlow, config CashFlowConfig) float64 {
	retirementYears := config.LifeExpectancy - config.RetirementAge
	if retirementYears <= 0 {
		return 0
	}

	// Find retirement year index
	retirementIdx := config.RetirementAge - config.CurrentAge
	if retirementIdx >= len(yearlyFlows) || retirementIdx < 0 {
		return 0
	}

	// Calculate coverage score
	coveredYears := 0
	for i := retirementIdx; i < len(yearlyFlows); i++ {
		if yearlyFlows[i].TotalPortfolio > 0 {
			coveredYears++
		}
	}

	coverageScore := float64(coveredYears) / float64(retirementYears)

	// Calculate portfolio adequacy at retirement
	portfolioAtRetirement := yearlyFlows[retirementIdx].TotalPortfolio
	annualExpenses := yearlyFlows[retirementIdx].TotalExpenses
	yearsOfExpenses := 0.0
	if annualExpenses > 0 {
		yearsOfExpenses = portfolioAtRetirement / annualExpenses
	}

	// Target is 25 years of expenses (4% withdrawal rate)
	adequacyScore := math.Min(1, yearsOfExpenses/25)

	// Weighted average
	return 0.6*coverageScore + 0.4*adequacyScore
}

// GetAnnualSummary returns a summary for a specific year
func (s *CashFlowService) GetAnnualSummary(results *CashFlowResults, year int) (*YearCashFlow, error) {
	if year < 1 || year > len(results.YearlyFlows) {
		return nil, errors.New("year out of range")
	}
	return &results.YearlyFlows[year-1], nil
}

// GetFlowsForAge returns cash flows for a specific age
func (s *CashFlowService) GetFlowsForAge(results *CashFlowResults, age int) (*YearCashFlow, error) {
	for i := range results.YearlyFlows {
		if results.YearlyFlows[i].Age == age {
			return &results.YearlyFlows[i], nil
		}
	}
	return nil, errors.New("age not found in results")
}

// UpdateConfig updates the cash flow configuration
func (s *CashFlowService) UpdateConfig(config CashFlowConfig) error {
	if err := validateCashFlowConfig(config); err != nil {
		return err
	}
	s.config = config
	return nil
}

// GetConfig returns the current cash flow configuration
func (s *CashFlowService) GetConfig() CashFlowConfig {
	return s.config
}

// CompareTaxStrategies compares different withdrawal strategies
func (s *CashFlowService) CompareTaxStrategies(config CashFlowConfig) (map[WithdrawalStrategy]*CashFlowResults, error) {
	strategies := []WithdrawalStrategy{ProRata, TaxableFirst, TraditionalFirst, RothFirst, TaxOptimized}
	results := make(map[WithdrawalStrategy]*CashFlowResults)

	for _, strategy := range strategies {
		testConfig := config
		testConfig.WithdrawalStrategy = strategy
		result, err := s.RunAnalysisWithConfig(testConfig)
		if err != nil {
			return nil, err
		}
		results[strategy] = result
	}

	return results, nil
}

// CalculateIncomeFlows returns a breakdown of all income flows for a year
func (s *CashFlowService) CalculateIncomeFlows(flow YearCashFlow) []CashFlow {
	flows := []CashFlow{}

	if flow.EmploymentIncome > 0 {
		flows = append(flows, CashFlow{
			Category:    FlowCategoryEmploymentIncome,
			Type:        FlowTypeIncome,
			Amount:      flow.EmploymentIncome,
			Description: "Employment income",
		})
	}
	if flow.SocialSecurity > 0 {
		flows = append(flows, CashFlow{
			Category:    FlowCategorySocialSecurity,
			Type:        FlowTypeIncome,
			Amount:      flow.SocialSecurity,
			Description: "Social Security benefits",
		})
	}
	if flow.Pension > 0 {
		flows = append(flows, CashFlow{
			Category:    FlowCategoryPension,
			Type:        FlowTypeIncome,
			Amount:      flow.Pension,
			Description: "Pension income",
		})
	}
	if flow.InvestmentIncome > 0 {
		flows = append(flows, CashFlow{
			Category:    FlowCategoryInvestmentIncome,
			Type:        FlowTypeIncome,
			Amount:      flow.InvestmentIncome,
			Description: "Dividends and interest",
		})
	}
	if flow.RentalIncome > 0 {
		flows = append(flows, CashFlow{
			Category:    FlowCategoryRentalIncome,
			Type:        FlowTypeIncome,
			Amount:      flow.RentalIncome,
			Description: "Rental property income",
		})
	}
	if flow.OtherIncome > 0 {
		flows = append(flows, CashFlow{
			Category:    FlowCategoryOtherIncome,
			Type:        FlowTypeIncome,
			Amount:      flow.OtherIncome,
			Description: "Other income sources",
		})
	}

	return flows
}

// CalculateExpenseFlows returns a breakdown of all expense flows for a year
func (s *CashFlowService) CalculateExpenseFlows(flow YearCashFlow) []CashFlow {
	flows := []CashFlow{}

	if flow.HousingExpense > 0 {
		flows = append(flows, CashFlow{
			Category:    FlowCategoryHousing,
			Type:        FlowTypeExpense,
			Amount:      flow.HousingExpense,
			Description: "Housing costs (mortgage/rent, property tax, maintenance)",
		})
	}
	if flow.HealthcareExpense > 0 {
		flows = append(flows, CashFlow{
			Category:    FlowCategoryHealthcare,
			Type:        FlowTypeExpense,
			Amount:      flow.HealthcareExpense,
			Description: "Healthcare costs (insurance, out-of-pocket)",
		})
	}
	if flow.FoodExpense > 0 {
		flows = append(flows, CashFlow{
			Category:    FlowCategoryFood,
			Type:        FlowTypeExpense,
			Amount:      flow.FoodExpense,
			Description: "Food and groceries",
		})
	}
	if flow.TransportationExpense > 0 {
		flows = append(flows, CashFlow{
			Category:    FlowCategoryTransportation,
			Type:        FlowTypeExpense,
			Amount:      flow.TransportationExpense,
			Description: "Transportation costs",
		})
	}
	if flow.UtilitiesExpense > 0 {
		flows = append(flows, CashFlow{
			Category:    FlowCategoryUtilities,
			Type:        FlowTypeExpense,
			Amount:      flow.UtilitiesExpense,
			Description: "Utilities (electric, gas, water, internet)",
		})
	}
	if flow.InsuranceExpense > 0 {
		flows = append(flows, CashFlow{
			Category:    FlowCategoryInsurance,
			Type:        FlowTypeExpense,
			Amount:      flow.InsuranceExpense,
			Description: "Insurance (life, auto, home)",
		})
	}
	if flow.DiscretionaryExpense > 0 {
		flows = append(flows, CashFlow{
			Category:    FlowCategoryDiscretionary,
			Type:        FlowTypeExpense,
			Amount:      flow.DiscretionaryExpense,
			Description: "Discretionary spending (entertainment, travel)",
		})
	}
	if flow.OtherExpenses > 0 {
		flows = append(flows, CashFlow{
			Category:    FlowCategoryOtherExpenses,
			Type:        FlowTypeExpense,
			Amount:      flow.OtherExpenses,
			Description: "Other expenses",
		})
	}

	return flows
}

// CalculateTaxFlows returns a breakdown of all tax flows for a year
func (s *CashFlowService) CalculateTaxFlows(flow YearCashFlow) []CashFlow {
	flows := []CashFlow{}

	if flow.FederalTax > 0 {
		flows = append(flows, CashFlow{
			Category:    FlowCategoryFederalTax,
			Type:        FlowTypeTax,
			Amount:      flow.FederalTax,
			Description: "Federal income tax",
		})
	}
	if flow.StateTax > 0 {
		flows = append(flows, CashFlow{
			Category:    FlowCategoryStateTax,
			Type:        FlowTypeTax,
			Amount:      flow.StateTax,
			Description: "State income tax",
		})
	}
	if flow.FICATax > 0 {
		flows = append(flows, CashFlow{
			Category:    FlowCategoryFICATax,
			Type:        FlowTypeTax,
			Amount:      flow.FICATax,
			Description: "Social Security and Medicare tax",
		})
	}
	if flow.CapitalGainsTax > 0 {
		flows = append(flows, CashFlow{
			Category:    FlowCategoryCapitalGains,
			Type:        FlowTypeTax,
			Amount:      flow.CapitalGainsTax,
			Description: "Capital gains tax",
		})
	}

	return flows
}
