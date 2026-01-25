package admin

import (
	"encoding/json"
	"net/http"
	"regexp"
	"sync"
	"time"

	"github.com/google/uuid"
)

// PatternType represents the type of pattern
type PatternType string

const (
	PatternTypeRegex    PatternType = "regex"
	PatternTypeGlob     PatternType = "glob"
	PatternTypeLiteral  PatternType = "literal"
	PatternTypeWildcard PatternType = "wildcard"
)

// PatternScope represents where the pattern can be applied
type PatternScope string

const (
	PatternScopeTransaction PatternScope = "transaction"
	PatternScopeCategory    PatternScope = "category"
	PatternScopeMerchant    PatternScope = "merchant"
	PatternScopeDescription PatternScope = "description"
	PatternScopeGlobal      PatternScope = "global"
)

// PatternStatus represents the status of a pattern
type PatternStatus string

const (
	PatternStatusActive   PatternStatus = "active"
	PatternStatusInactive PatternStatus = "inactive"
	PatternStatusDraft    PatternStatus = "draft"
)

// Pattern represents a store pattern for matching and categorization
type Pattern struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Description string            `json:"description,omitempty"`
	Pattern     string            `json:"pattern"`
	Type        PatternType       `json:"type"`
	Scope       PatternScope      `json:"scope"`
	Status      PatternStatus     `json:"status"`
	Priority    int               `json:"priority"`
	Category    string            `json:"category,omitempty"`
	Tags        []string          `json:"tags,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
	MatchCount  int               `json:"match_count"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
	CreatedBy   string            `json:"created_by,omitempty"`
	UpdatedBy   string            `json:"updated_by,omitempty"`
}

// ListPatternsResponse represents the response for listing patterns
type ListPatternsResponse struct {
	Patterns []*Pattern `json:"patterns"`
	Total    int        `json:"total"`
}

// CreatePatternRequest represents a request to create a pattern
type CreatePatternRequest struct {
	Name        string            `json:"name"`
	Description string            `json:"description,omitempty"`
	Pattern     string            `json:"pattern"`
	Type        PatternType       `json:"type"`
	Scope       PatternScope      `json:"scope,omitempty"`
	Priority    *int              `json:"priority,omitempty"`
	Category    string            `json:"category,omitempty"`
	Tags        []string          `json:"tags,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

// UpdatePatternRequest represents a request to update a pattern
type UpdatePatternRequest struct {
	Name        *string            `json:"name,omitempty"`
	Description *string            `json:"description,omitempty"`
	Pattern     *string            `json:"pattern,omitempty"`
	Type        *PatternType       `json:"type,omitempty"`
	Scope       *PatternScope      `json:"scope,omitempty"`
	Status      *PatternStatus     `json:"status,omitempty"`
	Priority    *int               `json:"priority,omitempty"`
	Category    *string            `json:"category,omitempty"`
	Tags        []string           `json:"tags,omitempty"`
	Metadata    map[string]string  `json:"metadata,omitempty"`
}

// TestPatternRequest represents a request to test a pattern
type TestPatternRequest struct {
	Pattern   string      `json:"pattern"`
	Type      PatternType `json:"type"`
	TestCases []string    `json:"test_cases"`
}

// TestPatternByIDRequest represents a request to test a stored pattern
type TestPatternByIDRequest struct {
	TestCases []string `json:"test_cases"`
}

// TestCaseResult represents the result of testing a single case
type TestCaseResult struct {
	Input    string   `json:"input"`
	Matched  bool     `json:"matched"`
	Captures []string `json:"captures,omitempty"`
	Error    string   `json:"error,omitempty"`
}

// TestPatternResponse represents the response for pattern testing
type TestPatternResponse struct {
	PatternID   string           `json:"pattern_id,omitempty"`
	Pattern     string           `json:"pattern"`
	Type        PatternType      `json:"type"`
	Valid       bool             `json:"valid"`
	Error       string           `json:"error,omitempty"`
	Results     []TestCaseResult `json:"results"`
	MatchCount  int              `json:"match_count"`
	TotalTests  int              `json:"total_tests"`
}

// PatternHandler handles HTTP requests for admin pattern management
type PatternHandler struct {
	mu       sync.RWMutex
	patterns map[string]*Pattern
}

// NewPatternHandler creates a new PatternHandler instance
func NewPatternHandler() *PatternHandler {
	return &PatternHandler{
		patterns: make(map[string]*Pattern),
	}
}

// HandleList handles GET /api/admin/patterns
func (h *PatternHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	// Get optional filters from query params
	status := r.URL.Query().Get("status")
	patternType := r.URL.Query().Get("type")
	scope := r.URL.Query().Get("scope")
	category := r.URL.Query().Get("category")

	h.mu.RLock()
	patterns := make([]*Pattern, 0)
	for _, pattern := range h.patterns {
		// Apply status filter if provided
		if status != "" && string(pattern.Status) != status {
			continue
		}
		// Apply type filter if provided
		if patternType != "" && string(pattern.Type) != patternType {
			continue
		}
		// Apply scope filter if provided
		if scope != "" && string(pattern.Scope) != scope {
			continue
		}
		// Apply category filter if provided
		if category != "" && pattern.Category != category {
			continue
		}
		patterns = append(patterns, pattern)
	}
	h.mu.RUnlock()

	resp := ListPatternsResponse{
		Patterns: patterns,
		Total:    len(patterns),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleGet handles GET /api/admin/patterns/{id}
func (h *PatternHandler) HandleGet(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	pattern, exists := h.patterns[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Pattern not found")
		return
	}

	h.writeJSON(w, http.StatusOK, pattern)
}

// HandleCreate handles POST /api/admin/patterns
func (h *PatternHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req CreatePatternRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	// Validation
	if req.Name == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "name is required")
		return
	}
	if req.Pattern == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "pattern is required")
		return
	}
	if req.Type == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "type is required")
		return
	}

	// Validate pattern type
	if !isValidPatternType(req.Type) {
		h.writeError(w, http.StatusBadRequest, "validation_error", "invalid pattern type")
		return
	}

	// Validate pattern syntax for regex type
	if req.Type == PatternTypeRegex {
		if _, err := regexp.Compile(req.Pattern); err != nil {
			h.writeError(w, http.StatusBadRequest, "validation_error", "invalid regex pattern: "+err.Error())
			return
		}
	}

	// Check for duplicate name
	h.mu.RLock()
	for _, p := range h.patterns {
		if p.Name == req.Name {
			h.mu.RUnlock()
			h.writeError(w, http.StatusConflict, "conflict", "Pattern with this name already exists")
			return
		}
	}
	h.mu.RUnlock()

	// Set defaults
	scope := PatternScopeGlobal
	if req.Scope != "" {
		scope = req.Scope
	}

	priority := 0
	if req.Priority != nil {
		priority = *req.Priority
	}

	now := time.Now()
	pattern := &Pattern{
		ID:          uuid.New().String(),
		Name:        req.Name,
		Description: req.Description,
		Pattern:     req.Pattern,
		Type:        req.Type,
		Scope:       scope,
		Status:      PatternStatusDraft,
		Priority:    priority,
		Category:    req.Category,
		Tags:        req.Tags,
		Metadata:    req.Metadata,
		MatchCount:  0,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	h.mu.Lock()
	h.patterns[pattern.ID] = pattern
	h.mu.Unlock()

	h.writeJSON(w, http.StatusCreated, pattern)
}

// HandleUpdate handles PUT/PATCH /api/admin/patterns/{id}
func (h *PatternHandler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PUT/PATCH methods are allowed")
		return
	}

	var req UpdatePatternRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	pattern, exists := h.patterns[id]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Pattern not found")
		return
	}

	// Check for duplicate name if changing name
	if req.Name != nil && *req.Name != pattern.Name {
		for _, p := range h.patterns {
			if p.Name == *req.Name {
				h.writeError(w, http.StatusConflict, "conflict", "Pattern with this name already exists")
				return
			}
		}
		pattern.Name = *req.Name
	}

	// Validate pattern syntax if updating pattern or type
	newPatternStr := pattern.Pattern
	newPatternType := pattern.Type
	if req.Pattern != nil {
		newPatternStr = *req.Pattern
	}
	if req.Type != nil {
		if !isValidPatternType(*req.Type) {
			h.writeError(w, http.StatusBadRequest, "validation_error", "invalid pattern type")
			return
		}
		newPatternType = *req.Type
	}

	if newPatternType == PatternTypeRegex && (req.Pattern != nil || req.Type != nil) {
		if _, err := regexp.Compile(newPatternStr); err != nil {
			h.writeError(w, http.StatusBadRequest, "validation_error", "invalid regex pattern: "+err.Error())
			return
		}
	}

	// Apply updates
	if req.Pattern != nil {
		pattern.Pattern = *req.Pattern
	}
	if req.Type != nil {
		pattern.Type = *req.Type
	}
	if req.Description != nil {
		pattern.Description = *req.Description
	}
	if req.Scope != nil {
		pattern.Scope = *req.Scope
	}
	if req.Status != nil {
		pattern.Status = *req.Status
	}
	if req.Priority != nil {
		pattern.Priority = *req.Priority
	}
	if req.Category != nil {
		pattern.Category = *req.Category
	}
	if req.Tags != nil {
		pattern.Tags = req.Tags
	}
	if req.Metadata != nil {
		pattern.Metadata = req.Metadata
	}

	pattern.UpdatedAt = time.Now()

	h.writeJSON(w, http.StatusOK, pattern)
}

// HandleDelete handles DELETE /api/admin/patterns/{id}
func (h *PatternHandler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	h.mu.Lock()
	_, exists := h.patterns[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Pattern not found")
		return
	}
	delete(h.patterns, id)
	h.mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

// HandleActivate handles POST /api/admin/patterns/{id}/activate
func (h *PatternHandler) HandleActivate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	h.mu.Lock()
	pattern, exists := h.patterns[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Pattern not found")
		return
	}

	if pattern.Status == PatternStatusActive {
		h.mu.Unlock()
		h.writeError(w, http.StatusConflict, "conflict", "Pattern is already active")
		return
	}

	pattern.Status = PatternStatusActive
	pattern.UpdatedAt = time.Now()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, pattern)
}

// HandleDeactivate handles POST /api/admin/patterns/{id}/deactivate
func (h *PatternHandler) HandleDeactivate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	h.mu.Lock()
	pattern, exists := h.patterns[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Pattern not found")
		return
	}

	if pattern.Status == PatternStatusInactive {
		h.mu.Unlock()
		h.writeError(w, http.StatusConflict, "conflict", "Pattern is already inactive")
		return
	}

	pattern.Status = PatternStatusInactive
	pattern.UpdatedAt = time.Now()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, pattern)
}

// HandleTest handles POST /api/admin/patterns/test (test a pattern without storing)
func (h *PatternHandler) HandleTest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req TestPatternRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	// Validation
	if req.Pattern == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "pattern is required")
		return
	}
	if req.Type == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "type is required")
		return
	}
	if len(req.TestCases) == 0 {
		h.writeError(w, http.StatusBadRequest, "validation_error", "test_cases is required")
		return
	}

	resp := h.testPattern(req.Pattern, req.Type, req.TestCases, "")
	h.writeJSON(w, http.StatusOK, resp)
}

// HandleTestByID handles POST /api/admin/patterns/{id}/test (test a stored pattern)
func (h *PatternHandler) HandleTestByID(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	h.mu.RLock()
	pattern, exists := h.patterns[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Pattern not found")
		return
	}

	var req TestPatternByIDRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if len(req.TestCases) == 0 {
		h.writeError(w, http.StatusBadRequest, "validation_error", "test_cases is required")
		return
	}

	resp := h.testPattern(pattern.Pattern, pattern.Type, req.TestCases, pattern.ID)
	h.writeJSON(w, http.StatusOK, resp)
}

// testPattern runs pattern matching against test cases
func (h *PatternHandler) testPattern(patternStr string, patternType PatternType, testCases []string, patternID string) TestPatternResponse {
	resp := TestPatternResponse{
		PatternID:  patternID,
		Pattern:    patternStr,
		Type:       patternType,
		Valid:      true,
		Results:    make([]TestCaseResult, 0, len(testCases)),
		TotalTests: len(testCases),
	}

	var compiledRegex *regexp.Regexp
	var compileErr error

	switch patternType {
	case PatternTypeRegex:
		compiledRegex, compileErr = regexp.Compile(patternStr)
		if compileErr != nil {
			resp.Valid = false
			resp.Error = "Invalid regex: " + compileErr.Error()
			return resp
		}
	case PatternTypeGlob:
		// Convert glob to regex for testing
		regexPattern := globToRegex(patternStr)
		compiledRegex, compileErr = regexp.Compile(regexPattern)
		if compileErr != nil {
			resp.Valid = false
			resp.Error = "Invalid glob pattern: " + compileErr.Error()
			return resp
		}
	case PatternTypeWildcard:
		// Simple wildcard: * matches anything
		regexPattern := "^" + regexp.QuoteMeta(patternStr) + "$"
		regexPattern = replaceAll(regexPattern, "\\*", ".*")
		regexPattern = replaceAll(regexPattern, "\\?", ".")
		compiledRegex, compileErr = regexp.Compile(regexPattern)
		if compileErr != nil {
			resp.Valid = false
			resp.Error = "Invalid wildcard pattern: " + compileErr.Error()
			return resp
		}
	case PatternTypeLiteral:
		// Literal matches are exact
		compiledRegex, _ = regexp.Compile("^" + regexp.QuoteMeta(patternStr) + "$")
	default:
		resp.Valid = false
		resp.Error = "Unknown pattern type: " + string(patternType)
		return resp
	}

	// Test each case
	for _, testCase := range testCases {
		result := TestCaseResult{
			Input: testCase,
		}

		if compiledRegex != nil {
			matches := compiledRegex.FindStringSubmatch(testCase)
			if len(matches) > 0 {
				result.Matched = true
				resp.MatchCount++
				// Include capture groups if any (skip the full match)
				if len(matches) > 1 {
					result.Captures = matches[1:]
				}
			}
		}

		resp.Results = append(resp.Results, result)
	}

	return resp
}

// Helper functions

func isValidPatternType(pt PatternType) bool {
	switch pt {
	case PatternTypeRegex, PatternTypeGlob, PatternTypeLiteral, PatternTypeWildcard:
		return true
	default:
		return false
	}
}

// globToRegex converts a glob pattern to a regex pattern
func globToRegex(glob string) string {
	result := "^"
	for i := 0; i < len(glob); i++ {
		c := glob[i]
		switch c {
		case '*':
			if i+1 < len(glob) && glob[i+1] == '*' {
				// ** matches everything including path separators
				result += ".*"
				i++
			} else {
				// * matches everything except path separators
				result += "[^/]*"
			}
		case '?':
			result += "[^/]"
		case '.', '+', '^', '$', '(', ')', '[', ']', '{', '}', '|', '\\':
			result += "\\" + string(c)
		default:
			result += string(c)
		}
	}
	result += "$"
	return result
}

// replaceAll is a simple string replacement helper (avoids importing strings package)
func replaceAll(s, old, new string) string {
	result := ""
	for i := 0; i < len(s); {
		if i+len(old) <= len(s) && s[i:i+len(old)] == old {
			result += new
			i += len(old)
		} else {
			result += string(s[i])
			i++
		}
	}
	return result
}

// writeJSON writes a JSON response
func (h *PatternHandler) writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeError writes an error response
func (h *PatternHandler) writeError(w http.ResponseWriter, status int, errCode string, message string) {
	h.writeJSON(w, status, ErrorResponse{
		Error:   errCode,
		Message: message,
	})
}
