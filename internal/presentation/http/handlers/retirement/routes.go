package retirement

import (
	"net/http"
	"strings"
)

// Router handles routing for retirement-related endpoints
type Router struct {
	planHandler    *PlanHandler
	accountHandler *AccountHandler
}

// NewRouter creates a new Router with the given handlers
func NewRouter(planHandler *PlanHandler, accountHandler *AccountHandler) *Router {
	return &Router{
		planHandler:    planHandler,
		accountHandler: accountHandler,
	}
}

// NewDefaultRouter creates a new Router with default handlers
func NewDefaultRouter() *Router {
	return &Router{
		planHandler:    NewPlanHandler(),
		accountHandler: NewAccountHandler(),
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

	// Check if this is a sub-resource request (accounts or balance-summary)
	if len(parts) > 1 {
		switch parts[1] {
		case "accounts":
			r.accountHandler.HandleListByPlan(w, req, planID)
			return
		case "balance-summary":
			r.accountHandler.HandleGetBalanceSummary(w, req, planID)
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
