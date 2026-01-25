package retirement

import (
	"errors"
	"math"
	"time"
)

// AccountType represents different tax-advantaged account types
type AccountType int

const (
	// Taxable - regular brokerage account
	Taxable AccountType = iota
	// Traditional - pre-tax 401k, Traditional IRA
	Traditional
	// Roth - post-tax Roth 401k, Roth IRA
	Roth
	// HSA - Health Savings Account
	HSA
)

// WithdrawalStrategy represents different withdrawal ordering strategies
type WithdrawalStrategy int

const (
	// ProRata - withdraw proportionally from all accounts
	ProRata WithdrawalStrategy = iota
	// TaxableFirst - withdraw from taxable first, then traditional, then Roth
	TaxableFirst
	// TraditionalFirst - withdraw from traditional first
	TraditionalFirst
	// RothFirst - withdraw from Roth first
	RothFirst
	// TaxOptimized - optimize for tax efficiency based on tax brackets
	TaxOptimized
)

// ProjectionConfig holds configuration for retirement projection
type ProjectionConfig struct {
	// Current age
	CurrentAge int

	// Target retirement age
	RetirementAge int

	// Life expectancy for planning
	LifeExpectancy int

	// Account balances by type
	TaxableBalance     float64
	TraditionalBalance float64
	RothBalance        float64
	HSABalance         float64

	// Annual contributions by account type
	TaxableContribution     float64
	TraditionalContribution float64
	RothContribution        float64
	HSAContribution         float64

	// Expected annual return (real return after inflation)
	ExpectedReturn float64

	// Inflation rate
	InflationRate float64

	// Annual expenses in retirement (today's dollars)
	AnnualExpenses float64

	// Social Security start age (62-70)
	SocialSecurityStartAge int

	// Annual Social Security benefit (today's dollars)
	SocialSecurityBenefit float64

	// Pension start age (0 if none)
	PensionStartAge int

	// Annual pension benefit (today's dollars)
	PensionBenefit float64

	// Withdrawal strategy to use
	Strategy WithdrawalStrategy

	// Tax rates
	FederalTaxRate float64
	StateTaxRate   float64

	// Enable Roth conversion ladder
	UseRothConversionLadder bool

	// Annual Roth conversion amount (if ladder enabled)
	RothConversionAmount float64

	// Roth conversion ladder start age
	RothConversionStartAge int

	// SEPP/72(t) configuration
	UseSEPP bool

	// SEPP start age
	SEPPStartAge int

	// SEPP calculation method
	SEPPMethod SEPPMethod
}

// SEPPMethod represents different SEPP calculation methods
type SEPPMethod int

const (
	// RequiredMinimumDistribution - RMD method
	RequiredMinimumDistribution SEPPMethod = iota
	// FixedAmortization - Fixed amortization method
	FixedAmortization
	// FixedAnnuitization - Fixed annuitization method
	FixedAnnuitization
)

// YearProjection represents the financial state for a single year
type YearProjection struct {
	// Year number (1, 2, 3...)
	Year int

	// Age at start of year
	Age int

	// Account balances at start of year
	TaxableBalance     float64
	TraditionalBalance float64
	RothBalance        float64
	HSABalance         float64

	// Total portfolio value
	TotalPortfolio float64

	// Contributions made during the year
	TaxableContribution     float64
	TraditionalContribution float64
	RothContribution        float64
	HSAContribution         float64
	TotalContributions      float64

	// Withdrawals during the year
	TaxableWithdrawal     float64
	TraditionalWithdrawal float64
	RothWithdrawal        float64
	HSAWithdrawal         float64
	TotalWithdrawals      float64

	// Roth conversions during the year
	RothConversion float64

	// SEPP/72(t) distribution
	SEPPDistribution float64

	// Income sources
	SocialSecurityIncome float64
	PensionIncome        float64

	// Expenses (inflation adjusted)
	TotalExpenses float64

	// Investment growth during the year
	InvestmentGrowth float64

	// Tax paid
	TaxPaid float64

	// Net cash flow (income - expenses - tax)
	NetCashFlow float64

	// Whether this is a retirement year
	IsRetired bool

	// Whether portfolio depleted
	IsDepleted bool

	// Account balances at end of year
	EndTaxableBalance     float64
	EndTraditionalBalance float64
	EndRothBalance        float64
	EndHSABalance         float64
	EndTotalPortfolio     float64
}

// ProjectionResults holds the complete projection results
type ProjectionResults struct {
	// Year-by-year projections
	Projections []YearProjection

	// Summary statistics
	TotalYears              int
	RetirementYears         int
	FinalPortfolioValue     float64
	PortfolioDepletionAge   int // 0 if never depleted
	TotalContributions      float64
	TotalWithdrawals        float64
	TotalRothConversions    float64
	TotalSocialSecurity     float64
	TotalPension            float64
	TotalTaxPaid            float64
	PeakPortfolioValue      float64
	PeakPortfolioAge        int
	MinRetirementPortfolio  float64
	MinRetirementPortfolioAge int
	SuccessfulRetirement    bool

	// Calculation duration
	Duration time.Duration
}

// SEPPResult holds the result of SEPP calculation
type SEPPResult struct {
	AnnualDistribution float64
	Method             SEPPMethod
	AccountBalance     float64
	Age                int
	InterestRate       float64
	LifeExpectancy     float64
}

// WithdrawalResult holds the result of withdrawal calculation
type WithdrawalResult struct {
	TaxableWithdrawal     float64
	TraditionalWithdrawal float64
	RothWithdrawal        float64
	HSAWithdrawal         float64
	TotalWithdrawal       float64
	TaxOwed               float64
	ShortfallAmount       float64 // Amount not covered if portfolio insufficient
}

// ProjectionService provides retirement projection calculations
type ProjectionService struct {
	config ProjectionConfig
}

// DefaultProjectionConfig returns a ProjectionConfig with reasonable defaults
func DefaultProjectionConfig() ProjectionConfig {
	return ProjectionConfig{
		CurrentAge:              35,
		RetirementAge:           65,
		LifeExpectancy:          95,
		TaxableBalance:          50000,
		TraditionalBalance:      200000,
		RothBalance:             50000,
		HSABalance:              10000,
		TaxableContribution:     10000,
		TraditionalContribution: 23000, // 2024 401k limit
		RothContribution:        7000,  // 2024 IRA limit
		HSAContribution:         4150,  // 2024 HSA limit
		ExpectedReturn:          0.07,
		InflationRate:           0.025,
		AnnualExpenses:          60000,
		SocialSecurityStartAge:  67,
		SocialSecurityBenefit:   24000,
		PensionStartAge:         0,
		PensionBenefit:          0,
		Strategy:                TaxOptimized,
		FederalTaxRate:          0.22,
		StateTaxRate:            0.05,
		UseRothConversionLadder: false,
		RothConversionAmount:    40000,
		RothConversionStartAge:  60,
		UseSEPP:                 false,
		SEPPStartAge:            55,
		SEPPMethod:              FixedAmortization,
	}
}

// NewProjectionService creates a new projection service
func NewProjectionService(config ProjectionConfig) (*ProjectionService, error) {
	if err := validateProjectionConfig(config); err != nil {
		return nil, err
	}

	return &ProjectionService{
		config: config,
	}, nil
}

// validateProjectionConfig validates the projection configuration
func validateProjectionConfig(config ProjectionConfig) error {
	if config.CurrentAge < 0 || config.CurrentAge > 120 {
		return errors.New("CurrentAge must be between 0 and 120")
	}
	if config.RetirementAge < config.CurrentAge {
		return errors.New("RetirementAge must be >= CurrentAge")
	}
	if config.LifeExpectancy <= config.RetirementAge {
		return errors.New("LifeExpectancy must be > RetirementAge")
	}
	if config.TaxableBalance < 0 || config.TraditionalBalance < 0 ||
		config.RothBalance < 0 || config.HSABalance < 0 {
		return errors.New("account balances cannot be negative")
	}
	if config.ExpectedReturn < -1 || config.ExpectedReturn > 1 {
		return errors.New("ExpectedReturn must be between -1 and 1")
	}
	if config.SocialSecurityStartAge != 0 &&
		(config.SocialSecurityStartAge < 62 || config.SocialSecurityStartAge > 70) {
		return errors.New("SocialSecurityStartAge must be between 62 and 70")
	}
	if config.UseSEPP && config.SEPPStartAge < config.CurrentAge {
		return errors.New("SEPPStartAge must be >= CurrentAge")
	}
	if config.UseSEPP && config.SEPPStartAge >= 59 {
		return errors.New("SEPP not needed after age 59.5")
	}
	return nil
}

// RunProjection executes the year-by-year retirement projection
func (s *ProjectionService) RunProjection() (*ProjectionResults, error) {
	return s.RunProjectionWithConfig(s.config)
}

// RunProjectionWithConfig executes projection with custom config
func (s *ProjectionService) RunProjectionWithConfig(config ProjectionConfig) (*ProjectionResults, error) {
	if err := validateProjectionConfig(config); err != nil {
		return nil, err
	}

	startTime := time.Now()

	totalYears := config.LifeExpectancy - config.CurrentAge
	projections := make([]YearProjection, totalYears)

	// Initialize tracking variables
	taxable := config.TaxableBalance
	traditional := config.TraditionalBalance
	roth := config.RothBalance
	hsa := config.HSABalance

	// Track Roth conversion ladder (5-year seasoning)
	rothConversionQueue := make([]float64, 5)

	var (
		totalContributions   float64
		totalWithdrawals     float64
		totalRothConversions float64
		totalSocialSecurity  float64
		totalPension         float64
		totalTaxPaid         float64
		peakPortfolio        float64
		peakAge              int
		minRetirementPortfolio float64 = math.MaxFloat64
		minRetirementAge       int
		depletionAge         int
		depleted             bool
	)

	// Calculate SEPP distribution if applicable
	var seppDistribution float64
	if config.UseSEPP {
		seppResult := s.CalculateSEPP(traditional, config.SEPPStartAge, config.SEPPMethod)
		seppDistribution = seppResult.AnnualDistribution
	}

	for year := range totalYears {
		age := config.CurrentAge + year
		isRetired := age >= config.RetirementAge

		projection := YearProjection{
			Year:               year + 1,
			Age:                age,
			TaxableBalance:     taxable,
			TraditionalBalance: traditional,
			RothBalance:        roth,
			HSABalance:         hsa,
			TotalPortfolio:     taxable + traditional + roth + hsa,
			IsRetired:          isRetired,
		}

		// Check if already depleted
		if depleted {
			projection.IsDepleted = true
			projections[year] = projection
			continue
		}

		// Track peak portfolio
		if projection.TotalPortfolio > peakPortfolio {
			peakPortfolio = projection.TotalPortfolio
			peakAge = age
		}

		// Calculate income sources for the year
		if config.SocialSecurityStartAge > 0 && age >= config.SocialSecurityStartAge {
			inflationYears := float64(age - config.CurrentAge)
			projection.SocialSecurityIncome = config.SocialSecurityBenefit * math.Pow(1+config.InflationRate, inflationYears)
			totalSocialSecurity += projection.SocialSecurityIncome
		}

		if config.PensionStartAge > 0 && age >= config.PensionStartAge {
			inflationYears := float64(age - config.CurrentAge)
			projection.PensionIncome = config.PensionBenefit * math.Pow(1+config.InflationRate, inflationYears)
			totalPension += projection.PensionIncome
		}

		// Handle accumulation phase (pre-retirement)
		if !isRetired {
			// Add contributions
			projection.TaxableContribution = config.TaxableContribution
			projection.TraditionalContribution = config.TraditionalContribution
			projection.RothContribution = config.RothContribution
			projection.HSAContribution = config.HSAContribution
			projection.TotalContributions = projection.TaxableContribution +
				projection.TraditionalContribution + projection.RothContribution + projection.HSAContribution
			totalContributions += projection.TotalContributions

			taxable += projection.TaxableContribution
			traditional += projection.TraditionalContribution
			roth += projection.RothContribution
			hsa += projection.HSAContribution

			// Handle SEPP if applicable (early access)
			if config.UseSEPP && age >= config.SEPPStartAge && age < 60 {
				projection.SEPPDistribution = seppDistribution
				traditional -= seppDistribution
				projection.TraditionalWithdrawal = seppDistribution
				totalWithdrawals += seppDistribution

				// Tax on SEPP distribution
				tax := seppDistribution * (config.FederalTaxRate + config.StateTaxRate)
				projection.TaxPaid = tax
				totalTaxPaid += tax
			}
		} else {
			// Retirement phase
			inflationYears := float64(age - config.CurrentAge)
			projection.TotalExpenses = config.AnnualExpenses * math.Pow(1+config.InflationRate, inflationYears)

			// Calculate net expenses (expenses - other income)
			netExpenses := projection.TotalExpenses - projection.SocialSecurityIncome - projection.PensionIncome

			// Track minimum retirement portfolio
			if projection.TotalPortfolio < minRetirementPortfolio && projection.TotalPortfolio > 0 {
				minRetirementPortfolio = projection.TotalPortfolio
				minRetirementAge = age
			}

			if netExpenses > 0 {
				// Need to withdraw from portfolio
				withdrawal := s.CalculateWithdrawal(
					netExpenses,
					taxable, traditional, roth, hsa,
					config.Strategy,
					config.FederalTaxRate+config.StateTaxRate,
					rothConversionQueue,
				)

				projection.TaxableWithdrawal = withdrawal.TaxableWithdrawal
				projection.TraditionalWithdrawal = withdrawal.TraditionalWithdrawal
				projection.RothWithdrawal = withdrawal.RothWithdrawal
				projection.HSAWithdrawal = withdrawal.HSAWithdrawal
				projection.TotalWithdrawals = withdrawal.TotalWithdrawal
				projection.TaxPaid = withdrawal.TaxOwed

				taxable -= withdrawal.TaxableWithdrawal
				traditional -= withdrawal.TraditionalWithdrawal
				roth -= withdrawal.RothWithdrawal
				hsa -= withdrawal.HSAWithdrawal

				totalWithdrawals += withdrawal.TotalWithdrawal
				totalTaxPaid += withdrawal.TaxOwed

				// Check for depletion
				if withdrawal.ShortfallAmount > 0 {
					depleted = true
					depletionAge = age
					projection.IsDepleted = true
				}
			}
		}

		// Handle Roth conversion ladder (pre-retirement or early retirement)
		if config.UseRothConversionLadder && age >= config.RothConversionStartAge && age < 65 {
			conversionAmount := math.Min(config.RothConversionAmount, traditional)
			if conversionAmount > 0 {
				projection.RothConversion = conversionAmount
				traditional -= conversionAmount
				roth += conversionAmount
				totalRothConversions += conversionAmount

				// Tax on conversion
				conversionTax := conversionAmount * (config.FederalTaxRate + config.StateTaxRate)
				projection.TaxPaid += conversionTax
				totalTaxPaid += conversionTax

				// Add to conversion queue for 5-year seasoning
				rothConversionQueue = append(rothConversionQueue[1:], conversionAmount)
			}
		}

		// Apply investment growth (end of year)
		taxableGrowth := taxable * config.ExpectedReturn
		traditionalGrowth := traditional * config.ExpectedReturn
		rothGrowth := roth * config.ExpectedReturn
		hsaGrowth := hsa * config.ExpectedReturn

		projection.InvestmentGrowth = taxableGrowth + traditionalGrowth + rothGrowth + hsaGrowth

		taxable += taxableGrowth
		traditional += traditionalGrowth
		roth += rothGrowth
		hsa += hsaGrowth

		// Ensure no negative balances
		taxable = math.Max(0, taxable)
		traditional = math.Max(0, traditional)
		roth = math.Max(0, roth)
		hsa = math.Max(0, hsa)

		// End of year balances
		projection.EndTaxableBalance = taxable
		projection.EndTraditionalBalance = traditional
		projection.EndRothBalance = roth
		projection.EndHSABalance = hsa
		projection.EndTotalPortfolio = taxable + traditional + roth + hsa

		// Calculate net cash flow
		projection.NetCashFlow = projection.TotalContributions + projection.SocialSecurityIncome +
			projection.PensionIncome + projection.InvestmentGrowth -
			projection.TotalWithdrawals - projection.TotalExpenses - projection.TaxPaid

		projections[year] = projection
	}

	// Handle case where retirement portfolio never went below peak
	if minRetirementPortfolio == math.MaxFloat64 {
		minRetirementPortfolio = 0
	}

	results := &ProjectionResults{
		Projections:             projections,
		TotalYears:              totalYears,
		RetirementYears:         config.LifeExpectancy - config.RetirementAge,
		FinalPortfolioValue:     taxable + traditional + roth + hsa,
		PortfolioDepletionAge:   depletionAge,
		TotalContributions:      totalContributions,
		TotalWithdrawals:        totalWithdrawals,
		TotalRothConversions:    totalRothConversions,
		TotalSocialSecurity:     totalSocialSecurity,
		TotalPension:            totalPension,
		TotalTaxPaid:            totalTaxPaid,
		PeakPortfolioValue:      peakPortfolio,
		PeakPortfolioAge:        peakAge,
		MinRetirementPortfolio:  minRetirementPortfolio,
		MinRetirementPortfolioAge: minRetirementAge,
		SuccessfulRetirement:    !depleted,
		Duration:                time.Since(startTime),
	}

	return results, nil
}

// CalculateWithdrawal determines how much to withdraw from each account
func (s *ProjectionService) CalculateWithdrawal(
	amount float64,
	taxable, traditional, roth, hsa float64,
	strategy WithdrawalStrategy,
	taxRate float64,
	rothConversionQueue []float64,
) WithdrawalResult {
	result := WithdrawalResult{}
	remaining := amount
	totalBalance := taxable + traditional + roth + hsa

	if totalBalance <= 0 {
		result.ShortfallAmount = amount
		return result
	}

	switch strategy {
	case ProRata:
		// Withdraw proportionally from all accounts
		if totalBalance > 0 {
			taxableRatio := taxable / totalBalance
			traditionalRatio := traditional / totalBalance
			rothRatio := roth / totalBalance
			hsaRatio := hsa / totalBalance

			// Gross up for taxes on traditional
			grossAmount := amount / (1 - traditionalRatio*taxRate)

			result.TaxableWithdrawal = math.Min(grossAmount*taxableRatio, taxable)
			result.TraditionalWithdrawal = math.Min(grossAmount*traditionalRatio, traditional)
			result.RothWithdrawal = math.Min(grossAmount*rothRatio, roth)
			result.HSAWithdrawal = math.Min(grossAmount*hsaRatio, hsa)
		}

	case TaxableFirst:
		// Withdraw from taxable first, then traditional, then Roth
		if remaining > 0 && taxable > 0 {
			withdrawal := math.Min(remaining, taxable)
			result.TaxableWithdrawal = withdrawal
			remaining -= withdrawal
		}
		if remaining > 0 && traditional > 0 {
			// Need to gross up for taxes
			grossAmount := remaining / (1 - taxRate)
			withdrawal := math.Min(grossAmount, traditional)
			result.TraditionalWithdrawal = withdrawal
			result.TaxOwed = withdrawal * taxRate
			remaining -= (withdrawal - result.TaxOwed)
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

	case TraditionalFirst:
		// Withdraw from traditional first (may make sense for RMD planning)
		if remaining > 0 && traditional > 0 {
			grossAmount := remaining / (1 - taxRate)
			withdrawal := math.Min(grossAmount, traditional)
			result.TraditionalWithdrawal = withdrawal
			result.TaxOwed = withdrawal * taxRate
			remaining -= (withdrawal - result.TaxOwed)
		}
		if remaining > 0 && taxable > 0 {
			withdrawal := math.Min(remaining, taxable)
			result.TaxableWithdrawal = withdrawal
			remaining -= withdrawal
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

	case RothFirst:
		// Withdraw from Roth first (rare, but may be useful in specific scenarios)
		if remaining > 0 && roth > 0 {
			withdrawal := math.Min(remaining, roth)
			result.RothWithdrawal = withdrawal
			remaining -= withdrawal
		}
		if remaining > 0 && taxable > 0 {
			withdrawal := math.Min(remaining, taxable)
			result.TaxableWithdrawal = withdrawal
			remaining -= withdrawal
		}
		if remaining > 0 && traditional > 0 {
			grossAmount := remaining / (1 - taxRate)
			withdrawal := math.Min(grossAmount, traditional)
			result.TraditionalWithdrawal = withdrawal
			result.TaxOwed = withdrawal * taxRate
			remaining -= (withdrawal - result.TaxOwed)
		}
		if remaining > 0 && hsa > 0 {
			withdrawal := math.Min(remaining, hsa)
			result.HSAWithdrawal = withdrawal
			remaining -= withdrawal
		}

	case TaxOptimized:
		// Tax-optimized strategy:
		// 1. Use seasoned Roth conversions first (tax-free)
		// 2. Then taxable (lower tax due to LTCG rates)
		// 3. Then traditional (ordinary income rates)
		// 4. Then Roth contributions/growth
		// 5. HSA last (most valuable)

		// First, use seasoned Roth conversions (5+ years old)
		seasonedRoth := 0.0
		for _, conv := range rothConversionQueue {
			seasonedRoth += conv
		}
		if remaining > 0 && seasonedRoth > 0 && roth >= seasonedRoth {
			withdrawal := math.Min(remaining, seasonedRoth)
			result.RothWithdrawal = withdrawal
			remaining -= withdrawal
		}

		// Then taxable (preferential LTCG rates, assume 15% effective)
		if remaining > 0 && taxable > 0 {
			withdrawal := math.Min(remaining, taxable)
			result.TaxableWithdrawal = withdrawal
			result.TaxOwed += withdrawal * 0.15 * 0.5 // Assume 50% gains, 15% LTCG rate
			remaining -= withdrawal
		}

		// Then traditional (ordinary income rates)
		if remaining > 0 && traditional > 0 {
			grossAmount := remaining / (1 - taxRate)
			withdrawal := math.Min(grossAmount, traditional)
			result.TraditionalWithdrawal = withdrawal
			result.TaxOwed += withdrawal * taxRate
			remaining -= (withdrawal - withdrawal*taxRate)
		}

		// Then remaining Roth
		if remaining > 0 && roth > result.RothWithdrawal {
			available := roth - result.RothWithdrawal
			withdrawal := math.Min(remaining, available)
			result.RothWithdrawal += withdrawal
			remaining -= withdrawal
		}

		// Finally HSA (most tax advantaged when used for medical)
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

// CalculateSEPP calculates Substantially Equal Periodic Payments under IRS 72(t)
func (s *ProjectionService) CalculateSEPP(balance float64, age int, method SEPPMethod) SEPPResult {
	// IRS-approved interest rate (typically 120% of mid-term AFR)
	// Using a reasonable assumption of 4%
	interestRate := 0.04

	// Life expectancy from IRS Single Life Expectancy Table
	lifeExpectancy := s.getIRSLifeExpectancy(age)

	var annualDistribution float64

	switch method {
	case RequiredMinimumDistribution:
		// RMD Method: Balance / Life Expectancy
		// Recalculated each year based on account balance
		annualDistribution = balance / lifeExpectancy

	case FixedAmortization:
		// Fixed Amortization Method: Balance amortized over life expectancy
		// Payment = Balance * [r(1+r)^n] / [(1+r)^n - 1]
		r := interestRate
		n := lifeExpectancy
		if r > 0 {
			numerator := r * math.Pow(1+r, n)
			denominator := math.Pow(1+r, n) - 1
			annualDistribution = balance * numerator / denominator
		} else {
			annualDistribution = balance / n
		}

	case FixedAnnuitization:
		// Fixed Annuitization Method: Balance / Annuity Factor
		// Annuity factor derived from mortality table and interest rate
		// Simplified: use present value of annuity formula
		annuityFactor := (1 - math.Pow(1+interestRate, -lifeExpectancy)) / interestRate
		annualDistribution = balance / annuityFactor
	}

	return SEPPResult{
		AnnualDistribution: annualDistribution,
		Method:             method,
		AccountBalance:     balance,
		Age:                age,
		InterestRate:       interestRate,
		LifeExpectancy:     lifeExpectancy,
	}
}

// getIRSLifeExpectancy returns life expectancy from IRS Single Life Expectancy Table
func (s *ProjectionService) getIRSLifeExpectancy(age int) float64 {
	// IRS Single Life Expectancy Table (2024)
	// Simplified version for common ages
	table := map[int]float64{
		40: 44.4, 41: 43.4, 42: 42.5, 43: 41.5, 44: 40.6,
		45: 39.6, 46: 38.7, 47: 37.7, 48: 36.8, 49: 35.9,
		50: 34.9, 51: 34.0, 52: 33.1, 53: 32.2, 54: 31.3,
		55: 30.4, 56: 29.5, 57: 28.6, 58: 27.7, 59: 26.8,
		60: 26.0, 61: 25.1, 62: 24.2, 63: 23.4, 64: 22.6,
		65: 21.8, 66: 21.0, 67: 20.2, 68: 19.4, 69: 18.6,
		70: 17.8, 71: 17.0, 72: 16.3, 73: 15.6, 74: 14.9,
		75: 14.2, 76: 13.5, 77: 12.9, 78: 12.2, 79: 11.6,
		80: 11.0, 81: 10.4, 82: 9.8, 83: 9.3, 84: 8.7,
		85: 8.2, 86: 7.7, 87: 7.2, 88: 6.8, 89: 6.4,
		90: 6.0, 91: 5.6, 92: 5.2, 93: 4.9, 94: 4.6,
		95: 4.3,
	}

	if le, ok := table[age]; ok {
		return le
	}

	// Interpolate for ages not in table
	if age < 40 {
		return 44.4 + float64(40-age)
	}
	if age > 95 {
		return 4.0
	}

	return 30.0 // Default fallback
}

// CalculateRothConversionLadder plans optimal Roth conversions
func (s *ProjectionService) CalculateRothConversionLadder(
	traditionalBalance float64,
	retirementAge int,
	currentAge int,
	annualExpenses float64,
	taxBrackets []TaxBracket,
) []RothConversionPlan {
	if currentAge >= retirementAge {
		return nil
	}

	yearsToRetirement := retirementAge - currentAge
	conversions := make([]RothConversionPlan, yearsToRetirement)

	// Calculate optimal conversion amount to fill up lower tax brackets
	remainingTraditional := traditionalBalance

	for i := range yearsToRetirement {
		age := currentAge + i

		// Find optimal conversion amount (fill up to 22% bracket typically)
		optimalConversion := s.calculateOptimalConversion(taxBrackets, 0) // 0 = no other income

		conversionAmount := math.Min(optimalConversion, remainingTraditional)

		conversions[i] = RothConversionPlan{
			Year:             i + 1,
			Age:              age,
			ConversionAmount: conversionAmount,
			TaxOwed:          s.calculateTaxOnConversion(conversionAmount, taxBrackets),
			AccessibleYear:   age + 5, // 5-year seasoning rule
		}

		remainingTraditional -= conversionAmount
	}

	return conversions
}

// TaxBracket represents a federal tax bracket
type TaxBracket struct {
	MinIncome float64
	MaxIncome float64
	Rate      float64
}

// RothConversionPlan represents a planned Roth conversion
type RothConversionPlan struct {
	Year             int
	Age              int
	ConversionAmount float64
	TaxOwed          float64
	AccessibleYear   int
}

// calculateOptimalConversion finds optimal conversion amount to minimize taxes
func (s *ProjectionService) calculateOptimalConversion(brackets []TaxBracket, otherIncome float64) float64 {
	if len(brackets) == 0 {
		// Use default 2024 brackets (married filing jointly)
		brackets = []TaxBracket{
			{0, 23200, 0.10},
			{23200, 94300, 0.12},
			{94300, 201050, 0.22},
			{201050, 383900, 0.24},
			{383900, 487450, 0.32},
			{487450, 731200, 0.35},
			{731200, math.MaxFloat64, 0.37},
		}
	}

	// Fill up to 22% bracket as a reasonable optimization target
	targetBracket := 0.22
	for _, bracket := range brackets {
		if bracket.Rate <= targetBracket {
			maxInThisBracket := bracket.MaxIncome - otherIncome
			if maxInThisBracket > 0 {
				return maxInThisBracket
			}
		}
	}

	return 0
}

// calculateTaxOnConversion calculates tax owed on a Roth conversion
func (s *ProjectionService) calculateTaxOnConversion(amount float64, brackets []TaxBracket) float64 {
	if len(brackets) == 0 {
		brackets = []TaxBracket{
			{0, 23200, 0.10},
			{23200, 94300, 0.12},
			{94300, 201050, 0.22},
			{201050, 383900, 0.24},
			{383900, 487450, 0.32},
			{487450, 731200, 0.35},
			{731200, math.MaxFloat64, 0.37},
		}
	}

	totalTax := 0.0
	remaining := amount

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

// UpdateConfig updates the projection configuration
func (s *ProjectionService) UpdateConfig(config ProjectionConfig) error {
	if err := validateProjectionConfig(config); err != nil {
		return err
	}
	s.config = config
	return nil
}

// GetConfig returns the current projection configuration
func (s *ProjectionService) GetConfig() ProjectionConfig {
	return s.config
}

// GetProjectionAtAge returns the projection for a specific age
func (s *ProjectionService) GetProjectionAtAge(results *ProjectionResults, age int) (*YearProjection, error) {
	for i := range results.Projections {
		if results.Projections[i].Age == age {
			return &results.Projections[i], nil
		}
	}
	return nil, errors.New("age not found in projection")
}

// CalculateSafeWithdrawalRate calculates the safe withdrawal rate given projection results
func (s *ProjectionService) CalculateSafeWithdrawalRate(results *ProjectionResults) float64 {
	if results.SuccessfulRetirement && len(results.Projections) > 0 {
		// Find retirement year
		for _, p := range results.Projections {
			if p.IsRetired && p.TotalPortfolio > 0 {
				return p.TotalExpenses / p.TotalPortfolio
			}
		}
	}
	return 0
}

// CompareSEPPMethods compares all SEPP calculation methods
func (s *ProjectionService) CompareSEPPMethods(balance float64, age int) map[SEPPMethod]SEPPResult {
	return map[SEPPMethod]SEPPResult{
		RequiredMinimumDistribution: s.CalculateSEPP(balance, age, RequiredMinimumDistribution),
		FixedAmortization:           s.CalculateSEPP(balance, age, FixedAmortization),
		FixedAnnuitization:          s.CalculateSEPP(balance, age, FixedAnnuitization),
	}
}
