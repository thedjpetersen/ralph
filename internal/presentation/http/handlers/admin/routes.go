package admin

import (
	"net/http"
	"strings"
)

// Router handles routing for admin user-related endpoints
type Router struct {
	userHandler    *UserHandler
	queueHandler   *QueueHandler
	patternHandler *PatternHandler
}

// NewRouter creates a new Router with the given handlers
func NewRouter(userHandler *UserHandler, queueHandler *QueueHandler, patternHandler *PatternHandler) *Router {
	return &Router{
		userHandler:    userHandler,
		queueHandler:   queueHandler,
		patternHandler: patternHandler,
	}
}

// NewDefaultRouter creates a new Router with default handlers
func NewDefaultRouter() *Router {
	return &Router{
		userHandler:    NewUserHandler(),
		queueHandler:   NewQueueHandler(),
		patternHandler: NewPatternHandler(),
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
//
// Queue Management Endpoints:
//  9.  GET    /api/admin/queues              - List all queues (with ?status filter)
//  10. GET    /api/admin/queues/stats        - Get aggregate queue statistics
//  11. GET    /api/admin/queues/{name}       - Get queue by name
//  12. GET    /api/admin/queues/{name}/jobs  - List jobs in queue (with ?status filter)
//  13. POST   /api/admin/queues/{name}/flush - Flush queue (with ?status filter)
//  14. POST   /api/admin/queues/{name}/pause - Pause queue processing
//  15. POST   /api/admin/queues/{name}/resume - Resume queue processing
//  16. GET    /api/admin/queues/{name}/jobs/{id} - Get job by ID
//  17. POST   /api/admin/queues/{name}/jobs/{id}/retry - Retry a failed/cancelled job
//  18. POST   /api/admin/queues/{name}/jobs/{id}/cancel - Cancel a pending/processing job
//  19. DELETE /api/admin/queues/{name}/jobs/{id} - Delete a job
//
// Pattern Management Endpoints:
//  20. GET    /api/admin/patterns              - List all patterns (with ?status, ?type, ?scope, ?category filters)
//  21. POST   /api/admin/patterns              - Create a new pattern
//  22. POST   /api/admin/patterns/test         - Test a pattern without storing
//  23. GET    /api/admin/patterns/{id}         - Get pattern by ID
//  24. PUT    /api/admin/patterns/{id}         - Update pattern
//  25. DELETE /api/admin/patterns/{id}         - Delete pattern
//  26. POST   /api/admin/patterns/{id}/activate   - Activate a pattern
//  27. POST   /api/admin/patterns/{id}/deactivate - Deactivate a pattern
//  28. POST   /api/admin/patterns/{id}/test       - Test a stored pattern with test cases
func (r *Router) RegisterRoutes(mux *http.ServeMux) {
	// User management routes
	mux.HandleFunc("/api/admin/users", r.handleUsers)
	mux.HandleFunc("/api/admin/users/", r.handleUserByID)

	// Queue management routes
	mux.HandleFunc("/api/admin/queues", r.handleQueues)
	mux.HandleFunc("/api/admin/queues/", r.handleQueueByName)

	// Pattern management routes
	mux.HandleFunc("/api/admin/patterns", r.handlePatterns)
	mux.HandleFunc("/api/admin/patterns/", r.handlePatternByID)
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

// GetQueueHandler returns the queue handler
func (r *Router) GetQueueHandler() *QueueHandler {
	return r.queueHandler
}

// handleQueues routes requests for /api/admin/queues
func (r *Router) handleQueues(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodGet:
		r.queueHandler.HandleListQueues(w, req)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleQueueByName routes requests for /api/admin/queues/{name} and sub-resources
func (r *Router) handleQueueByName(w http.ResponseWriter, req *http.Request) {
	// Extract the path after /api/admin/queues/
	path := strings.TrimPrefix(req.URL.Path, "/api/admin/queues/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, "Queue name required", http.StatusBadRequest)
		return
	}

	queueName := parts[0]

	// Handle /api/admin/queues/stats (special case - not a queue name)
	if queueName == "stats" && len(parts) == 1 {
		r.queueHandler.HandleGetStats(w, req)
		return
	}

	// Check if this is a sub-resource request
	if len(parts) > 1 {
		switch parts[1] {
		case "jobs":
			r.handleQueueJobs(w, req, queueName, parts[2:])
			return
		case "flush":
			r.queueHandler.HandleFlushQueue(w, req, queueName)
			return
		case "pause":
			r.queueHandler.HandlePauseQueue(w, req, queueName)
			return
		case "resume":
			r.queueHandler.HandleResumeQueue(w, req, queueName)
			return
		default:
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
	}

	// Handle queue CRUD operations
	switch req.Method {
	case http.MethodGet:
		r.queueHandler.HandleGetQueue(w, req, queueName)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleQueueJobs routes requests for /api/admin/queues/{name}/jobs and sub-resources
func (r *Router) handleQueueJobs(w http.ResponseWriter, req *http.Request, queueName string, parts []string) {
	// Handle /api/admin/queues/{name}/jobs
	if len(parts) == 0 {
		switch req.Method {
		case http.MethodGet:
			r.queueHandler.HandleListJobs(w, req, queueName)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	jobID := parts[0]

	// Handle /api/admin/queues/{name}/jobs/{id}/action
	if len(parts) > 1 {
		switch parts[1] {
		case "retry":
			r.queueHandler.HandleRetryJob(w, req, queueName, jobID)
			return
		case "cancel":
			r.queueHandler.HandleCancelJob(w, req, queueName, jobID)
			return
		default:
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
	}

	// Handle /api/admin/queues/{name}/jobs/{id}
	switch req.Method {
	case http.MethodGet:
		r.queueHandler.HandleGetJob(w, req, queueName, jobID)
	case http.MethodDelete:
		r.queueHandler.HandleDeleteJob(w, req, queueName, jobID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handlePatterns routes requests for /api/admin/patterns
func (r *Router) handlePatterns(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodGet:
		r.patternHandler.HandleList(w, req)
	case http.MethodPost:
		r.patternHandler.HandleCreate(w, req)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handlePatternByID routes requests for /api/admin/patterns/{id} and sub-resources
func (r *Router) handlePatternByID(w http.ResponseWriter, req *http.Request) {
	// Extract the path after /api/admin/patterns/
	path := strings.TrimPrefix(req.URL.Path, "/api/admin/patterns/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, "Pattern ID required", http.StatusBadRequest)
		return
	}

	patternID := parts[0]

	// Handle /api/admin/patterns/test (special case - not a pattern ID)
	if patternID == "test" && len(parts) == 1 {
		r.patternHandler.HandleTest(w, req)
		return
	}

	// Check if this is a sub-resource request
	if len(parts) > 1 {
		switch parts[1] {
		case "activate":
			r.patternHandler.HandleActivate(w, req, patternID)
			return
		case "deactivate":
			r.patternHandler.HandleDeactivate(w, req, patternID)
			return
		case "test":
			r.patternHandler.HandleTestByID(w, req, patternID)
			return
		default:
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
	}

	// Handle pattern CRUD operations
	switch req.Method {
	case http.MethodGet:
		r.patternHandler.HandleGet(w, req, patternID)
	case http.MethodPut, http.MethodPatch:
		r.patternHandler.HandleUpdate(w, req, patternID)
	case http.MethodDelete:
		r.patternHandler.HandleDelete(w, req, patternID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// GetPatternHandler returns the pattern handler
func (r *Router) GetPatternHandler() *PatternHandler {
	return r.patternHandler
}
