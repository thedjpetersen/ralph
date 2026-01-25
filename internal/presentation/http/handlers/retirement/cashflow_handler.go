package retirement

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"

	"clockzen-next/internal/application/dto"
	appRetirement "clockzen-next/internal/application/retirement"
)

// CashFlowAnalysis represents a stored cash flow analysis
type CashFlowAnalysis struct {
	ID        string                        `json:"id"`
	PlanID    string                        `json:"plan_id"`
	Name      string                        `json:"name"`
	Config    CashFlowAnalysisConfig        `json:"config"`
	Results   *dto.CashFlowResultsResponse  `json:"results,omitempty"`
	Status    string                        `json:"status"` // pending, running, completed, failed
	CreatedAt time.Time                     `json:"created_at"`
	UpdatedAt time.Time                     `json:"updated_at"`
}

// CashFlowAnalysisConfig represents configuration for cash flow analysis
type CashFlowAnalysisConfig struct {
	// Basic demographics
	CurrentAge     int `json:"current_age"`
	RetirementAge  int `json:"retirement_age"`
	LifeExpectancy int `json:"life_expectancy"`

	// Income sources
	EmploymentIncome       float64 `json:"employment_income"`
	EmploymentIncomeGrowth float64 `json:"employment_income_growth"`
	SocialSecurityBenefit  float64 `json:"social_security_benefit"`
	SocialSecurityStartAge int     `json:"social_security_start_age"`
	PensionBenefit         float64 `json:"pension_benefit"`
	PensionStartAge        int     `json:"pension_start_age"`
	RentalIncome           float64 `json:"rental_income"`
	OtherIncome            float64 `json:"other_income"`

	// Portfolio balances
	TaxableBalance     float64 `json:"taxable_balance"`
	TraditionalBalance float64 `json:"traditional_balance"`
	RothBalance        float64 `json:"roth_balance"`
	HSABalance         float64 `json:"hsa_balance"`

	// Contribution rates
	TaxableContributionRate     float64 `json:"taxable_contribution_rate"`
	TraditionalContributionRate float64 `json:"traditional_contribution_rate"`
	RothContributionRate        float64 `json:"roth_contribution_rate"`
	HSAContributionRate         float64 `json:"hsa_contribution_rate"`

	// Expenses
	HousingExpense        float64 `json:"housing_expense"`
	HealthcareExpense     float64 `json:"healthcare_expense"`
	FoodExpense           float64 `json:"food_expense"`
	TransportationExpense float64 `json:"transportation_expense"`
	UtilitiesExpense      float64 `json:"utilities_expense"`
	InsuranceExpense      float64 `json:"insurance_expense"`
	DiscretionaryExpense  float64 `json:"discretionary_expense"`
	OtherExpenses         float64 `json:"other_expenses"`

	// Healthcare growth rate
	HealthcareGrowthRate float64 `json:"healthcare_growth_rate"`

	// Market assumptions
	ExpectedReturn float64 `json:"expected_return"`
	InflationRate  float64 `json:"inflation_rate"`

	// Tax configuration
	FederalTaxRate      float64 `json:"federal_tax_rate"`
	StateTaxRate        float64 `json:"state_tax_rate"`
	FICATaxRate         float64 `json:"fica_tax_rate"`
	CapitalGainsRate    float64 `json:"capital_gains_rate"`
	StateHasNoIncomeTax bool    `json:"state_has_no_income_tax"`

	// Withdrawal strategy
	WithdrawalStrategy dto.WithdrawalStrategyType `json:"withdrawal_strategy"`

	// Tax optimization
	UseTaxGainHarvesting bool    `json:"use_tax_gain_harvesting"`
	UseRothConversion    bool    `json:"use_roth_conversion"`
	RothConversionAmount float64 `json:"roth_conversion_amount"`
	RothConversionEndAge int     `json:"roth_conversion_end_age"`
}

// CashFlowHandler handles HTTP requests for cash flow analysis
type CashFlowHandler struct {
	mu       sync.RWMutex
	analyses map[string]*CashFlowAnalysis
}

// NewCashFlowHandler creates a new CashFlowHandler instance
func NewCashFlowHandler() *CashFlowHandler {
	return &CashFlowHandler{
		analyses: make(map[string]*CashFlowAnalysis),
	}
}

// CreateCashFlowRequest represents a request to create a cash flow analysis
type CreateCashFlowRequest struct {
	PlanID string                 `json:"plan_id"`
	Name   string                 `json:"name"`
	Config CashFlowAnalysisConfig `json:"config"`
}

// UpdateCashFlowRequest represents a request to update a cash flow analysis
type UpdateCashFlowRequest struct {
	Name   *string                 `json:"name,omitempty"`
	Config *CashFlowAnalysisConfig `json:"config,omitempty"`
}

// ListCashFlowResponse represents a list of cash flow analyses
type ListCashFlowResponse struct {
	Analyses []*CashFlowAnalysis `json:"analyses"`
	Total    int                 `json:"total"`
}

// HandleCreate handles POST /api/retirement/cashflow
func (h *CashFlowHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req CreateCashFlowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if err := h.validateCreateRequest(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	now := time.Now()
	analysis := &CashFlowAnalysis{
		ID:        uuid.New().String(),
		PlanID:    req.PlanID,
		Name:      req.Name,
		Config:    req.Config,
		Status:    "pending",
		CreatedAt: now,
		UpdatedAt: now,
	}

	h.mu.Lock()
	h.analyses[analysis.ID] = analysis
	h.mu.Unlock()

	h.writeJSON(w, http.StatusCreated, analysis)
}

// HandleGet handles GET /api/retirement/cashflow/{id}
func (h *CashFlowHandler) HandleGet(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	analysis, exists := h.analyses[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Cash flow analysis not found")
		return
	}

	h.writeJSON(w, http.StatusOK, analysis)
}

// HandleList handles GET /api/retirement/cashflow
func (h *CashFlowHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	planID := r.URL.Query().Get("plan_id")

	h.mu.RLock()
	analyses := make([]*CashFlowAnalysis, 0)
	for _, analysis := range h.analyses {
		if planID == "" || analysis.PlanID == planID {
			analyses = append(analyses, analysis)
		}
	}
	h.mu.RUnlock()

	resp := ListCashFlowResponse{
		Analyses: analyses,
		Total:    len(analyses),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleListByPlan handles GET /api/retirement/plans/{planId}/cashflow
func (h *CashFlowHandler) HandleListByPlan(w http.ResponseWriter, r *http.Request, planID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	analyses := make([]*CashFlowAnalysis, 0)
	for _, analysis := range h.analyses {
		if analysis.PlanID == planID {
			analyses = append(analyses, analysis)
		}
	}
	h.mu.RUnlock()

	resp := ListCashFlowResponse{
		Analyses: analyses,
		Total:    len(analyses),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleUpdate handles PUT /api/retirement/cashflow/{id}
func (h *CashFlowHandler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PUT/PATCH methods are allowed")
		return
	}

	var req UpdateCashFlowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	analysis, exists := h.analyses[id]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Cash flow analysis not found")
		return
	}

	if req.Name != nil {
		analysis.Name = *req.Name
	}
	if req.Config != nil {
		analysis.Config = *req.Config
		analysis.Status = "pending"
		analysis.Results = nil
	}

	analysis.UpdatedAt = time.Now()

	h.writeJSON(w, http.StatusOK, analysis)
}

// HandleDelete handles DELETE /api/retirement/cashflow/{id}
func (h *CashFlowHandler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	h.mu.Lock()
	_, exists := h.analyses[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Cash flow analysis not found")
		return
	}
	delete(h.analyses, id)
	h.mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

// HandleRun handles POST /api/retirement/cashflow/{id}/run
func (h *CashFlowHandler) HandleRun(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	h.mu.Lock()
	analysis, exists := h.analyses[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Cash flow analysis not found")
		return
	}

	analysis.Status = "running"
	h.mu.Unlock()

	// Run the cash flow analysis
	startTime := time.Now()
	results, err := h.runCashFlowAnalysis(&analysis.Config)
	if err != nil {
		h.mu.Lock()
		analysis.Status = "failed"
		h.mu.Unlock()
		h.writeError(w, http.StatusInternalServerError, "analysis_failed", err.Error())
		return
	}
	results.CalculationDurationMs = time.Since(startTime).Milliseconds()

	h.mu.Lock()
	analysis.Results = results
	analysis.Status = "completed"
	analysis.UpdatedAt = time.Now()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, analysis)
}

// HandleRunForPlan handles POST /api/retirement/plans/{planId}/cashflow
func (h *CashFlowHandler) HandleRunForPlan(w http.ResponseWriter, r *http.Request, planID string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var config CashFlowAnalysisConfig
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if err := h.validateConfig(&config); err != nil {
		h.writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	// Run the cash flow analysis
	startTime := time.Now()
	results, err := h.runCashFlowAnalysis(&config)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "analysis_failed", err.Error())
		return
	}
	results.CalculationDurationMs = time.Since(startTime).Milliseconds()

	// Store the analysis
	now := time.Now()
	analysis := &CashFlowAnalysis{
		ID:        uuid.New().String(),
		PlanID:    planID,
		Name:      "Cash Flow Analysis " + now.Format("2006-01-02 15:04:05"),
		Config:    config,
		Results:   results,
		Status:    "completed",
		CreatedAt: now,
		UpdatedAt: now,
	}

	h.mu.Lock()
	h.analyses[analysis.ID] = analysis
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, analysis)
}

// HandleGetSankey handles GET /api/retirement/cashflow/{id}/sankey
func (h *CashFlowHandler) HandleGetSankey(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	analysis, exists := h.analyses[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Cash flow analysis not found")
		return
	}

	if analysis.Results == nil {
		h.writeError(w, http.StatusNotFound, "not_found", "Analysis has not been run yet")
		return
	}

	// Check if retirement or accumulation phase is requested
	phase := r.URL.Query().Get("phase")

	var sankeyData dto.SankeyDataResponse
	if phase == "retirement" {
		sankeyData = analysis.Results.RetirementSankey
	} else {
		sankeyData = analysis.Results.AccumulationSankey
	}

	h.writeJSON(w, http.StatusOK, sankeyData)
}

// HandleGetSankeyForPlan handles POST /api/retirement/plans/{planId}/sankey
func (h *CashFlowHandler) HandleGetSankeyForPlan(w http.ResponseWriter, r *http.Request, planID string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var config CashFlowAnalysisConfig
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if err := h.validateConfig(&config); err != nil {
		h.writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	// Run the cash flow analysis
	results, err := h.runCashFlowAnalysis(&config)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "analysis_failed", err.Error())
		return
	}

	// Check if retirement or accumulation phase is requested
	phase := r.URL.Query().Get("phase")

	response := struct {
		AccumulationSankey dto.SankeyDataResponse `json:"accumulation_sankey"`
		RetirementSankey   dto.SankeyDataResponse `json:"retirement_sankey"`
	}{
		AccumulationSankey: results.AccumulationSankey,
		RetirementSankey:   results.RetirementSankey,
	}

	if phase == "retirement" {
		h.writeJSON(w, http.StatusOK, results.RetirementSankey)
	} else if phase == "accumulation" {
		h.writeJSON(w, http.StatusOK, results.AccumulationSankey)
	} else {
		h.writeJSON(w, http.StatusOK, response)
	}
}

// HandleGetYearlyFlows handles GET /api/retirement/cashflow/{id}/yearly
func (h *CashFlowHandler) HandleGetYearlyFlows(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	analysis, exists := h.analyses[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Cash flow analysis not found")
		return
	}

	if analysis.Results == nil {
		h.writeError(w, http.StatusNotFound, "not_found", "Analysis has not been run yet")
		return
	}

	h.writeJSON(w, http.StatusOK, analysis.Results.YearlyFlows)
}

// runCashFlowAnalysis executes the cash flow analysis
func (h *CashFlowHandler) runCashFlowAnalysis(config *CashFlowAnalysisConfig) (*dto.CashFlowResultsResponse, error) {
	// Convert handler config to service config
	svcConfig := h.toServiceConfig(config)

	// Create service and run analysis
	service, err := appRetirement.NewCashFlowService(svcConfig)
	if err != nil {
		return nil, err
	}

	results, err := service.RunAnalysis()
	if err != nil {
		return nil, err
	}

	// Convert service results to DTO response
	return h.toResultsResponse(results), nil
}

// toServiceConfig converts handler config to service config
func (h *CashFlowHandler) toServiceConfig(config *CashFlowAnalysisConfig) appRetirement.CashFlowConfig {
	strategy := appRetirement.TaxOptimized
	switch config.WithdrawalStrategy {
	case dto.WithdrawalStrategyProRata:
		strategy = appRetirement.ProRata
	case dto.WithdrawalStrategyTaxableFirst:
		strategy = appRetirement.TaxableFirst
	case dto.WithdrawalStrategyTraditionalFirst:
		strategy = appRetirement.TraditionalFirst
	case dto.WithdrawalStrategyRothFirst:
		strategy = appRetirement.RothFirst
	}

	return appRetirement.CashFlowConfig{
		CurrentAge:                  config.CurrentAge,
		RetirementAge:               config.RetirementAge,
		LifeExpectancy:              config.LifeExpectancy,
		EmploymentIncome:            config.EmploymentIncome,
		EmploymentIncomeGrowth:      config.EmploymentIncomeGrowth,
		SocialSecurityBenefit:       config.SocialSecurityBenefit,
		SocialSecurityStartAge:      config.SocialSecurityStartAge,
		PensionBenefit:              config.PensionBenefit,
		PensionStartAge:             config.PensionStartAge,
		RentalIncome:                config.RentalIncome,
		OtherIncome:                 config.OtherIncome,
		TaxableBalance:              config.TaxableBalance,
		TraditionalBalance:          config.TraditionalBalance,
		RothBalance:                 config.RothBalance,
		HSABalance:                  config.HSABalance,
		TaxableContributionRate:     config.TaxableContributionRate,
		TraditionalContributionRate: config.TraditionalContributionRate,
		RothContributionRate:        config.RothContributionRate,
		HSAContributionRate:         config.HSAContributionRate,
		HousingExpense:              config.HousingExpense,
		HealthcareExpense:           config.HealthcareExpense,
		FoodExpense:                 config.FoodExpense,
		TransportationExpense:       config.TransportationExpense,
		UtilitiesExpense:            config.UtilitiesExpense,
		InsuranceExpense:            config.InsuranceExpense,
		DiscretionaryExpense:        config.DiscretionaryExpense,
		OtherExpenses:               config.OtherExpenses,
		HealthcareGrowthRate:        config.HealthcareGrowthRate,
		ExpectedReturn:              config.ExpectedReturn,
		InflationRate:               config.InflationRate,
		FederalTaxRate:              config.FederalTaxRate,
		StateTaxRate:                config.StateTaxRate,
		FICATaxRate:                 config.FICATaxRate,
		CapitalGainsRate:            config.CapitalGainsRate,
		StateHasNoIncomeTax:         config.StateHasNoIncomeTax,
		WithdrawalStrategy:          strategy,
		UseTaxGainHarvesting:        config.UseTaxGainHarvesting,
		UseRothConversion:           config.UseRothConversion,
		RothConversionAmount:        config.RothConversionAmount,
		RothConversionEndAge:        config.RothConversionEndAge,
	}
}

// toResultsResponse converts service results to DTO response
func (h *CashFlowHandler) toResultsResponse(results *appRetirement.CashFlowResults) *dto.CashFlowResultsResponse {
	// Convert yearly flows
	yearlyFlows := make([]dto.YearCashFlowResponse, len(results.YearlyFlows))
	for i, flow := range results.YearlyFlows {
		yearlyFlows[i] = dto.YearCashFlowResponse{
			Year: flow.Year,
			Age:  flow.Age,
			Income: dto.IncomeBreakdownResponse{
				EmploymentIncome: flow.EmploymentIncome,
				SocialSecurity:   flow.SocialSecurity,
				Pension:          flow.Pension,
				InvestmentIncome: flow.InvestmentIncome,
				RentalIncome:     flow.RentalIncome,
				OtherIncome:      flow.OtherIncome,
				TotalIncome:      flow.TotalIncome,
			},
			Withdrawals: dto.AccountWithdrawalsResponse{
				TaxableWithdrawal:     flow.TaxableWithdrawal,
				TraditionalWithdrawal: flow.TraditionalWithdrawal,
				RothWithdrawal:        flow.RothWithdrawal,
				HSAWithdrawal:         flow.HSAWithdrawal,
				TotalWithdrawals:      flow.TotalWithdrawals,
			},
			Expenses: dto.ExpenseBreakdownResponse{
				HousingExpense:        flow.HousingExpense,
				HealthcareExpense:     flow.HealthcareExpense,
				FoodExpense:           flow.FoodExpense,
				TransportationExpense: flow.TransportationExpense,
				UtilitiesExpense:      flow.UtilitiesExpense,
				InsuranceExpense:      flow.InsuranceExpense,
				DiscretionaryExpense:  flow.DiscretionaryExpense,
				OtherExpenses:         flow.OtherExpenses,
				TotalExpenses:         flow.TotalExpenses,
			},
			Taxes: dto.TaxBreakdownResponse{
				FederalTax:      flow.FederalTax,
				StateTax:        flow.StateTax,
				FICATax:         flow.FICATax,
				CapitalGainsTax: flow.CapitalGainsTax,
				TotalTax:        flow.TotalTax,
			},
			Savings: dto.AccountContributionsResponse{
				TaxableContribution:     flow.TaxableSavings,
				TraditionalContribution: flow.TraditionalSavings,
				RothContribution:        flow.RothSavings,
				HSAContribution:         flow.HSASavings,
				TotalContributions:      flow.TotalSavings,
			},
			NetCashFlow:       flow.NetCashFlow,
			CumulativeSurplus: flow.CumulativeSurplus,
			TotalPortfolio:    flow.TotalPortfolio,
			IsRetired:         flow.IsRetired,
		}
	}

	// Convert Sankey data
	accumulationSankey := h.toSankeyResponse(results.AccumulationSankey)
	retirementSankey := h.toSankeyResponse(results.RetirementSankey)

	return &dto.CashFlowResultsResponse{
		YearlyFlows:              yearlyFlows,
		TotalLifetimeIncome:      results.TotalLifetimeIncome,
		TotalLifetimeExpenses:    results.TotalLifetimeExpenses,
		TotalLifetimeTax:         results.TotalLifetimeTax,
		TotalLifetimeSavings:     results.TotalLifetimeSavings,
		TotalLifetimeWithdrawals: results.TotalLifetimeWithdrawals,
		AverageEffectiveTaxRate:  results.AverageEffectiveTaxRate,
		AccumulationSankey:       accumulationSankey,
		RetirementSankey:         retirementSankey,
		YearsOfData:              results.YearsOfData,
		RetirementReadiness:      results.RetirementReadiness,
		ExpensesCoveredYears:     results.ExpensesCoveredYears,
		CalculationDurationMs:    results.Duration.Milliseconds(),
	}
}

// toSankeyResponse converts Sankey data to response format
func (h *CashFlowHandler) toSankeyResponse(data appRetirement.SankeyData) dto.SankeyDataResponse {
	nodes := make([]dto.SankeyNodeResponse, len(data.Nodes))
	for i, node := range data.Nodes {
		nodes[i] = dto.SankeyNodeResponse{
			ID:       node.ID,
			Label:    node.Label,
			Category: string(node.Category),
			Value:    node.Value,
		}
	}

	links := make([]dto.SankeyLinkResponse, len(data.Links))
	for i, link := range data.Links {
		links[i] = dto.SankeyLinkResponse{
			Source: link.Source,
			Target: link.Target,
			Value:  link.Value,
			Label:  link.Label,
		}
	}

	return dto.SankeyDataResponse{
		Nodes: nodes,
		Links: links,
	}
}

// validateCreateRequest validates the create request
func (h *CashFlowHandler) validateCreateRequest(req *CreateCashFlowRequest) error {
	if req.PlanID == "" {
		return newValidationError("plan_id is required")
	}
	if req.Name == "" {
		return newValidationError("name is required")
	}
	return h.validateConfig(&req.Config)
}

// validateConfig validates the cash flow analysis configuration
func (h *CashFlowHandler) validateConfig(config *CashFlowAnalysisConfig) error {
	if config.CurrentAge < 1 || config.CurrentAge > 120 {
		return newValidationError("current_age must be between 1 and 120")
	}
	if config.RetirementAge <= config.CurrentAge {
		return newValidationError("retirement_age must be greater than current_age")
	}
	if config.LifeExpectancy <= config.RetirementAge {
		return newValidationError("life_expectancy must be greater than retirement_age")
	}
	if config.ExpectedReturn < -1 || config.ExpectedReturn > 1 {
		return newValidationError("expected_return must be between -1 and 1")
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
	if config.SocialSecurityStartAge != 0 &&
		(config.SocialSecurityStartAge < 62 || config.SocialSecurityStartAge > 70) {
		return newValidationError("social_security_start_age must be between 62 and 70")
	}
	return nil
}

// writeJSON writes a JSON response
func (h *CashFlowHandler) writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeError writes an error response
func (h *CashFlowHandler) writeError(w http.ResponseWriter, status int, errCode string, message string) {
	h.writeJSON(w, status, ErrorResponse{
		Error:   errCode,
		Message: message,
	})
}
