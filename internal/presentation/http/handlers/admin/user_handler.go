package admin

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
)

// UserStatus represents the status of a user account
type UserStatus string

const (
	UserStatusActive    UserStatus = "active"
	UserStatusSuspended UserStatus = "suspended"
	UserStatusPending   UserStatus = "pending"
)

// UserRole represents the role of a user
type UserRole string

const (
	UserRoleUser  UserRole = "user"
	UserRoleAdmin UserRole = "admin"
)

// User represents a user in the system
type User struct {
	ID            string     `json:"id"`
	Email         string     `json:"email"`
	Name          string     `json:"name"`
	Role          UserRole   `json:"role"`
	Status        UserStatus `json:"status"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	LastLoginAt   *time.Time `json:"last_login_at,omitempty"`
	SuspendedAt   *time.Time `json:"suspended_at,omitempty"`
	SuspendReason string     `json:"suspend_reason,omitempty"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// ListUsersResponse represents a list of users response
type ListUsersResponse struct {
	Users []*User `json:"users"`
	Total int     `json:"total"`
}

// CreateUserRequest represents a request to create a user
type CreateUserRequest struct {
	Email string   `json:"email"`
	Name  string   `json:"name"`
	Role  UserRole `json:"role,omitempty"`
}

// UpdateUserRequest represents a request to update a user
type UpdateUserRequest struct {
	Email *string   `json:"email,omitempty"`
	Name  *string   `json:"name,omitempty"`
	Role  *UserRole `json:"role,omitempty"`
}

// SuspendUserRequest represents a request to suspend a user
type SuspendUserRequest struct {
	Reason string `json:"reason"`
}

// ImpersonateResponse represents the response for user impersonation
type ImpersonateResponse struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
	UserID    string    `json:"user_id"`
	Email     string    `json:"email"`
}

// UserHandler handles HTTP requests for admin user management
type UserHandler struct {
	mu    sync.RWMutex
	users map[string]*User
}

// NewUserHandler creates a new UserHandler instance
func NewUserHandler() *UserHandler {
	return &UserHandler{
		users: make(map[string]*User),
	}
}

// HandleList handles GET /api/admin/users
func (h *UserHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	// Get optional filters from query params
	status := r.URL.Query().Get("status")
	role := r.URL.Query().Get("role")

	h.mu.RLock()
	users := make([]*User, 0)
	for _, user := range h.users {
		// Apply status filter if provided
		if status != "" && string(user.Status) != status {
			continue
		}
		// Apply role filter if provided
		if role != "" && string(user.Role) != role {
			continue
		}
		users = append(users, user)
	}
	h.mu.RUnlock()

	resp := ListUsersResponse{
		Users: users,
		Total: len(users),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleGet handles GET /api/admin/users/{id}
func (h *UserHandler) HandleGet(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	user, exists := h.users[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "User not found")
		return
	}

	h.writeJSON(w, http.StatusOK, user)
}

// HandleCreate handles POST /api/admin/users
func (h *UserHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if req.Email == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "email is required")
		return
	}
	if req.Name == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "name is required")
		return
	}

	// Check for duplicate email
	h.mu.RLock()
	for _, user := range h.users {
		if user.Email == req.Email {
			h.mu.RUnlock()
			h.writeError(w, http.StatusConflict, "conflict", "User with this email already exists")
			return
		}
	}
	h.mu.RUnlock()

	role := UserRoleUser
	if req.Role != "" {
		role = req.Role
	}

	now := time.Now()
	user := &User{
		ID:        uuid.New().String(),
		Email:     req.Email,
		Name:      req.Name,
		Role:      role,
		Status:    UserStatusActive,
		CreatedAt: now,
		UpdatedAt: now,
	}

	h.mu.Lock()
	h.users[user.ID] = user
	h.mu.Unlock()

	h.writeJSON(w, http.StatusCreated, user)
}

// HandleUpdate handles PUT/PATCH /api/admin/users/{id}
func (h *UserHandler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PUT/PATCH methods are allowed")
		return
	}

	var req UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	user, exists := h.users[id]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "User not found")
		return
	}

	// Check for duplicate email if changing email
	if req.Email != nil && *req.Email != user.Email {
		for _, u := range h.users {
			if u.Email == *req.Email {
				h.writeError(w, http.StatusConflict, "conflict", "User with this email already exists")
				return
			}
		}
		user.Email = *req.Email
	}

	if req.Name != nil {
		user.Name = *req.Name
	}
	if req.Role != nil {
		user.Role = *req.Role
	}

	user.UpdatedAt = time.Now()

	h.writeJSON(w, http.StatusOK, user)
}

// HandleDelete handles DELETE /api/admin/users/{id}
func (h *UserHandler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	h.mu.Lock()
	_, exists := h.users[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "User not found")
		return
	}
	delete(h.users, id)
	h.mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

// HandleSuspend handles POST /api/admin/users/{id}/suspend
func (h *UserHandler) HandleSuspend(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req SuspendUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.Lock()
	user, exists := h.users[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "User not found")
		return
	}

	if user.Status == UserStatusSuspended {
		h.mu.Unlock()
		h.writeError(w, http.StatusConflict, "conflict", "User is already suspended")
		return
	}

	now := time.Now()
	user.Status = UserStatusSuspended
	user.SuspendedAt = &now
	user.SuspendReason = req.Reason
	user.UpdatedAt = now
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, user)
}

// HandleUnsuspend handles POST /api/admin/users/{id}/unsuspend
func (h *UserHandler) HandleUnsuspend(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	h.mu.Lock()
	user, exists := h.users[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "User not found")
		return
	}

	if user.Status != UserStatusSuspended {
		h.mu.Unlock()
		h.writeError(w, http.StatusConflict, "conflict", "User is not suspended")
		return
	}

	user.Status = UserStatusActive
	user.SuspendedAt = nil
	user.SuspendReason = ""
	user.UpdatedAt = time.Now()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, user)
}

// HandleImpersonate handles POST /api/admin/users/{id}/impersonate
// This generates a temporary token that allows an admin to act as another user
func (h *UserHandler) HandleImpersonate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	h.mu.RLock()
	user, exists := h.users[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "User not found")
		return
	}

	if user.Status == UserStatusSuspended {
		h.writeError(w, http.StatusForbidden, "forbidden", "Cannot impersonate a suspended user")
		return
	}

	// Generate a mock impersonation token
	// In a real implementation, this would generate a proper JWT
	expiresAt := time.Now().Add(1 * time.Hour)
	token := "impersonate:" + uuid.New().String()

	resp := ImpersonateResponse{
		Token:     token,
		ExpiresAt: expiresAt,
		UserID:    user.ID,
		Email:     user.Email,
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// writeJSON writes a JSON response
func (h *UserHandler) writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeError writes an error response
func (h *UserHandler) writeError(w http.ResponseWriter, status int, errCode string, message string) {
	h.writeJSON(w, status, ErrorResponse{
		Error:   errCode,
		Message: message,
	})
}
