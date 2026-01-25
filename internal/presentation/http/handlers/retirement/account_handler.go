package retirement

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"

	"clockzen-next/internal/application/dto"
)

// Account represents a retirement account
type Account struct {
	ID          string          `json:"id"`
	PlanID      string          `json:"plan_id"`
	Name        string          `json:"name"`
	AccountType dto.AccountType `json:"account_type"`
	Balance     float64         `json:"balance"`
	Contribution float64        `json:"contribution"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

// AccountHandler handles HTTP requests for retirement accounts
type AccountHandler struct {
	mu       sync.RWMutex
	accounts map[string]*Account
}

// NewAccountHandler creates a new AccountHandler instance
func NewAccountHandler() *AccountHandler {
	return &AccountHandler{
		accounts: make(map[string]*Account),
	}
}

// CreateAccountRequest represents a request to create a retirement account
type CreateAccountRequest struct {
	PlanID       string          `json:"plan_id"`
	Name         string          `json:"name"`
	AccountType  dto.AccountType `json:"account_type"`
	Balance      float64         `json:"balance"`
	Contribution float64         `json:"contribution"`
}

// UpdateAccountRequest represents a request to update a retirement account
type UpdateAccountRequest struct {
	Name         *string          `json:"name,omitempty"`
	AccountType  *dto.AccountType `json:"account_type,omitempty"`
	Balance      *float64         `json:"balance,omitempty"`
	Contribution *float64         `json:"contribution,omitempty"`
}

// ListAccountsResponse represents a list of accounts response
type ListAccountsResponse struct {
	Accounts []*Account `json:"accounts"`
	Total    int        `json:"total"`
}

// AccountBalanceSummary represents account balance summary by type
type AccountBalanceSummary struct {
	TaxableBalance     float64 `json:"taxable_balance"`
	TraditionalBalance float64 `json:"traditional_balance"`
	RothBalance        float64 `json:"roth_balance"`
	HSABalance         float64 `json:"hsa_balance"`
	TotalBalance       float64 `json:"total_balance"`
}

// HandleCreate handles POST /api/retirement/accounts
func (h *AccountHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req CreateAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if err := h.validateCreateRequest(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	now := time.Now()
	account := &Account{
		ID:           uuid.New().String(),
		PlanID:       req.PlanID,
		Name:         req.Name,
		AccountType:  req.AccountType,
		Balance:      req.Balance,
		Contribution: req.Contribution,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	h.mu.Lock()
	h.accounts[account.ID] = account
	h.mu.Unlock()

	h.writeJSON(w, http.StatusCreated, account)
}

// HandleGet handles GET /api/retirement/accounts/{id}
func (h *AccountHandler) HandleGet(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	account, exists := h.accounts[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Account not found")
		return
	}

	h.writeJSON(w, http.StatusOK, account)
}

// HandleList handles GET /api/retirement/accounts
func (h *AccountHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	// Get optional plan_id filter from query params
	planID := r.URL.Query().Get("plan_id")

	h.mu.RLock()
	accounts := make([]*Account, 0)
	for _, account := range h.accounts {
		if planID == "" || account.PlanID == planID {
			accounts = append(accounts, account)
		}
	}
	h.mu.RUnlock()

	resp := ListAccountsResponse{
		Accounts: accounts,
		Total:    len(accounts),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleListByPlan handles GET /api/retirement/plans/{planId}/accounts
func (h *AccountHandler) HandleListByPlan(w http.ResponseWriter, r *http.Request, planID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	accounts := make([]*Account, 0)
	for _, account := range h.accounts {
		if account.PlanID == planID {
			accounts = append(accounts, account)
		}
	}
	h.mu.RUnlock()

	resp := ListAccountsResponse{
		Accounts: accounts,
		Total:    len(accounts),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleUpdate handles PUT /api/retirement/accounts/{id}
func (h *AccountHandler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PUT/PATCH methods are allowed")
		return
	}

	var req UpdateAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	account, exists := h.accounts[id]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Account not found")
		return
	}

	// Apply updates
	if req.Name != nil {
		account.Name = *req.Name
	}
	if req.AccountType != nil {
		account.AccountType = *req.AccountType
	}
	if req.Balance != nil {
		account.Balance = *req.Balance
	}
	if req.Contribution != nil {
		account.Contribution = *req.Contribution
	}

	account.UpdatedAt = time.Now()

	h.writeJSON(w, http.StatusOK, account)
}

// HandleDelete handles DELETE /api/retirement/accounts/{id}
func (h *AccountHandler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	h.mu.Lock()
	_, exists := h.accounts[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Account not found")
		return
	}
	delete(h.accounts, id)
	h.mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

// HandleGetBalanceSummary handles GET /api/retirement/plans/{planId}/balance-summary
func (h *AccountHandler) HandleGetBalanceSummary(w http.ResponseWriter, r *http.Request, planID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	summary := AccountBalanceSummary{}

	h.mu.RLock()
	for _, account := range h.accounts {
		if account.PlanID == planID {
			switch account.AccountType {
			case dto.AccountTypeTaxable:
				summary.TaxableBalance += account.Balance
			case dto.AccountTypeTraditional:
				summary.TraditionalBalance += account.Balance
			case dto.AccountTypeRoth:
				summary.RothBalance += account.Balance
			case dto.AccountTypeHSA:
				summary.HSABalance += account.Balance
			}
		}
	}
	h.mu.RUnlock()

	summary.TotalBalance = summary.TaxableBalance + summary.TraditionalBalance +
		summary.RothBalance + summary.HSABalance

	h.writeJSON(w, http.StatusOK, summary)
}

// validateCreateRequest validates the create account request
func (h *AccountHandler) validateCreateRequest(req *CreateAccountRequest) error {
	if req.PlanID == "" {
		return newValidationError("plan_id is required")
	}
	if req.Name == "" {
		return newValidationError("name is required")
	}
	if !isValidAccountType(req.AccountType) {
		return newValidationError("account_type must be one of: taxable, traditional, roth, hsa")
	}
	if req.Balance < 0 {
		return newValidationError("balance cannot be negative")
	}
	if req.Contribution < 0 {
		return newValidationError("contribution cannot be negative")
	}
	return nil
}

// isValidAccountType checks if the account type is valid
func isValidAccountType(t dto.AccountType) bool {
	switch t {
	case dto.AccountTypeTaxable, dto.AccountTypeTraditional, dto.AccountTypeRoth, dto.AccountTypeHSA:
		return true
	}
	return false
}

// writeJSON writes a JSON response
func (h *AccountHandler) writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeError writes an error response
func (h *AccountHandler) writeError(w http.ResponseWriter, status int, errCode string, message string) {
	h.writeJSON(w, status, ErrorResponse{
		Error:   errCode,
		Message: message,
	})
}
