package retirement

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"

	"clockzen-next/internal/application/dto"
)

// Expense represents a retirement expense item
type Expense struct {
	ID          string                  `json:"id"`
	PlanID      string                  `json:"plan_id"`
	Category    dto.ExpenseCategoryType `json:"category"`
	Name        string                  `json:"name"`
	Amount      float64                 `json:"amount"`
	GrowthRate  float64                 `json:"growth_rate,omitempty"`
	Description string                  `json:"description,omitempty"`
	CreatedAt   time.Time               `json:"created_at"`
	UpdatedAt   time.Time               `json:"updated_at"`
}

// ExpenseHandler handles HTTP requests for retirement expenses
type ExpenseHandler struct {
	mu       sync.RWMutex
	expenses map[string]*Expense
}

// NewExpenseHandler creates a new ExpenseHandler instance
func NewExpenseHandler() *ExpenseHandler {
	return &ExpenseHandler{
		expenses: make(map[string]*Expense),
	}
}

// CreateExpenseRequest represents a request to create an expense
type CreateExpenseRequest struct {
	PlanID      string                  `json:"plan_id"`
	Category    dto.ExpenseCategoryType `json:"category"`
	Name        string                  `json:"name"`
	Amount      float64                 `json:"amount"`
	GrowthRate  float64                 `json:"growth_rate,omitempty"`
	Description string                  `json:"description,omitempty"`
}

// UpdateExpenseRequest represents a request to update an expense
type UpdateExpenseRequest struct {
	Category    *dto.ExpenseCategoryType `json:"category,omitempty"`
	Name        *string                  `json:"name,omitempty"`
	Amount      *float64                 `json:"amount,omitempty"`
	GrowthRate  *float64                 `json:"growth_rate,omitempty"`
	Description *string                  `json:"description,omitempty"`
}

// ListExpensesResponse represents a list of expenses response
type ListExpensesResponse struct {
	Expenses []*Expense `json:"expenses"`
	Total    int        `json:"total"`
}

// ExpenseBreakdownSummary represents expense breakdown by category
type ExpenseBreakdownSummary struct {
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

// HandleCreate handles POST /api/retirement/expenses
func (h *ExpenseHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req CreateExpenseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if err := h.validateCreateRequest(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	now := time.Now()
	expense := &Expense{
		ID:          uuid.New().String(),
		PlanID:      req.PlanID,
		Category:    req.Category,
		Name:        req.Name,
		Amount:      req.Amount,
		GrowthRate:  req.GrowthRate,
		Description: req.Description,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	h.mu.Lock()
	h.expenses[expense.ID] = expense
	h.mu.Unlock()

	h.writeJSON(w, http.StatusCreated, expense)
}

// HandleGet handles GET /api/retirement/expenses/{id}
func (h *ExpenseHandler) HandleGet(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	expense, exists := h.expenses[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Expense not found")
		return
	}

	h.writeJSON(w, http.StatusOK, expense)
}

// HandleList handles GET /api/retirement/expenses
func (h *ExpenseHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	// Get optional plan_id filter from query params
	planID := r.URL.Query().Get("plan_id")

	h.mu.RLock()
	expenses := make([]*Expense, 0)
	for _, expense := range h.expenses {
		if planID == "" || expense.PlanID == planID {
			expenses = append(expenses, expense)
		}
	}
	h.mu.RUnlock()

	resp := ListExpensesResponse{
		Expenses: expenses,
		Total:    len(expenses),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleListByPlan handles GET /api/retirement/plans/{planId}/expenses
func (h *ExpenseHandler) HandleListByPlan(w http.ResponseWriter, r *http.Request, planID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	expenses := make([]*Expense, 0)
	for _, expense := range h.expenses {
		if expense.PlanID == planID {
			expenses = append(expenses, expense)
		}
	}
	h.mu.RUnlock()

	resp := ListExpensesResponse{
		Expenses: expenses,
		Total:    len(expenses),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleUpdate handles PUT /api/retirement/expenses/{id}
func (h *ExpenseHandler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PUT/PATCH methods are allowed")
		return
	}

	var req UpdateExpenseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	expense, exists := h.expenses[id]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Expense not found")
		return
	}

	// Apply updates
	if req.Category != nil {
		expense.Category = *req.Category
	}
	if req.Name != nil {
		expense.Name = *req.Name
	}
	if req.Amount != nil {
		expense.Amount = *req.Amount
	}
	if req.GrowthRate != nil {
		expense.GrowthRate = *req.GrowthRate
	}
	if req.Description != nil {
		expense.Description = *req.Description
	}

	expense.UpdatedAt = time.Now()

	h.writeJSON(w, http.StatusOK, expense)
}

// HandleDelete handles DELETE /api/retirement/expenses/{id}
func (h *ExpenseHandler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	h.mu.Lock()
	_, exists := h.expenses[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Expense not found")
		return
	}
	delete(h.expenses, id)
	h.mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

// HandleGetExpenseBreakdown handles GET /api/retirement/plans/{planId}/expense-breakdown
func (h *ExpenseHandler) HandleGetExpenseBreakdown(w http.ResponseWriter, r *http.Request, planID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	summary := ExpenseBreakdownSummary{}

	h.mu.RLock()
	for _, expense := range h.expenses {
		if expense.PlanID == planID {
			switch expense.Category {
			case dto.ExpenseCategoryHousing:
				summary.HousingExpense += expense.Amount
			case dto.ExpenseCategoryHealthcare:
				summary.HealthcareExpense += expense.Amount
			case dto.ExpenseCategoryFood:
				summary.FoodExpense += expense.Amount
			case dto.ExpenseCategoryTransportation:
				summary.TransportationExpense += expense.Amount
			case dto.ExpenseCategoryUtilities:
				summary.UtilitiesExpense += expense.Amount
			case dto.ExpenseCategoryInsurance:
				summary.InsuranceExpense += expense.Amount
			case dto.ExpenseCategoryDiscretionary:
				summary.DiscretionaryExpense += expense.Amount
			case dto.ExpenseCategoryOther:
				summary.OtherExpenses += expense.Amount
			}
		}
	}
	h.mu.RUnlock()

	summary.TotalExpenses = summary.HousingExpense + summary.HealthcareExpense +
		summary.FoodExpense + summary.TransportationExpense + summary.UtilitiesExpense +
		summary.InsuranceExpense + summary.DiscretionaryExpense + summary.OtherExpenses

	h.writeJSON(w, http.StatusOK, summary)
}

// validateCreateRequest validates the create expense request
func (h *ExpenseHandler) validateCreateRequest(req *CreateExpenseRequest) error {
	if req.PlanID == "" {
		return newValidationError("plan_id is required")
	}
	if req.Name == "" {
		return newValidationError("name is required")
	}
	if !isValidExpenseCategory(req.Category) {
		return newValidationError("category must be one of: housing, healthcare, food, transportation, utilities, insurance, discretionary, other")
	}
	if req.Amount < 0 {
		return newValidationError("amount cannot be negative")
	}
	if req.GrowthRate < -1 || req.GrowthRate > 1 {
		return newValidationError("growth_rate must be between -1 and 1")
	}
	return nil
}

// isValidExpenseCategory checks if the expense category is valid
func isValidExpenseCategory(c dto.ExpenseCategoryType) bool {
	switch c {
	case dto.ExpenseCategoryHousing, dto.ExpenseCategoryHealthcare, dto.ExpenseCategoryFood,
		dto.ExpenseCategoryTransportation, dto.ExpenseCategoryUtilities, dto.ExpenseCategoryInsurance,
		dto.ExpenseCategoryDiscretionary, dto.ExpenseCategoryOther:
		return true
	}
	return false
}

// writeJSON writes a JSON response
func (h *ExpenseHandler) writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeError writes an error response
func (h *ExpenseHandler) writeError(w http.ResponseWriter, status int, errCode string, message string) {
	h.writeJSON(w, status, ErrorResponse{
		Error:   errCode,
		Message: message,
	})
}
