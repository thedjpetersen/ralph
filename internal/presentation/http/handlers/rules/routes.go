package rules

import (
	"net/http"
	"strings"
)

// Router handles routing for rule-related endpoints
type Router struct {
	handler *RuleHandler
}

// NewRouter creates a new Router with the given handler
func NewRouter(handler *RuleHandler) *Router {
	return &Router{
		handler: handler,
	}
}

// NewDefaultRouter creates a new Router with a default handler
func NewDefaultRouter() *Router {
	return &Router{
		handler: NewRuleHandler(),
	}
}

// RegisterRoutes registers all rule routes with the given mux
// Total routes: 20 endpoints
//
// Core CRUD (5):
//  1. POST   /api/rules                          - Create rule
//  2. GET    /api/rules/{id}                     - Get single rule
//  3. GET    /api/rules                          - List rules (with ?user_id filter)
//  4. PUT    /api/rules/{id}                     - Update rule
//  5. DELETE /api/rules/{id}                     - Delete rule
//
// Rule State Operations (4):
//  6. POST   /api/rules/{id}/enable              - Enable rule
//  7. POST   /api/rules/{id}/disable             - Disable rule
//  8. PATCH  /api/rules/{id}/priority            - Update priority
//  9. GET    /api/rules/{id}/validate            - Validate rule
//
// Condition Management (4):
// 10. POST   /api/rules/{id}/conditions          - Add condition
// 11. DELETE /api/rules/{id}/conditions/{cid}    - Remove condition
// 12. GET    /api/rules/{id}/conditions          - List conditions
// 13. PATCH  /api/rules/{id}/conditions/{cid}    - Update condition
//
// Action Management (4):
// 14. POST   /api/rules/{id}/actions             - Add action
// 15. DELETE /api/rules/{id}/actions/{aid}       - Remove action
// 16. GET    /api/rules/{id}/actions             - List actions
// 17. PATCH  /api/rules/{id}/actions/{aid}       - Update action
//
// Execution & Testing (3):
// 18. POST   /api/rules/{id}/execute             - Execute rule
// 19. POST   /api/rules/{id}/test                - Test rule
// 20. POST   /api/rules/batch-execute            - Execute multiple rules
func (r *Router) RegisterRoutes(mux *http.ServeMux) {
	// Base routes
	mux.HandleFunc("/api/rules", r.handleRules)
	mux.HandleFunc("/api/rules/", r.handleRuleByID)
}

// handleRules routes requests for /api/rules
func (r *Router) handleRules(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodGet:
		r.handler.HandleList(w, req)
	case http.MethodPost:
		r.handler.HandleCreate(w, req)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleRuleByID routes requests for /api/rules/{id} and sub-resources
func (r *Router) handleRuleByID(w http.ResponseWriter, req *http.Request) {
	// Extract the path after /api/rules/
	path := strings.TrimPrefix(req.URL.Path, "/api/rules/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, "Rule ID required", http.StatusBadRequest)
		return
	}

	// Special case: batch-execute endpoint
	if parts[0] == "batch-execute" {
		r.handler.HandleBatchExecute(w, req)
		return
	}

	ruleID := parts[0]

	// Check if this is a sub-resource request
	if len(parts) > 1 {
		switch parts[1] {
		case "enable":
			r.handler.HandleEnable(w, req, ruleID)
			return
		case "disable":
			r.handler.HandleDisable(w, req, ruleID)
			return
		case "priority":
			r.handler.HandleSetPriority(w, req, ruleID)
			return
		case "validate":
			r.handler.HandleValidate(w, req, ruleID)
			return
		case "execute":
			r.handler.HandleExecute(w, req, ruleID)
			return
		case "test":
			r.handler.HandleTest(w, req, ruleID)
			return
		case "conditions":
			r.handleConditions(w, req, ruleID, parts)
			return
		case "actions":
			r.handleActions(w, req, ruleID, parts)
			return
		default:
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
	}

	// Handle rule CRUD operations
	switch req.Method {
	case http.MethodGet:
		r.handler.HandleGet(w, req, ruleID)
	case http.MethodPut, http.MethodPatch:
		r.handler.HandleUpdate(w, req, ruleID)
	case http.MethodDelete:
		r.handler.HandleDelete(w, req, ruleID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleConditions routes requests for /api/rules/{id}/conditions
func (r *Router) handleConditions(w http.ResponseWriter, req *http.Request, ruleID string, parts []string) {
	// Check if there's a condition ID (for /api/rules/{id}/conditions/{conditionId})
	if len(parts) > 2 && parts[2] != "" {
		conditionID := parts[2]
		switch req.Method {
		case http.MethodDelete:
			r.handler.HandleRemoveCondition(w, req, ruleID, conditionID)
		case http.MethodPatch:
			r.handler.HandleUpdateCondition(w, req, ruleID, conditionID)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// Handle /api/rules/{id}/conditions
	switch req.Method {
	case http.MethodGet:
		r.handler.HandleListConditions(w, req, ruleID)
	case http.MethodPost:
		r.handler.HandleAddCondition(w, req, ruleID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleActions routes requests for /api/rules/{id}/actions
func (r *Router) handleActions(w http.ResponseWriter, req *http.Request, ruleID string, parts []string) {
	// Check if there's an action ID (for /api/rules/{id}/actions/{actionId})
	if len(parts) > 2 && parts[2] != "" {
		actionID := parts[2]
		switch req.Method {
		case http.MethodDelete:
			r.handler.HandleRemoveAction(w, req, ruleID, actionID)
		case http.MethodPatch:
			r.handler.HandleUpdateAction(w, req, ruleID, actionID)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// Handle /api/rules/{id}/actions
	switch req.Method {
	case http.MethodGet:
		r.handler.HandleListActions(w, req, ruleID)
	case http.MethodPost:
		r.handler.HandleAddAction(w, req, ruleID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// GetHandler returns the rule handler
func (r *Router) GetHandler() *RuleHandler {
	return r.handler
}
