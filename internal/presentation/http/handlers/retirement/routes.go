package retirement

import (
	"net/http"
	"strings"
)

// Router handles routing for retirement-related endpoints
type Router struct {
	planHandler    *PlanHandler
	accountHandler *AccountHandler
	incomeHandler  *IncomeHandler
	expenseHandler *ExpenseHandler
}

// NewRouter creates a new Router with the given handlers
func NewRouter(planHandler *PlanHandler, accountHandler *AccountHandler, incomeHandler *IncomeHandler, expenseHandler *ExpenseHandler) *Router {
	return &Router{
		planHandler:    planHandler,
		accountHandler: accountHandler,
		incomeHandler:  incomeHandler,
		expenseHandler: expenseHandler,
	}
}

// NewDefaultRouter creates a new Router with default handlers
func NewDefaultRouter() *Router {
	return &Router{
		planHandler:    NewPlanHandler(),
		accountHandler: NewAccountHandler(),
		incomeHandler:  NewIncomeHandler(),
		expenseHandler: NewExpenseHandler(),
	}
}

// RegisterRoutes registers all retirement routes with the given mux
func (r *Router) RegisterRoutes(mux *http.ServeMux) {
	// Plan routes
	mux.HandleFunc("/api/retirement/plans", r.handlePlans)
	mux.HandleFunc("/api/retirement/plans/", r.handlePlanByID)

	// Account routes
	mux.HandleFunc("/api/retirement/accounts", r.handleAccounts)
	mux.HandleFunc("/api/retirement/accounts/", r.handleAccountByID)

	// Income routes
	mux.HandleFunc("/api/retirement/incomes", r.handleIncomes)
	mux.HandleFunc("/api/retirement/incomes/", r.handleIncomeByID)

	// Expense routes
	mux.HandleFunc("/api/retirement/expenses", r.handleExpenses)
	mux.HandleFunc("/api/retirement/expenses/", r.handleExpenseByID)
}

// handlePlans routes requests for /api/retirement/plans
func (r *Router) handlePlans(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodGet:
		r.planHandler.HandleList(w, req)
	case http.MethodPost:
		r.planHandler.HandleCreate(w, req)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handlePlanByID routes requests for /api/retirement/plans/{id}
func (r *Router) handlePlanByID(w http.ResponseWriter, req *http.Request) {
	// Extract the ID from the URL path
	path := strings.TrimPrefix(req.URL.Path, "/api/retirement/plans/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, "Plan ID required", http.StatusBadRequest)
		return
	}

	planID := parts[0]

	// Check if this is a sub-resource request (accounts, incomes, expenses, or summaries)
	if len(parts) > 1 {
		switch parts[1] {
		case "accounts":
			r.accountHandler.HandleListByPlan(w, req, planID)
			return
		case "balance-summary":
			r.accountHandler.HandleGetBalanceSummary(w, req, planID)
			return
		case "incomes":
			r.incomeHandler.HandleListByPlan(w, req, planID)
			return
		case "income-breakdown":
			r.incomeHandler.HandleGetIncomeBreakdown(w, req, planID)
			return
		case "expenses":
			r.expenseHandler.HandleListByPlan(w, req, planID)
			return
		case "expense-breakdown":
			r.expenseHandler.HandleGetExpenseBreakdown(w, req, planID)
			return
		default:
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
	}

	// Handle plan CRUD operations
	switch req.Method {
	case http.MethodGet:
		r.planHandler.HandleGet(w, req, planID)
	case http.MethodPut, http.MethodPatch:
		r.planHandler.HandleUpdate(w, req, planID)
	case http.MethodDelete:
		r.planHandler.HandleDelete(w, req, planID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleAccounts routes requests for /api/retirement/accounts
func (r *Router) handleAccounts(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodGet:
		r.accountHandler.HandleList(w, req)
	case http.MethodPost:
		r.accountHandler.HandleCreate(w, req)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleAccountByID routes requests for /api/retirement/accounts/{id}
func (r *Router) handleAccountByID(w http.ResponseWriter, req *http.Request) {
	// Extract the ID from the URL path
	id := strings.TrimPrefix(req.URL.Path, "/api/retirement/accounts/")
	if id == "" {
		http.Error(w, "Account ID required", http.StatusBadRequest)
		return
	}

	// Handle account CRUD operations
	switch req.Method {
	case http.MethodGet:
		r.accountHandler.HandleGet(w, req, id)
	case http.MethodPut, http.MethodPatch:
		r.accountHandler.HandleUpdate(w, req, id)
	case http.MethodDelete:
		r.accountHandler.HandleDelete(w, req, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// GetPlanHandler returns the plan handler
func (r *Router) GetPlanHandler() *PlanHandler {
	return r.planHandler
}

// GetAccountHandler returns the account handler
func (r *Router) GetAccountHandler() *AccountHandler {
	return r.accountHandler
}

// GetIncomeHandler returns the income handler
func (r *Router) GetIncomeHandler() *IncomeHandler {
	return r.incomeHandler
}

// GetExpenseHandler returns the expense handler
func (r *Router) GetExpenseHandler() *ExpenseHandler {
	return r.expenseHandler
}

// handleIncomes routes requests for /api/retirement/incomes
func (r *Router) handleIncomes(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodGet:
		r.incomeHandler.HandleList(w, req)
	case http.MethodPost:
		r.incomeHandler.HandleCreate(w, req)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleIncomeByID routes requests for /api/retirement/incomes/{id}
func (r *Router) handleIncomeByID(w http.ResponseWriter, req *http.Request) {
	// Extract the ID from the URL path
	id := strings.TrimPrefix(req.URL.Path, "/api/retirement/incomes/")
	if id == "" {
		http.Error(w, "Income ID required", http.StatusBadRequest)
		return
	}

	// Handle income CRUD operations
	switch req.Method {
	case http.MethodGet:
		r.incomeHandler.HandleGet(w, req, id)
	case http.MethodPut, http.MethodPatch:
		r.incomeHandler.HandleUpdate(w, req, id)
	case http.MethodDelete:
		r.incomeHandler.HandleDelete(w, req, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleExpenses routes requests for /api/retirement/expenses
func (r *Router) handleExpenses(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodGet:
		r.expenseHandler.HandleList(w, req)
	case http.MethodPost:
		r.expenseHandler.HandleCreate(w, req)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleExpenseByID routes requests for /api/retirement/expenses/{id}
func (r *Router) handleExpenseByID(w http.ResponseWriter, req *http.Request) {
	// Extract the ID from the URL path
	id := strings.TrimPrefix(req.URL.Path, "/api/retirement/expenses/")
	if id == "" {
		http.Error(w, "Expense ID required", http.StatusBadRequest)
		return
	}

	// Handle expense CRUD operations
	switch req.Method {
	case http.MethodGet:
		r.expenseHandler.HandleGet(w, req, id)
	case http.MethodPut, http.MethodPatch:
		r.expenseHandler.HandleUpdate(w, req, id)
	case http.MethodDelete:
		r.expenseHandler.HandleDelete(w, req, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
