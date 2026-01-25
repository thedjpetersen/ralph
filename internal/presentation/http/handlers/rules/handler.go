package rules

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"

	"clockzen-next/internal/application/dto"
	"clockzen-next/internal/domain/rules/model"
)

// Rule represents a rule in the handler layer
type Rule struct {
	ID             string                 `json:"id"`
	UserID         string                 `json:"user_id"`
	ConfigID       string                 `json:"config_id,omitempty"`
	Name           string                 `json:"name"`
	Description    string                 `json:"description,omitempty"`
	Type           dto.RuleType           `json:"type"`
	Priority       int                    `json:"priority"`
	Enabled        bool                   `json:"enabled"`
	Conditions     []Condition            `json:"conditions"`
	Actions        []Action               `json:"actions"`
	Parameters     map[string]any         `json:"parameters,omitempty"`
	TargetFields   []string               `json:"target_fields,omitempty"`
	MatchMode      dto.MatchMode          `json:"match_mode"`
	StopOnMatch    bool                   `json:"stop_on_match"`
	ExecutionCount int                    `json:"execution_count"`
	LastExecutedAt *time.Time             `json:"last_executed_at,omitempty"`
	CreatedAt      time.Time              `json:"created_at"`
	UpdatedAt      time.Time              `json:"updated_at"`
}

// Condition represents a condition in the handler layer
type Condition struct {
	ID            string   `json:"id"`
	Field         string   `json:"field"`
	Operator      dto.Operator `json:"operator"`
	Value         any      `json:"value,omitempty"`
	CaseSensitive bool     `json:"case_sensitive"`
	Negate        bool     `json:"negate"`
}

// Action represents an action in the handler layer
type Action struct {
	ID          string         `json:"id"`
	Type        dto.ActionType `json:"type"`
	Field       string         `json:"field,omitempty"`
	Value       any            `json:"value,omitempty"`
	Parameters  map[string]any `json:"parameters,omitempty"`
	Order       int            `json:"order"`
	StopOnError bool           `json:"stop_on_error"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// RuleHandler handles HTTP requests for rules
type RuleHandler struct {
	mu    sync.RWMutex
	rules map[string]*Rule
}

// NewRuleHandler creates a new RuleHandler instance
func NewRuleHandler() *RuleHandler {
	return &RuleHandler{
		rules: make(map[string]*Rule),
	}
}

// ListRulesResponse represents a list of rules response
type ListRulesResponse struct {
	Rules []*Rule `json:"rules"`
	Total int     `json:"total"`
}

// HandleCreate handles POST /api/rules
func (h *RuleHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req dto.CreateRuleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if err := h.validateCreateRequest(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	now := time.Now()
	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	matchMode := dto.MatchModeAll
	if req.MatchMode != "" {
		matchMode = req.MatchMode
	}

	// Convert conditions
	conditions := make([]Condition, len(req.Conditions))
	for i, c := range req.Conditions {
		conditions[i] = Condition{
			ID:            uuid.New().String(),
			Field:         c.Field,
			Operator:      c.Operator,
			Value:         c.Value,
			CaseSensitive: c.CaseSensitive,
			Negate:        c.Negate,
		}
	}

	// Convert actions
	actions := make([]Action, len(req.Actions))
	for i, a := range req.Actions {
		actions[i] = Action{
			ID:          uuid.New().String(),
			Type:        a.Type,
			Field:       a.Field,
			Value:       a.Value,
			Parameters:  a.Parameters,
			Order:       a.Order,
			StopOnError: a.StopOnError,
		}
	}

	rule := &Rule{
		ID:           uuid.New().String(),
		UserID:       req.UserID,
		ConfigID:     req.ConfigID,
		Name:         req.Name,
		Description:  req.Description,
		Type:         req.Type,
		Priority:     req.Priority,
		Enabled:      enabled,
		Conditions:   conditions,
		Actions:      actions,
		Parameters:   req.Parameters,
		TargetFields: req.TargetFields,
		MatchMode:    matchMode,
		StopOnMatch:  req.StopOnMatch,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	h.mu.Lock()
	h.rules[rule.ID] = rule
	h.mu.Unlock()

	h.writeJSON(w, http.StatusCreated, rule)
}

// HandleGet handles GET /api/rules/{id}
func (h *RuleHandler) HandleGet(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	rule, exists := h.rules[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Rule not found")
		return
	}

	h.writeJSON(w, http.StatusOK, rule)
}

// HandleList handles GET /api/rules
func (h *RuleHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	// Get optional user_id filter from query params
	userID := r.URL.Query().Get("user_id")

	h.mu.RLock()
	rules := make([]*Rule, 0)
	for _, rule := range h.rules {
		if userID == "" || rule.UserID == userID {
			rules = append(rules, rule)
		}
	}
	h.mu.RUnlock()

	resp := ListRulesResponse{
		Rules: rules,
		Total: len(rules),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleUpdate handles PUT/PATCH /api/rules/{id}
func (h *RuleHandler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PUT/PATCH methods are allowed")
		return
	}

	var req dto.UpdateRuleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	rule, exists := h.rules[id]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Rule not found")
		return
	}

	// Apply updates
	if req.Name != nil {
		rule.Name = *req.Name
	}
	if req.Description != nil {
		rule.Description = *req.Description
	}
	if req.Type != nil {
		rule.Type = *req.Type
	}
	if req.Priority != nil {
		rule.Priority = *req.Priority
	}
	if req.Enabled != nil {
		rule.Enabled = *req.Enabled
	}
	if req.MatchMode != nil {
		rule.MatchMode = *req.MatchMode
	}
	if req.StopOnMatch != nil {
		rule.StopOnMatch = *req.StopOnMatch
	}
	if req.Parameters != nil {
		rule.Parameters = req.Parameters
	}
	if req.TargetFields != nil {
		rule.TargetFields = req.TargetFields
	}
	if req.Conditions != nil {
		conditions := make([]Condition, len(req.Conditions))
		for i, c := range req.Conditions {
			conditions[i] = Condition{
				ID:            uuid.New().String(),
				Field:         c.Field,
				Operator:      c.Operator,
				Value:         c.Value,
				CaseSensitive: c.CaseSensitive,
				Negate:        c.Negate,
			}
		}
		rule.Conditions = conditions
	}
	if req.Actions != nil {
		actions := make([]Action, len(req.Actions))
		for i, a := range req.Actions {
			actions[i] = Action{
				ID:          uuid.New().String(),
				Type:        a.Type,
				Field:       a.Field,
				Value:       a.Value,
				Parameters:  a.Parameters,
				Order:       a.Order,
				StopOnError: a.StopOnError,
			}
		}
		rule.Actions = actions
	}

	rule.UpdatedAt = time.Now()

	h.writeJSON(w, http.StatusOK, rule)
}

// HandleDelete handles DELETE /api/rules/{id}
func (h *RuleHandler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	h.mu.Lock()
	_, exists := h.rules[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Rule not found")
		return
	}
	delete(h.rules, id)
	h.mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

// HandleEnable handles POST /api/rules/{id}/enable
func (h *RuleHandler) HandleEnable(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	h.mu.Lock()
	rule, exists := h.rules[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Rule not found")
		return
	}
	rule.Enabled = true
	rule.UpdatedAt = time.Now()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, rule)
}

// HandleDisable handles POST /api/rules/{id}/disable
func (h *RuleHandler) HandleDisable(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	h.mu.Lock()
	rule, exists := h.rules[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Rule not found")
		return
	}
	rule.Enabled = false
	rule.UpdatedAt = time.Now()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, rule)
}

// HandleSetPriority handles PATCH /api/rules/{id}/priority
func (h *RuleHandler) HandleSetPriority(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PATCH method is allowed")
		return
	}

	var req dto.SetPriorityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.Lock()
	rule, exists := h.rules[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Rule not found")
		return
	}
	rule.Priority = req.Priority
	rule.UpdatedAt = time.Now()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, rule)
}

// HandleValidate handles GET /api/rules/{id}/validate
func (h *RuleHandler) HandleValidate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	rule, exists := h.rules[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Rule not found")
		return
	}

	errors := h.validateRule(rule)

	resp := dto.ValidationErrorResponse{
		Valid:  len(errors) == 0,
		Errors: errors,
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleAddCondition handles POST /api/rules/{id}/conditions
func (h *RuleHandler) HandleAddCondition(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req dto.AddConditionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if req.Field == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "field is required")
		return
	}
	if req.Operator == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "operator is required")
		return
	}

	h.mu.Lock()
	rule, exists := h.rules[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Rule not found")
		return
	}

	condition := Condition{
		ID:            uuid.New().String(),
		Field:         req.Field,
		Operator:      req.Operator,
		Value:         req.Value,
		CaseSensitive: req.CaseSensitive,
		Negate:        req.Negate,
	}
	rule.Conditions = append(rule.Conditions, condition)
	rule.UpdatedAt = time.Now()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusCreated, condition)
}

// HandleRemoveCondition handles DELETE /api/rules/{id}/conditions/{conditionId}
func (h *RuleHandler) HandleRemoveCondition(w http.ResponseWriter, r *http.Request, ruleID, conditionID string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	h.mu.Lock()
	rule, exists := h.rules[ruleID]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Rule not found")
		return
	}

	found := false
	newConditions := make([]Condition, 0, len(rule.Conditions))
	for _, c := range rule.Conditions {
		if c.ID != conditionID {
			newConditions = append(newConditions, c)
		} else {
			found = true
		}
	}

	if !found {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Condition not found")
		return
	}

	rule.Conditions = newConditions
	rule.UpdatedAt = time.Now()
	h.mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

// HandleListConditions handles GET /api/rules/{id}/conditions
func (h *RuleHandler) HandleListConditions(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	rule, exists := h.rules[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Rule not found")
		return
	}

	resp := dto.ConditionListResponse{
		Conditions: make([]dto.ConditionResponse, len(rule.Conditions)),
		Total:      len(rule.Conditions),
	}

	for i, c := range rule.Conditions {
		resp.Conditions[i] = dto.ConditionResponse{
			ID:            c.ID,
			Field:         c.Field,
			Operator:      c.Operator,
			Value:         c.Value,
			CaseSensitive: c.CaseSensitive,
			Negate:        c.Negate,
		}
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleUpdateCondition handles PATCH /api/rules/{id}/conditions/{conditionId}
func (h *RuleHandler) HandleUpdateCondition(w http.ResponseWriter, r *http.Request, ruleID, conditionID string) {
	if r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PATCH method is allowed")
		return
	}

	var req dto.UpdateConditionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	rule, exists := h.rules[ruleID]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Rule not found")
		return
	}

	var condition *Condition
	for i := range rule.Conditions {
		if rule.Conditions[i].ID == conditionID {
			condition = &rule.Conditions[i]
			break
		}
	}

	if condition == nil {
		h.writeError(w, http.StatusNotFound, "not_found", "Condition not found")
		return
	}

	if req.Field != nil {
		condition.Field = *req.Field
	}
	if req.Operator != nil {
		condition.Operator = *req.Operator
	}
	if req.Value != nil {
		condition.Value = req.Value
	}
	if req.CaseSensitive != nil {
		condition.CaseSensitive = *req.CaseSensitive
	}
	if req.Negate != nil {
		condition.Negate = *req.Negate
	}

	rule.UpdatedAt = time.Now()

	resp := dto.ConditionResponse{
		ID:            condition.ID,
		Field:         condition.Field,
		Operator:      condition.Operator,
		Value:         condition.Value,
		CaseSensitive: condition.CaseSensitive,
		Negate:        condition.Negate,
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleAddAction handles POST /api/rules/{id}/actions
func (h *RuleHandler) HandleAddAction(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req dto.AddActionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if req.Type == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "type is required")
		return
	}

	h.mu.Lock()
	rule, exists := h.rules[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Rule not found")
		return
	}

	action := Action{
		ID:          uuid.New().String(),
		Type:        req.Type,
		Field:       req.Field,
		Value:       req.Value,
		Parameters:  req.Parameters,
		Order:       len(rule.Actions),
		StopOnError: req.StopOnError,
	}
	if req.Order > 0 {
		action.Order = req.Order
	}

	rule.Actions = append(rule.Actions, action)
	rule.UpdatedAt = time.Now()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusCreated, action)
}

// HandleRemoveAction handles DELETE /api/rules/{id}/actions/{actionId}
func (h *RuleHandler) HandleRemoveAction(w http.ResponseWriter, r *http.Request, ruleID, actionID string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	h.mu.Lock()
	rule, exists := h.rules[ruleID]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Rule not found")
		return
	}

	found := false
	newActions := make([]Action, 0, len(rule.Actions))
	for _, a := range rule.Actions {
		if a.ID != actionID {
			newActions = append(newActions, a)
		} else {
			found = true
		}
	}

	if !found {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Action not found")
		return
	}

	rule.Actions = newActions
	rule.UpdatedAt = time.Now()
	h.mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

// HandleListActions handles GET /api/rules/{id}/actions
func (h *RuleHandler) HandleListActions(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	rule, exists := h.rules[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Rule not found")
		return
	}

	resp := dto.ActionListResponse{
		Actions: make([]dto.ActionResponse, len(rule.Actions)),
		Total:   len(rule.Actions),
	}

	for i, a := range rule.Actions {
		resp.Actions[i] = dto.ActionResponse{
			ID:          a.ID,
			Type:        a.Type,
			Field:       a.Field,
			Value:       a.Value,
			Parameters:  a.Parameters,
			Order:       a.Order,
			StopOnError: a.StopOnError,
		}
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleUpdateAction handles PATCH /api/rules/{id}/actions/{actionId}
func (h *RuleHandler) HandleUpdateAction(w http.ResponseWriter, r *http.Request, ruleID, actionID string) {
	if r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PATCH method is allowed")
		return
	}

	var req dto.UpdateActionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	rule, exists := h.rules[ruleID]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Rule not found")
		return
	}

	var action *Action
	for i := range rule.Actions {
		if rule.Actions[i].ID == actionID {
			action = &rule.Actions[i]
			break
		}
	}

	if action == nil {
		h.writeError(w, http.StatusNotFound, "not_found", "Action not found")
		return
	}

	if req.Type != nil {
		action.Type = *req.Type
	}
	if req.Field != nil {
		action.Field = *req.Field
	}
	if req.Value != nil {
		action.Value = req.Value
	}
	if req.Parameters != nil {
		action.Parameters = req.Parameters
	}
	if req.Order != nil {
		action.Order = *req.Order
	}
	if req.StopOnError != nil {
		action.StopOnError = *req.StopOnError
	}

	rule.UpdatedAt = time.Now()

	resp := dto.ActionResponse{
		ID:          action.ID,
		Type:        action.Type,
		Field:       action.Field,
		Value:       action.Value,
		Parameters:  action.Parameters,
		Order:       action.Order,
		StopOnError: action.StopOnError,
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleExecute handles POST /api/rules/{id}/execute
func (h *RuleHandler) HandleExecute(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req dto.ExecuteRuleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.RLock()
	rule, exists := h.rules[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Rule not found")
		return
	}

	// Simulate execution
	startTime := time.Now()
	executionID := uuid.New().String()

	// Create mock rule result
	ruleResult := dto.RuleExecutionResultResponse{
		RuleID:     rule.ID,
		RuleName:   rule.Name,
		Matched:    true,
		Executed:   !req.DryRun,
		Success:    true,
		DurationMs: time.Since(startTime).Milliseconds(),
	}

	// Update execution count if not dry run
	if !req.DryRun {
		h.mu.Lock()
		if r, ok := h.rules[id]; ok {
			r.ExecutionCount++
			now := time.Now()
			r.LastExecutedAt = &now
		}
		h.mu.Unlock()
	}

	resp := dto.ExecutionResultResponse{
		ID:             executionID,
		ContextID:      uuid.New().String(),
		Status:         dto.ExecutionStatusSuccess,
		RulesEvaluated: 1,
		RulesMatched:   1,
		RulesExecuted:  1,
		RulesFailed:    0,
		RuleResults:    []dto.RuleExecutionResultResponse{ruleResult},
		OriginalData:   req.Data,
		ModifiedData:   req.Data,
		StartedAt:      startTime,
		CompletedAt:    time.Now(),
		DurationMs:     time.Since(startTime).Milliseconds(),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleTest handles POST /api/rules/{id}/test
func (h *RuleHandler) HandleTest(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req dto.TestRuleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.RLock()
	rule, exists := h.rules[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Rule not found")
		return
	}

	// Simulate test execution (dry run)
	startTime := time.Now()
	executionID := uuid.New().String()

	// Evaluate conditions
	conditionResults := make([]dto.ConditionResultResponse, len(rule.Conditions))
	allMatched := true
	for i, c := range rule.Conditions {
		matched := true // Simplified - in real impl would evaluate against data
		if !matched {
			allMatched = false
		}
		conditionResults[i] = dto.ConditionResultResponse{
			ConditionID:   c.ID,
			Field:         c.Field,
			Operator:      c.Operator,
			ExpectedValue: c.Value,
			ActualValue:   req.Data[c.Field],
			Matched:       matched,
		}
	}

	ruleResult := dto.RuleExecutionResultResponse{
		RuleID:           rule.ID,
		RuleName:         rule.Name,
		Matched:          allMatched,
		Executed:         false, // Test mode, no actual execution
		Success:          true,
		ConditionResults: conditionResults,
		DurationMs:       time.Since(startTime).Milliseconds(),
	}

	resp := dto.ExecutionResultResponse{
		ID:             executionID,
		ContextID:      uuid.New().String(),
		Status:         dto.ExecutionStatusSuccess,
		RulesEvaluated: 1,
		RulesMatched:   1,
		RulesExecuted:  0, // No actual execution in test mode
		RulesFailed:    0,
		RuleResults:    []dto.RuleExecutionResultResponse{ruleResult},
		OriginalData:   req.Data,
		ModifiedData:   req.Data,
		StartedAt:      startTime,
		CompletedAt:    time.Now(),
		DurationMs:     time.Since(startTime).Milliseconds(),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleBatchExecute handles POST /api/rules/batch-execute
func (h *RuleHandler) HandleBatchExecute(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req dto.BatchExecuteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if req.UserID == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "user_id is required")
		return
	}

	startTime := time.Now()
	executionID := uuid.New().String()

	// Get rules for user
	h.mu.RLock()
	userRules := make([]*Rule, 0)
	for _, rule := range h.rules {
		if rule.UserID == req.UserID && rule.Enabled {
			userRules = append(userRules, rule)
		}
	}
	h.mu.RUnlock()

	// Execute rules
	ruleResults := make([]dto.RuleExecutionResultResponse, 0, len(userRules))
	rulesMatched := 0
	rulesExecuted := 0

	for _, rule := range userRules {
		ruleStartTime := time.Now()
		matched := true // Simplified

		if matched {
			rulesMatched++
			if !req.DryRun {
				rulesExecuted++
				h.mu.Lock()
				if r, ok := h.rules[rule.ID]; ok {
					r.ExecutionCount++
					now := time.Now()
					r.LastExecutedAt = &now
				}
				h.mu.Unlock()
			}
		}

		ruleResults = append(ruleResults, dto.RuleExecutionResultResponse{
			RuleID:     rule.ID,
			RuleName:   rule.Name,
			Matched:    matched,
			Executed:   !req.DryRun && matched,
			Success:    true,
			DurationMs: time.Since(ruleStartTime).Milliseconds(),
		})

		if req.StopOnFirstMatch && matched {
			break
		}
	}

	resp := dto.ExecutionResultResponse{
		ID:             executionID,
		ContextID:      uuid.New().String(),
		Status:         dto.ExecutionStatusSuccess,
		RulesEvaluated: len(userRules),
		RulesMatched:   rulesMatched,
		RulesExecuted:  rulesExecuted,
		RulesFailed:    0,
		RuleResults:    ruleResults,
		OriginalData:   req.Data,
		ModifiedData:   req.Data,
		StartedAt:      startTime,
		CompletedAt:    time.Now(),
		DurationMs:     time.Since(startTime).Milliseconds(),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// validateCreateRequest validates the create rule request
func (h *RuleHandler) validateCreateRequest(req *dto.CreateRuleRequest) error {
	if req.UserID == "" {
		return newValidationError("user_id is required")
	}
	if req.Name == "" {
		return newValidationError("name is required")
	}
	if !isValidRuleType(req.Type) {
		return newValidationError("type must be one of: filter, transform, categorize, tag, extract, validate, route")
	}
	return nil
}

// validateRule validates a rule
func (h *RuleHandler) validateRule(rule *Rule) []string {
	var errors []string

	if rule.ID == "" {
		errors = append(errors, "rule ID is required")
	}
	if rule.UserID == "" {
		errors = append(errors, "user ID is required")
	}
	if rule.Name == "" {
		errors = append(errors, "rule name is required")
	}
	if rule.Type == "" {
		errors = append(errors, "rule type is required")
	}

	// Validate conditions
	for i, condition := range rule.Conditions {
		if condition.Field == "" {
			errors = append(errors, "condition "+string(rune('0'+i))+" has no field")
		}
		if condition.Operator == "" {
			errors = append(errors, "condition "+string(rune('0'+i))+" has no operator")
		}
	}

	// Validate actions
	for i, action := range rule.Actions {
		if action.Type == "" {
			errors = append(errors, "action "+string(rune('0'+i))+" has no type")
		}
	}

	return errors
}

// isValidRuleType checks if the rule type is valid
func isValidRuleType(t dto.RuleType) bool {
	switch t {
	case dto.RuleTypeFilter, dto.RuleTypeTransform, dto.RuleTypeCategorize,
		dto.RuleTypeTag, dto.RuleTypeExtract, dto.RuleTypeValidate, dto.RuleTypeRoute:
		return true
	}
	return false
}

// writeJSON writes a JSON response
func (h *RuleHandler) writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeError writes an error response
func (h *RuleHandler) writeError(w http.ResponseWriter, status int, errCode string, message string) {
	h.writeJSON(w, status, ErrorResponse{
		Error:   errCode,
		Message: message,
	})
}

// validationError represents a validation error
type validationError struct {
	message string
}

func (e *validationError) Error() string {
	return e.message
}

func newValidationError(message string) error {
	return &validationError{message: message}
}

// Ensure RuleHandler is not using the model package inappropriately
var _ = model.RuleTypeFilter // Just to confirm the import is valid
