package retirement

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"

	"clockzen-next/internal/application/dto"
)

// IncomeSource represents a retirement income source
type IncomeSource struct {
	ID          string               `json:"id"`
	PlanID      string               `json:"plan_id"`
	Type        dto.IncomeSourceType `json:"type"`
	Name        string               `json:"name"`
	Amount      float64              `json:"amount"`
	StartAge    int                  `json:"start_age,omitempty"`
	EndAge      int                  `json:"end_age,omitempty"`
	GrowthRate  float64              `json:"growth_rate,omitempty"`
	IsTaxable   bool                 `json:"is_taxable"`
	Description string               `json:"description,omitempty"`
	CreatedAt   time.Time            `json:"created_at"`
	UpdatedAt   time.Time            `json:"updated_at"`
}

// IncomeHandler handles HTTP requests for retirement income sources
type IncomeHandler struct {
	mu      sync.RWMutex
	incomes map[string]*IncomeSource
}

// NewIncomeHandler creates a new IncomeHandler instance
func NewIncomeHandler() *IncomeHandler {
	return &IncomeHandler{
		incomes: make(map[string]*IncomeSource),
	}
}

// CreateIncomeRequest represents a request to create an income source
type CreateIncomeRequest struct {
	PlanID      string               `json:"plan_id"`
	Type        dto.IncomeSourceType `json:"type"`
	Name        string               `json:"name"`
	Amount      float64              `json:"amount"`
	StartAge    int                  `json:"start_age,omitempty"`
	EndAge      int                  `json:"end_age,omitempty"`
	GrowthRate  float64              `json:"growth_rate,omitempty"`
	IsTaxable   bool                 `json:"is_taxable"`
	Description string               `json:"description,omitempty"`
}

// UpdateIncomeRequest represents a request to update an income source
type UpdateIncomeRequest struct {
	Type        *dto.IncomeSourceType `json:"type,omitempty"`
	Name        *string               `json:"name,omitempty"`
	Amount      *float64              `json:"amount,omitempty"`
	StartAge    *int                  `json:"start_age,omitempty"`
	EndAge      *int                  `json:"end_age,omitempty"`
	GrowthRate  *float64              `json:"growth_rate,omitempty"`
	IsTaxable   *bool                 `json:"is_taxable,omitempty"`
	Description *string               `json:"description,omitempty"`
}

// ListIncomesResponse represents a list of income sources response
type ListIncomesResponse struct {
	Incomes []*IncomeSource `json:"incomes"`
	Total   int             `json:"total"`
}

// IncomeBreakdownSummary represents income breakdown by type
type IncomeBreakdownSummary struct {
	EmploymentIncome float64 `json:"employment_income"`
	SocialSecurity   float64 `json:"social_security"`
	Pension          float64 `json:"pension"`
	InvestmentIncome float64 `json:"investment_income"`
	RentalIncome     float64 `json:"rental_income"`
	OtherIncome      float64 `json:"other_income"`
	WithdrawalIncome float64 `json:"withdrawal_income"`
	TotalIncome      float64 `json:"total_income"`
}

// HandleCreate handles POST /api/retirement/incomes
func (h *IncomeHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req CreateIncomeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if err := h.validateCreateRequest(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	now := time.Now()
	income := &IncomeSource{
		ID:          uuid.New().String(),
		PlanID:      req.PlanID,
		Type:        req.Type,
		Name:        req.Name,
		Amount:      req.Amount,
		StartAge:    req.StartAge,
		EndAge:      req.EndAge,
		GrowthRate:  req.GrowthRate,
		IsTaxable:   req.IsTaxable,
		Description: req.Description,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	h.mu.Lock()
	h.incomes[income.ID] = income
	h.mu.Unlock()

	h.writeJSON(w, http.StatusCreated, income)
}

// HandleGet handles GET /api/retirement/incomes/{id}
func (h *IncomeHandler) HandleGet(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	income, exists := h.incomes[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Income source not found")
		return
	}

	h.writeJSON(w, http.StatusOK, income)
}

// HandleList handles GET /api/retirement/incomes
func (h *IncomeHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	// Get optional plan_id filter from query params
	planID := r.URL.Query().Get("plan_id")

	h.mu.RLock()
	incomes := make([]*IncomeSource, 0)
	for _, income := range h.incomes {
		if planID == "" || income.PlanID == planID {
			incomes = append(incomes, income)
		}
	}
	h.mu.RUnlock()

	resp := ListIncomesResponse{
		Incomes: incomes,
		Total:   len(incomes),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleListByPlan handles GET /api/retirement/plans/{planId}/incomes
func (h *IncomeHandler) HandleListByPlan(w http.ResponseWriter, r *http.Request, planID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	incomes := make([]*IncomeSource, 0)
	for _, income := range h.incomes {
		if income.PlanID == planID {
			incomes = append(incomes, income)
		}
	}
	h.mu.RUnlock()

	resp := ListIncomesResponse{
		Incomes: incomes,
		Total:   len(incomes),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleUpdate handles PUT /api/retirement/incomes/{id}
func (h *IncomeHandler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PUT/PATCH methods are allowed")
		return
	}

	var req UpdateIncomeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	income, exists := h.incomes[id]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Income source not found")
		return
	}

	// Apply updates
	if req.Type != nil {
		income.Type = *req.Type
	}
	if req.Name != nil {
		income.Name = *req.Name
	}
	if req.Amount != nil {
		income.Amount = *req.Amount
	}
	if req.StartAge != nil {
		income.StartAge = *req.StartAge
	}
	if req.EndAge != nil {
		income.EndAge = *req.EndAge
	}
	if req.GrowthRate != nil {
		income.GrowthRate = *req.GrowthRate
	}
	if req.IsTaxable != nil {
		income.IsTaxable = *req.IsTaxable
	}
	if req.Description != nil {
		income.Description = *req.Description
	}

	income.UpdatedAt = time.Now()

	h.writeJSON(w, http.StatusOK, income)
}

// HandleDelete handles DELETE /api/retirement/incomes/{id}
func (h *IncomeHandler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	h.mu.Lock()
	_, exists := h.incomes[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Income source not found")
		return
	}
	delete(h.incomes, id)
	h.mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

// HandleGetIncomeBreakdown handles GET /api/retirement/plans/{planId}/income-breakdown
func (h *IncomeHandler) HandleGetIncomeBreakdown(w http.ResponseWriter, r *http.Request, planID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	summary := IncomeBreakdownSummary{}

	h.mu.RLock()
	for _, income := range h.incomes {
		if income.PlanID == planID {
			switch income.Type {
			case dto.IncomeSourceEmployment:
				summary.EmploymentIncome += income.Amount
			case dto.IncomeSourceSocialSec:
				summary.SocialSecurity += income.Amount
			case dto.IncomeSourcePension:
				summary.Pension += income.Amount
			case dto.IncomeSourceInvestment:
				summary.InvestmentIncome += income.Amount
			case dto.IncomeSourceRental:
				summary.RentalIncome += income.Amount
			case dto.IncomeSourceWithdrawal:
				summary.WithdrawalIncome += income.Amount
			case dto.IncomeSourceOther:
				summary.OtherIncome += income.Amount
			}
		}
	}
	h.mu.RUnlock()

	summary.TotalIncome = summary.EmploymentIncome + summary.SocialSecurity +
		summary.Pension + summary.InvestmentIncome + summary.RentalIncome +
		summary.WithdrawalIncome + summary.OtherIncome

	h.writeJSON(w, http.StatusOK, summary)
}

// validateCreateRequest validates the create income request
func (h *IncomeHandler) validateCreateRequest(req *CreateIncomeRequest) error {
	if req.PlanID == "" {
		return newValidationError("plan_id is required")
	}
	if req.Name == "" {
		return newValidationError("name is required")
	}
	if !isValidIncomeType(req.Type) {
		return newValidationError("type must be one of: employment, social_security, pension, investment, rental, other, withdrawal")
	}
	if req.Amount < 0 {
		return newValidationError("amount cannot be negative")
	}
	if req.StartAge < 0 {
		return newValidationError("start_age cannot be negative")
	}
	if req.EndAge < 0 {
		return newValidationError("end_age cannot be negative")
	}
	if req.EndAge > 0 && req.StartAge > 0 && req.EndAge < req.StartAge {
		return newValidationError("end_age must be greater than or equal to start_age")
	}
	if req.GrowthRate < -1 || req.GrowthRate > 1 {
		return newValidationError("growth_rate must be between -1 and 1")
	}
	return nil
}

// isValidIncomeType checks if the income source type is valid
func isValidIncomeType(t dto.IncomeSourceType) bool {
	switch t {
	case dto.IncomeSourceEmployment, dto.IncomeSourceSocialSec, dto.IncomeSourcePension,
		dto.IncomeSourceInvestment, dto.IncomeSourceRental, dto.IncomeSourceOther,
		dto.IncomeSourceWithdrawal:
		return true
	}
	return false
}

// writeJSON writes a JSON response
func (h *IncomeHandler) writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeError writes an error response
func (h *IncomeHandler) writeError(w http.ResponseWriter, status int, errCode string, message string) {
	h.writeJSON(w, status, ErrorResponse{
		Error:   errCode,
		Message: message,
	})
}
