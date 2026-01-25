package retirement

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"

	"clockzen-next/internal/application/dto"
)

// PlanHandler handles HTTP requests for retirement plans
type PlanHandler struct {
	mu    sync.RWMutex
	plans map[string]*dto.RetirementPlanResponse
}

// NewPlanHandler creates a new PlanHandler instance
func NewPlanHandler() *PlanHandler {
	return &PlanHandler{
		plans: make(map[string]*dto.RetirementPlanResponse),
	}
}

// CreatePlanRequest represents a request to create a retirement plan
type CreatePlanRequest struct {
	Name string `json:"name"`

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

	// Retirement income
	SocialSecurityBenefit  float64 `json:"social_security_benefit"`
	SocialSecurityStartAge int     `json:"social_security_start_age"`
	PensionBenefit         float64 `json:"pension_benefit"`
	PensionStartAge        int     `json:"pension_start_age"`

	// Expenses
	AnnualExpenses float64 `json:"annual_expenses"`

	// Withdrawal strategy
	WithdrawalStrategy dto.WithdrawalStrategyType `json:"withdrawal_strategy"`

	// Tax configuration
	FederalTaxRate float64 `json:"federal_tax_rate"`
	StateTaxRate   float64 `json:"state_tax_rate"`
}

// UpdatePlanRequest represents a request to update a retirement plan
type UpdatePlanRequest struct {
	Name *string `json:"name,omitempty"`

	// Demographics
	CurrentAge     *int `json:"current_age,omitempty"`
	RetirementAge  *int `json:"retirement_age,omitempty"`
	LifeExpectancy *int `json:"life_expectancy,omitempty"`

	// Account balances
	TaxableBalance     *float64 `json:"taxable_balance,omitempty"`
	TraditionalBalance *float64 `json:"traditional_balance,omitempty"`
	RothBalance        *float64 `json:"roth_balance,omitempty"`
	HSABalance         *float64 `json:"hsa_balance,omitempty"`

	// Contributions
	TaxableContribution     *float64 `json:"taxable_contribution,omitempty"`
	TraditionalContribution *float64 `json:"traditional_contribution,omitempty"`
	RothContribution        *float64 `json:"roth_contribution,omitempty"`
	HSAContribution         *float64 `json:"hsa_contribution,omitempty"`

	// Market assumptions
	ExpectedReturn *float64 `json:"expected_return,omitempty"`
	InflationRate  *float64 `json:"inflation_rate,omitempty"`

	// Retirement income
	SocialSecurityBenefit  *float64 `json:"social_security_benefit,omitempty"`
	SocialSecurityStartAge *int     `json:"social_security_start_age,omitempty"`
	PensionBenefit         *float64 `json:"pension_benefit,omitempty"`
	PensionStartAge        *int     `json:"pension_start_age,omitempty"`

	// Expenses
	AnnualExpenses *float64 `json:"annual_expenses,omitempty"`

	// Withdrawal strategy
	WithdrawalStrategy *dto.WithdrawalStrategyType `json:"withdrawal_strategy,omitempty"`

	// Tax configuration
	FederalTaxRate *float64 `json:"federal_tax_rate,omitempty"`
	StateTaxRate   *float64 `json:"state_tax_rate,omitempty"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// ListPlansResponse represents a list of plans response
type ListPlansResponse struct {
	Plans []*dto.RetirementPlanResponse `json:"plans"`
	Total int                           `json:"total"`
}

// HandleCreate handles POST /api/retirement/plans
func (h *PlanHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req CreatePlanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if err := h.validateCreateRequest(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	now := time.Now()
	plan := &dto.RetirementPlanResponse{
		ID:        uuid.New().String(),
		Name:      req.Name,
		CreatedAt: now,
		UpdatedAt: now,

		CurrentAge:     req.CurrentAge,
		RetirementAge:  req.RetirementAge,
		LifeExpectancy: req.LifeExpectancy,

		Accounts: dto.AccountBalancesResponse{
			TaxableBalance:     req.TaxableBalance,
			TraditionalBalance: req.TraditionalBalance,
			RothBalance:        req.RothBalance,
			HSABalance:         req.HSABalance,
			TotalBalance:       req.TaxableBalance + req.TraditionalBalance + req.RothBalance + req.HSABalance,
		},

		Contributions: dto.AccountContributionsResponse{
			TaxableContribution:     req.TaxableContribution,
			TraditionalContribution: req.TraditionalContribution,
			RothContribution:        req.RothContribution,
			HSAContribution:         req.HSAContribution,
			TotalContributions:      req.TaxableContribution + req.TraditionalContribution + req.RothContribution + req.HSAContribution,
		},

		ExpectedReturn: req.ExpectedReturn,
		InflationRate:  req.InflationRate,

		SocialSecurityBenefit:  req.SocialSecurityBenefit,
		SocialSecurityStartAge: req.SocialSecurityStartAge,
		PensionBenefit:         req.PensionBenefit,
		PensionStartAge:        req.PensionStartAge,

		AnnualExpenses: req.AnnualExpenses,

		WithdrawalStrategy: req.WithdrawalStrategy,

		FederalTaxRate: req.FederalTaxRate,
		StateTaxRate:   req.StateTaxRate,
	}

	h.mu.Lock()
	h.plans[plan.ID] = plan
	h.mu.Unlock()

	h.writeJSON(w, http.StatusCreated, plan)
}

// HandleGet handles GET /api/retirement/plans/{id}
func (h *PlanHandler) HandleGet(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	plan, exists := h.plans[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Plan not found")
		return
	}

	h.writeJSON(w, http.StatusOK, plan)
}

// HandleList handles GET /api/retirement/plans
func (h *PlanHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	plans := make([]*dto.RetirementPlanResponse, 0, len(h.plans))
	for _, plan := range h.plans {
		plans = append(plans, plan)
	}
	h.mu.RUnlock()

	resp := ListPlansResponse{
		Plans: plans,
		Total: len(plans),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleUpdate handles PUT /api/retirement/plans/{id}
func (h *PlanHandler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PUT/PATCH methods are allowed")
		return
	}

	var req UpdatePlanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	plan, exists := h.plans[id]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Plan not found")
		return
	}

	// Apply updates
	if req.Name != nil {
		plan.Name = *req.Name
	}
	if req.CurrentAge != nil {
		plan.CurrentAge = *req.CurrentAge
	}
	if req.RetirementAge != nil {
		plan.RetirementAge = *req.RetirementAge
	}
	if req.LifeExpectancy != nil {
		plan.LifeExpectancy = *req.LifeExpectancy
	}
	if req.TaxableBalance != nil {
		plan.Accounts.TaxableBalance = *req.TaxableBalance
	}
	if req.TraditionalBalance != nil {
		plan.Accounts.TraditionalBalance = *req.TraditionalBalance
	}
	if req.RothBalance != nil {
		plan.Accounts.RothBalance = *req.RothBalance
	}
	if req.HSABalance != nil {
		plan.Accounts.HSABalance = *req.HSABalance
	}
	if req.TaxableContribution != nil {
		plan.Contributions.TaxableContribution = *req.TaxableContribution
	}
	if req.TraditionalContribution != nil {
		plan.Contributions.TraditionalContribution = *req.TraditionalContribution
	}
	if req.RothContribution != nil {
		plan.Contributions.RothContribution = *req.RothContribution
	}
	if req.HSAContribution != nil {
		plan.Contributions.HSAContribution = *req.HSAContribution
	}
	if req.ExpectedReturn != nil {
		plan.ExpectedReturn = *req.ExpectedReturn
	}
	if req.InflationRate != nil {
		plan.InflationRate = *req.InflationRate
	}
	if req.SocialSecurityBenefit != nil {
		plan.SocialSecurityBenefit = *req.SocialSecurityBenefit
	}
	if req.SocialSecurityStartAge != nil {
		plan.SocialSecurityStartAge = *req.SocialSecurityStartAge
	}
	if req.PensionBenefit != nil {
		plan.PensionBenefit = *req.PensionBenefit
	}
	if req.PensionStartAge != nil {
		plan.PensionStartAge = *req.PensionStartAge
	}
	if req.AnnualExpenses != nil {
		plan.AnnualExpenses = *req.AnnualExpenses
	}
	if req.WithdrawalStrategy != nil {
		plan.WithdrawalStrategy = *req.WithdrawalStrategy
	}
	if req.FederalTaxRate != nil {
		plan.FederalTaxRate = *req.FederalTaxRate
	}
	if req.StateTaxRate != nil {
		plan.StateTaxRate = *req.StateTaxRate
	}

	// Recalculate totals
	plan.Accounts.TotalBalance = plan.Accounts.TaxableBalance + plan.Accounts.TraditionalBalance +
		plan.Accounts.RothBalance + plan.Accounts.HSABalance
	plan.Contributions.TotalContributions = plan.Contributions.TaxableContribution +
		plan.Contributions.TraditionalContribution + plan.Contributions.RothContribution +
		plan.Contributions.HSAContribution

	plan.UpdatedAt = time.Now()

	h.writeJSON(w, http.StatusOK, plan)
}

// HandleDelete handles DELETE /api/retirement/plans/{id}
func (h *PlanHandler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	h.mu.Lock()
	_, exists := h.plans[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Plan not found")
		return
	}
	delete(h.plans, id)
	h.mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

// validateCreateRequest validates the create plan request
func (h *PlanHandler) validateCreateRequest(req *CreatePlanRequest) error {
	if req.Name == "" {
		return newValidationError("name is required")
	}
	if req.CurrentAge <= 0 || req.CurrentAge > 120 {
		return newValidationError("current_age must be between 1 and 120")
	}
	if req.RetirementAge <= req.CurrentAge {
		return newValidationError("retirement_age must be greater than current_age")
	}
	if req.LifeExpectancy <= req.RetirementAge {
		return newValidationError("life_expectancy must be greater than retirement_age")
	}
	if req.ExpectedReturn < 0 || req.ExpectedReturn > 1 {
		return newValidationError("expected_return must be between 0 and 1")
	}
	if req.InflationRate < 0 || req.InflationRate > 1 {
		return newValidationError("inflation_rate must be between 0 and 1")
	}
	if req.FederalTaxRate < 0 || req.FederalTaxRate > 1 {
		return newValidationError("federal_tax_rate must be between 0 and 1")
	}
	if req.StateTaxRate < 0 || req.StateTaxRate > 1 {
		return newValidationError("state_tax_rate must be between 0 and 1")
	}
	return nil
}

// writeJSON writes a JSON response
func (h *PlanHandler) writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeError writes an error response
func (h *PlanHandler) writeError(w http.ResponseWriter, status int, errCode string, message string) {
	h.writeJSON(w, status, ErrorResponse{
		Error:   errCode,
		Message: message,
	})
}

// validationError represents a validation error
type validationError struct {
	message string
}

func (e *validationError) Error() string {
	return e.message
}

func newValidationError(message string) error {
	return &validationError{message: message}
}
