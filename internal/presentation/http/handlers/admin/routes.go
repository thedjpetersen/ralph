package admin

import (
	"net/http"
	"strings"
)

// Router handles routing for admin user-related endpoints
type Router struct {
	userHandler *UserHandler
}

// NewRouter creates a new Router with the given handler
func NewRouter(userHandler *UserHandler) *Router {
	return &Router{
		userHandler: userHandler,
	}
}

// NewDefaultRouter creates a new Router with a default handler
func NewDefaultRouter() *Router {
	return &Router{
		userHandler: NewUserHandler(),
	}
}

// RegisterRoutes registers all admin routes with the given mux
// Note: These routes should be wrapped with RequireAdmin middleware by the caller
//
// User Management Endpoints:
//  1. GET    /api/admin/users              - List all users (with ?status and ?role filters)
//  2. POST   /api/admin/users              - Create a new user
//  3. GET    /api/admin/users/{id}         - Get user by ID
//  4. PUT    /api/admin/users/{id}         - Update user
//  5. DELETE /api/admin/users/{id}         - Delete user
//  6. POST   /api/admin/users/{id}/suspend - Suspend user
//  7. POST   /api/admin/users/{id}/unsuspend - Unsuspend user
//  8. POST   /api/admin/users/{id}/impersonate - Generate impersonation token
func (r *Router) RegisterRoutes(mux *http.ServeMux) {
	// User management routes
	mux.HandleFunc("/api/admin/users", r.handleUsers)
	mux.HandleFunc("/api/admin/users/", r.handleUserByID)
}

// handleUsers routes requests for /api/admin/users
func (r *Router) handleUsers(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodGet:
		r.userHandler.HandleList(w, req)
	case http.MethodPost:
		r.userHandler.HandleCreate(w, req)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleUserByID routes requests for /api/admin/users/{id} and sub-resources
func (r *Router) handleUserByID(w http.ResponseWriter, req *http.Request) {
	// Extract the path after /api/admin/users/
	path := strings.TrimPrefix(req.URL.Path, "/api/admin/users/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, "User ID required", http.StatusBadRequest)
		return
	}

	userID := parts[0]

	// Check if this is a sub-resource request
	if len(parts) > 1 {
		switch parts[1] {
		case "suspend":
			r.userHandler.HandleSuspend(w, req, userID)
			return
		case "unsuspend":
			r.userHandler.HandleUnsuspend(w, req, userID)
			return
		case "impersonate":
			r.userHandler.HandleImpersonate(w, req, userID)
			return
		default:
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
	}

	// Handle user CRUD operations
	switch req.Method {
	case http.MethodGet:
		r.userHandler.HandleGet(w, req, userID)
	case http.MethodPut, http.MethodPatch:
		r.userHandler.HandleUpdate(w, req, userID)
	case http.MethodDelete:
		r.userHandler.HandleDelete(w, req, userID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// GetUserHandler returns the user handler
func (r *Router) GetUserHandler() *UserHandler {
	return r.userHandler
}
