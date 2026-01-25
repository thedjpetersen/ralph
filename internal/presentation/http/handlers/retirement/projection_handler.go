package retirement

import (
	"encoding/json"
	"math"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"

	"clockzen-next/internal/application/dto"
)

// Projection represents a stored retirement projection
type Projection struct {
	ID        string                         `json:"id"`
	PlanID    string                         `json:"plan_id"`
	Name      string                         `json:"name"`
	Config    ProjectionConfig               `json:"config"`
	Results   *dto.ProjectionResultsResponse `json:"results,omitempty"`
	Status    string                         `json:"status"` // pending, running, completed, failed
	CreatedAt time.Time                      `json:"created_at"`
	UpdatedAt time.Time                      `json:"updated_at"`
}

// ProjectionConfig represents the configuration for a projection run
type ProjectionConfig struct {
	// Demographics
	CurrentAge     int `json:"current_age"`
	RetirementAge  int `json:"retirement_age"`
	LifeExpectancy int `json:"life_expectancy"`

	// Account balances
	TaxableBalance     float64 `json:"taxable_balance"`
	TraditionalBalance float64 `json:"traditional_balance"`
	RothBalance        float64 `json:"roth_balance"`
	HSABalance         float64 `json:"hsa_balance"`

	// Contributions
	TaxableContribution     float64 `json:"taxable_contribution"`
	TraditionalContribution float64 `json:"traditional_contribution"`
	RothContribution        float64 `json:"roth_contribution"`
	HSAContribution         float64 `json:"hsa_contribution"`

	// Market assumptions
	ExpectedReturn float64 `json:"expected_return"`
	InflationRate  float64 `json:"inflation_rate"`

	// Income
	SocialSecurityBenefit  float64 `json:"social_security_benefit"`
	SocialSecurityStartAge int     `json:"social_security_start_age"`
	PensionBenefit         float64 `json:"pension_benefit"`
	PensionStartAge        int     `json:"pension_start_age"`

	// Expenses
	AnnualExpenses float64 `json:"annual_expenses"`

	// Strategy
	WithdrawalStrategy dto.WithdrawalStrategyType `json:"withdrawal_strategy"`

	// Tax
	FederalTaxRate float64 `json:"federal_tax_rate"`
	StateTaxRate   float64 `json:"state_tax_rate"`
}

// ProjectionHandler handles HTTP requests for retirement projections
type ProjectionHandler struct {
	mu          sync.RWMutex
	projections map[string]*Projection
}

// NewProjectionHandler creates a new ProjectionHandler instance
func NewProjectionHandler() *ProjectionHandler {
	return &ProjectionHandler{
		projections: make(map[string]*Projection),
	}
}

// CreateProjectionRequest represents a request to create a projection
type CreateProjectionRequest struct {
	PlanID string           `json:"plan_id"`
	Name   string           `json:"name"`
	Config ProjectionConfig `json:"config"`
}

// UpdateProjectionRequest represents a request to update a projection
type UpdateProjectionRequest struct {
	Name   *string           `json:"name,omitempty"`
	Config *ProjectionConfig `json:"config,omitempty"`
}

// ListProjectionsResponse represents a list of projections
type ListProjectionsResponse struct {
	Projections []*Projection `json:"projections"`
	Total       int           `json:"total"`
}

// HandleCreate handles POST /api/retirement/projections
func (h *ProjectionHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req CreateProjectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if err := h.validateCreateRequest(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	now := time.Now()
	projection := &Projection{
		ID:        uuid.New().String(),
		PlanID:    req.PlanID,
		Name:      req.Name,
		Config:    req.Config,
		Status:    "pending",
		CreatedAt: now,
		UpdatedAt: now,
	}

	h.mu.Lock()
	h.projections[projection.ID] = projection
	h.mu.Unlock()

	h.writeJSON(w, http.StatusCreated, projection)
}

// HandleGet handles GET /api/retirement/projections/{id}
func (h *ProjectionHandler) HandleGet(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	projection, exists := h.projections[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Projection not found")
		return
	}

	h.writeJSON(w, http.StatusOK, projection)
}

// HandleList handles GET /api/retirement/projections
func (h *ProjectionHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	// Get optional plan_id filter from query params
	planID := r.URL.Query().Get("plan_id")

	h.mu.RLock()
	projections := make([]*Projection, 0)
	for _, projection := range h.projections {
		if planID == "" || projection.PlanID == planID {
			projections = append(projections, projection)
		}
	}
	h.mu.RUnlock()

	resp := ListProjectionsResponse{
		Projections: projections,
		Total:       len(projections),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleListByPlan handles GET /api/retirement/plans/{planId}/projections
func (h *ProjectionHandler) HandleListByPlan(w http.ResponseWriter, r *http.Request, planID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	projections := make([]*Projection, 0)
	for _, projection := range h.projections {
		if projection.PlanID == planID {
			projections = append(projections, projection)
		}
	}
	h.mu.RUnlock()

	resp := ListProjectionsResponse{
		Projections: projections,
		Total:       len(projections),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleUpdate handles PUT /api/retirement/projections/{id}
func (h *ProjectionHandler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PUT/PATCH methods are allowed")
		return
	}

	var req UpdateProjectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	projection, exists := h.projections[id]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Projection not found")
		return
	}

	// Apply updates
	if req.Name != nil {
		projection.Name = *req.Name
	}
	if req.Config != nil {
		projection.Config = *req.Config
		// Reset status and results when config changes
		projection.Status = "pending"
		projection.Results = nil
	}

	projection.UpdatedAt = time.Now()

	h.writeJSON(w, http.StatusOK, projection)
}

// HandleDelete handles DELETE /api/retirement/projections/{id}
func (h *ProjectionHandler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	h.mu.Lock()
	_, exists := h.projections[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Projection not found")
		return
	}
	delete(h.projections, id)
	h.mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

// HandleRun handles POST /api/retirement/projections/{id}/run
func (h *ProjectionHandler) HandleRun(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	h.mu.Lock()
	projection, exists := h.projections[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Projection not found")
		return
	}

	projection.Status = "running"
	h.mu.Unlock()

	// Run the projection calculation
	startTime := time.Now()
	results := h.runProjection(&projection.Config)
	results.CalculationDurationMs = time.Since(startTime).Milliseconds()

	h.mu.Lock()
	projection.Results = results
	projection.Status = "completed"
	projection.UpdatedAt = time.Now()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, projection)
}

// HandleRunForPlan handles POST /api/retirement/plans/{planId}/projection
func (h *ProjectionHandler) HandleRunForPlan(w http.ResponseWriter, r *http.Request, planID string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var config ProjectionConfig
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if err := h.validateConfig(&config); err != nil {
		h.writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	// Run the projection calculation
	startTime := time.Now()
	results := h.runProjection(&config)
	results.CalculationDurationMs = time.Since(startTime).Milliseconds()

	// Store the projection
	now := time.Now()
	projection := &Projection{
		ID:        uuid.New().String(),
		PlanID:    planID,
		Name:      "Projection " + now.Format("2006-01-02 15:04:05"),
		Config:    config,
		Results:   results,
		Status:    "completed",
		CreatedAt: now,
		UpdatedAt: now,
	}

	h.mu.Lock()
	h.projections[projection.ID] = projection
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, projection)
}

// runProjection executes the projection calculation
func (h *ProjectionHandler) runProjection(config *ProjectionConfig) *dto.ProjectionResultsResponse {
	totalYears := config.LifeExpectancy - config.CurrentAge
	retirementYears := config.LifeExpectancy - config.RetirementAge

	projections := make([]dto.YearProjectionResponse, 0, totalYears)

	// Initial balances
	taxable := config.TaxableBalance
	traditional := config.TraditionalBalance
	roth := config.RothBalance
	hsa := config.HSABalance

	var totalContributions, totalWithdrawals, totalRothConversions float64
	var totalSocialSecurity, totalPension, totalTaxPaid float64
	peakValue := taxable + traditional + roth + hsa
	peakAge := config.CurrentAge
	minRetirementValue := math.MaxFloat64
	minRetirementAge := config.RetirementAge
	depletionAge := 0
	successful := true

	for year := range totalYears {
		age := config.CurrentAge + year
		currentYear := time.Now().Year() + year
		isRetired := age >= config.RetirementAge

		startBalances := dto.AccountBalancesResponse{
			TaxableBalance:     taxable,
			TraditionalBalance: traditional,
			RothBalance:        roth,
			HSABalance:         hsa,
			TotalBalance:       taxable + traditional + roth + hsa,
		}

		var contributions dto.AccountContributionsResponse
		var withdrawals dto.AccountWithdrawalsResponse
		var income dto.IncomeBreakdownResponse
		var expenses dto.ExpenseBreakdownResponse
		var taxPaid float64
		var rothConversion float64

		if !isRetired {
			// Accumulation phase: add contributions
			contributions = dto.AccountContributionsResponse{
				TaxableContribution:     config.TaxableContribution,
				TraditionalContribution: config.TraditionalContribution,
				RothContribution:        config.RothContribution,
				HSAContribution:         config.HSAContribution,
				TotalContributions:      config.TaxableContribution + config.TraditionalContribution + config.RothContribution + config.HSAContribution,
			}
			totalContributions += contributions.TotalContributions

			taxable += config.TaxableContribution
			traditional += config.TraditionalContribution
			roth += config.RothContribution
			hsa += config.HSAContribution
		} else {
			// Retirement phase: calculate income and withdrawals
			// Apply inflation to expenses
			inflationMultiplier := math.Pow(1+config.InflationRate, float64(age-config.RetirementAge))
			adjustedExpenses := config.AnnualExpenses * inflationMultiplier

			// Calculate income
			if age >= config.SocialSecurityStartAge {
				income.SocialSecurity = config.SocialSecurityBenefit
				totalSocialSecurity += config.SocialSecurityBenefit
			}
			if age >= config.PensionStartAge && config.PensionBenefit > 0 {
				income.Pension = config.PensionBenefit
				totalPension += config.PensionBenefit
			}
			income.TotalIncome = income.SocialSecurity + income.Pension

			// Calculate expenses
			expenses.TotalExpenses = adjustedExpenses

			// Calculate withdrawal needed
			withdrawalNeeded := adjustedExpenses - income.TotalIncome
			if withdrawalNeeded > 0 {
				// Withdraw from accounts based on strategy
				withdrawn := h.calculateWithdrawals(withdrawalNeeded, &taxable, &traditional, &roth, &hsa, config.WithdrawalStrategy)
				withdrawals = withdrawn
				totalWithdrawals += withdrawn.TotalWithdrawals

				// Calculate tax on traditional withdrawals
				taxPaid = withdrawn.TraditionalWithdrawal * (config.FederalTaxRate + config.StateTaxRate)
				totalTaxPaid += taxPaid
			}

			// Track minimum portfolio in retirement
			totalBalance := taxable + traditional + roth + hsa
			if totalBalance < minRetirementValue {
				minRetirementValue = totalBalance
				minRetirementAge = age
			}

			// Check for depletion
			if totalBalance <= 0 && depletionAge == 0 {
				depletionAge = age
				successful = false
			}
		}

		// Apply investment growth
		growthRate := config.ExpectedReturn
		taxableGrowth := taxable * growthRate
		traditionalGrowth := traditional * growthRate
		rothGrowth := roth * growthRate
		hsaGrowth := hsa * growthRate
		investmentGrowth := taxableGrowth + traditionalGrowth + rothGrowth + hsaGrowth

		taxable += taxableGrowth
		traditional += traditionalGrowth
		roth += rothGrowth
		hsa += hsaGrowth

		// Track peak portfolio
		totalBalance := taxable + traditional + roth + hsa
		if totalBalance > peakValue {
			peakValue = totalBalance
			peakAge = age
		}

		endBalances := dto.AccountBalancesResponse{
			TaxableBalance:     taxable,
			TraditionalBalance: traditional,
			RothBalance:        roth,
			HSABalance:         hsa,
			TotalBalance:       totalBalance,
		}

		netCashFlow := contributions.TotalContributions - withdrawals.TotalWithdrawals + investmentGrowth - taxPaid

		projection := dto.YearProjectionResponse{
			Year:             currentYear,
			Age:              age,
			StartBalances:    startBalances,
			Contributions:    contributions,
			Withdrawals:      withdrawals,
			RothConversion:   rothConversion,
			SEPPDistribution: 0,
			Income:           income,
			Expenses:         expenses,
			InvestmentGrowth: investmentGrowth,
			TaxPaid:          taxPaid,
			NetCashFlow:      netCashFlow,
			IsRetired:        isRetired,
			IsDepleted:       totalBalance <= 0,
			EndBalances:      endBalances,
		}

		projections = append(projections, projection)
	}

	// Calculate safe withdrawal rate
	finalBalance := taxable + traditional + roth + hsa
	safeWithdrawalRate := 0.0
	if finalBalance > 0 && retirementYears > 0 {
		safeWithdrawalRate = (config.AnnualExpenses * float64(retirementYears)) / finalBalance
		if safeWithdrawalRate > 1 {
			safeWithdrawalRate = 1
		}
	}

	if minRetirementValue == math.MaxFloat64 {
		minRetirementValue = 0
	}

	return &dto.ProjectionResultsResponse{
		Projections:               projections,
		TotalYears:                totalYears,
		RetirementYears:           retirementYears,
		FinalPortfolioValue:       finalBalance,
		PortfolioDepletionAge:     depletionAge,
		TotalContributions:        totalContributions,
		TotalWithdrawals:          totalWithdrawals,
		TotalRothConversions:      totalRothConversions,
		TotalSocialSecurity:       totalSocialSecurity,
		TotalPension:              totalPension,
		TotalTaxPaid:              totalTaxPaid,
		PeakPortfolioValue:        peakValue,
		PeakPortfolioAge:          peakAge,
		MinRetirementPortfolio:    minRetirementValue,
		MinRetirementPortfolioAge: minRetirementAge,
		SuccessfulRetirement:      successful,
		SafeWithdrawalRate:        safeWithdrawalRate,
	}
}

// calculateWithdrawals determines how much to withdraw from each account type
func (h *ProjectionHandler) calculateWithdrawals(needed float64, taxable, traditional, roth, hsa *float64, strategy dto.WithdrawalStrategyType) dto.AccountWithdrawalsResponse {
	var result dto.AccountWithdrawalsResponse
	remaining := needed

	switch strategy {
	case dto.WithdrawalStrategyTaxableFirst:
		// Withdraw from taxable first, then traditional, then Roth
		remaining = h.withdrawFrom(taxable, remaining, &result.TaxableWithdrawal)
		remaining = h.withdrawFrom(traditional, remaining, &result.TraditionalWithdrawal)
		remaining = h.withdrawFrom(roth, remaining, &result.RothWithdrawal)
		remaining = h.withdrawFrom(hsa, remaining, &result.HSAWithdrawal)

	case dto.WithdrawalStrategyTraditionalFirst:
		// Withdraw from traditional first
		remaining = h.withdrawFrom(traditional, remaining, &result.TraditionalWithdrawal)
		remaining = h.withdrawFrom(taxable, remaining, &result.TaxableWithdrawal)
		remaining = h.withdrawFrom(roth, remaining, &result.RothWithdrawal)
		remaining = h.withdrawFrom(hsa, remaining, &result.HSAWithdrawal)

	case dto.WithdrawalStrategyRothFirst:
		// Withdraw from Roth first
		remaining = h.withdrawFrom(roth, remaining, &result.RothWithdrawal)
		remaining = h.withdrawFrom(taxable, remaining, &result.TaxableWithdrawal)
		remaining = h.withdrawFrom(traditional, remaining, &result.TraditionalWithdrawal)
		remaining = h.withdrawFrom(hsa, remaining, &result.HSAWithdrawal)

	case dto.WithdrawalStrategyProRata:
		// Proportional withdrawal from all accounts
		total := *taxable + *traditional + *roth + *hsa
		if total > 0 {
			taxablePct := *taxable / total
			traditionalPct := *traditional / total
			rothPct := *roth / total
			hsaPct := *hsa / total

			h.withdrawFrom(taxable, needed*taxablePct, &result.TaxableWithdrawal)
			h.withdrawFrom(traditional, needed*traditionalPct, &result.TraditionalWithdrawal)
			h.withdrawFrom(roth, needed*rothPct, &result.RothWithdrawal)
			h.withdrawFrom(hsa, needed*hsaPct, &result.HSAWithdrawal)
		}

	default: // TaxOptimized or default
		// Tax-optimized: taxable first, then traditional (up to standard deduction), then Roth
		remaining = h.withdrawFrom(taxable, remaining, &result.TaxableWithdrawal)
		remaining = h.withdrawFrom(traditional, remaining, &result.TraditionalWithdrawal)
		remaining = h.withdrawFrom(roth, remaining, &result.RothWithdrawal)
		remaining = h.withdrawFrom(hsa, remaining, &result.HSAWithdrawal)
	}

	result.TotalWithdrawals = result.TaxableWithdrawal + result.TraditionalWithdrawal + result.RothWithdrawal + result.HSAWithdrawal

	if remaining > 0 {
		result.ShortfallAmount = remaining
	}

	return result
}

// withdrawFrom withdraws from an account up to the amount needed
func (h *ProjectionHandler) withdrawFrom(account *float64, needed float64, withdrawn *float64) float64 {
	if needed <= 0 || *account <= 0 {
		return needed
	}

	if *account >= needed {
		*withdrawn = needed
		*account -= needed
		return 0
	}

	*withdrawn = *account
	*account = 0
	return needed - *withdrawn
}

// validateCreateRequest validates the create projection request
func (h *ProjectionHandler) validateCreateRequest(req *CreateProjectionRequest) error {
	if req.PlanID == "" {
		return newValidationError("plan_id is required")
	}
	if req.Name == "" {
		return newValidationError("name is required")
	}
	return h.validateConfig(&req.Config)
}

// validateConfig validates the projection configuration
func (h *ProjectionHandler) validateConfig(config *ProjectionConfig) error {
	if config.CurrentAge < 1 || config.CurrentAge > 120 {
		return newValidationError("current_age must be between 1 and 120")
	}
	if config.RetirementAge <= config.CurrentAge {
		return newValidationError("retirement_age must be greater than current_age")
	}
	if config.LifeExpectancy <= config.RetirementAge {
		return newValidationError("life_expectancy must be greater than retirement_age")
	}
	if config.ExpectedReturn < 0 || config.ExpectedReturn > 1 {
		return newValidationError("expected_return must be between 0 and 1")
	}
	if config.InflationRate < 0 || config.InflationRate > 1 {
		return newValidationError("inflation_rate must be between 0 and 1")
	}
	if config.FederalTaxRate < 0 || config.FederalTaxRate > 1 {
		return newValidationError("federal_tax_rate must be between 0 and 1")
	}
	if config.StateTaxRate < 0 || config.StateTaxRate > 1 {
		return newValidationError("state_tax_rate must be between 0 and 1")
	}
	if config.AnnualExpenses < 0 {
		return newValidationError("annual_expenses cannot be negative")
	}
	return nil
}

// writeJSON writes a JSON response
func (h *ProjectionHandler) writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeError writes an error response
func (h *ProjectionHandler) writeError(w http.ResponseWriter, status int, errCode string, message string) {
	h.writeJSON(w, status, ErrorResponse{
		Error:   errCode,
		Message: message,
	})
}
