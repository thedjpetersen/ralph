package dto

import "time"

// =============================================================================
// Rule Type Constants
// =============================================================================

// RuleType represents different types of rules
type RuleType string

const (
	RuleTypeFilter     RuleType = "filter"
	RuleTypeTransform  RuleType = "transform"
	RuleTypeCategorize RuleType = "categorize"
	RuleTypeTag        RuleType = "tag"
	RuleTypeExtract    RuleType = "extract"
	RuleTypeValidate   RuleType = "validate"
	RuleTypeRoute      RuleType = "route"
)

// MatchMode represents how conditions are combined
type MatchMode string

const (
	MatchModeAll  MatchMode = "all"
	MatchModeAny  MatchMode = "any"
	MatchModeNone MatchMode = "none"
)

// Operator represents a comparison operator for conditions
type Operator string

const (
	OperatorEquals             Operator = "equals"
	OperatorNotEquals          Operator = "not_equals"
	OperatorContains           Operator = "contains"
	OperatorNotContains        Operator = "not_contains"
	OperatorStartsWith         Operator = "starts_with"
	OperatorEndsWith           Operator = "ends_with"
	OperatorGreaterThan        Operator = "greater_than"
	OperatorLessThan           Operator = "less_than"
	OperatorGreaterThanOrEqual Operator = "greater_than_or_equal"
	OperatorLessThanOrEqual    Operator = "less_than_or_equal"
	OperatorIn                 Operator = "in"
	OperatorNotIn              Operator = "not_in"
	OperatorMatches            Operator = "matches"
	OperatorExists             Operator = "exists"
	OperatorNotExists          Operator = "not_exists"
	OperatorIsEmpty            Operator = "is_empty"
	OperatorIsNotEmpty         Operator = "is_not_empty"
)

// ActionType represents different types of actions
type ActionType string

const (
	ActionTypeSetField         ActionType = "set_field"
	ActionTypeDeleteField      ActionType = "delete_field"
	ActionTypeRenameField      ActionType = "rename_field"
	ActionTypeCopyField        ActionType = "copy_field"
	ActionTypeAppend           ActionType = "append"
	ActionTypePrepend          ActionType = "prepend"
	ActionTypeReplace          ActionType = "replace"
	ActionTypeAddTag           ActionType = "add_tag"
	ActionTypeRemoveTag        ActionType = "remove_tag"
	ActionTypeSetCategory      ActionType = "set_category"
	ActionTypeSetStatus        ActionType = "set_status"
	ActionTypeTransform        ActionType = "transform"
	ActionTypeSendNotification ActionType = "send_notification"
	ActionTypeExecuteWebhook   ActionType = "execute_webhook"
	ActionTypeLog              ActionType = "log"
	ActionTypeSkip             ActionType = "skip"
	ActionTypeStop             ActionType = "stop"
)

// ExecutionStatus represents the status of a rule execution
type ExecutionStatus string

const (
	ExecutionStatusPending ExecutionStatus = "pending"
	ExecutionStatusRunning ExecutionStatus = "running"
	ExecutionStatusSuccess ExecutionStatus = "success"
	ExecutionStatusFailure ExecutionStatus = "failure"
	ExecutionStatusSkipped ExecutionStatus = "skipped"
	ExecutionStatusPartial ExecutionStatus = "partial"
)

// =============================================================================
// Condition DTOs
// =============================================================================

// ConditionRequest represents a condition in a request
type ConditionRequest struct {
	Field         string      `json:"field"`
	Operator      Operator    `json:"operator"`
	Value         interface{} `json:"value,omitempty"`
	CaseSensitive bool        `json:"case_sensitive,omitempty"`
	Negate        bool        `json:"negate,omitempty"`
}

// ConditionResponse represents a condition in a response
type ConditionResponse struct {
	ID            string      `json:"id"`
	Field         string      `json:"field"`
	Operator      Operator    `json:"operator"`
	Value         interface{} `json:"value,omitempty"`
	CaseSensitive bool        `json:"case_sensitive"`
	Negate        bool        `json:"negate"`
}

// =============================================================================
// Action DTOs
// =============================================================================

// ActionRequest represents an action in a request
type ActionRequest struct {
	Type        ActionType             `json:"type"`
	Field       string                 `json:"field,omitempty"`
	Value       interface{}            `json:"value,omitempty"`
	Parameters  map[string]interface{} `json:"parameters,omitempty"`
	Order       int                    `json:"order,omitempty"`
	StopOnError bool                   `json:"stop_on_error,omitempty"`
}

// ActionResponse represents an action in a response
type ActionResponse struct {
	ID          string                 `json:"id"`
	Type        ActionType             `json:"type"`
	Field       string                 `json:"field,omitempty"`
	Value       interface{}            `json:"value,omitempty"`
	Parameters  map[string]interface{} `json:"parameters,omitempty"`
	Order       int                    `json:"order"`
	StopOnError bool                   `json:"stop_on_error"`
}

// =============================================================================
// Rule DTOs
// =============================================================================

// CreateRuleRequest represents a request to create a new rule
type CreateRuleRequest struct {
	UserID       string              `json:"user_id"`
	ConfigID     string              `json:"config_id,omitempty"`
	Name         string              `json:"name"`
	Description  string              `json:"description,omitempty"`
	Type         RuleType            `json:"type"`
	Priority     int                 `json:"priority,omitempty"`
	Enabled      *bool               `json:"enabled,omitempty"`
	Conditions   []ConditionRequest  `json:"conditions,omitempty"`
	Actions      []ActionRequest     `json:"actions,omitempty"`
	Parameters   map[string]interface{} `json:"parameters,omitempty"`
	TargetFields []string            `json:"target_fields,omitempty"`
	MatchMode    MatchMode           `json:"match_mode,omitempty"`
	StopOnMatch  bool                `json:"stop_on_match,omitempty"`
}

// UpdateRuleRequest represents a request to update a rule
type UpdateRuleRequest struct {
	Name         *string                 `json:"name,omitempty"`
	Description  *string                 `json:"description,omitempty"`
	Type         *RuleType               `json:"type,omitempty"`
	Priority     *int                    `json:"priority,omitempty"`
	Enabled      *bool                   `json:"enabled,omitempty"`
	Conditions   []ConditionRequest      `json:"conditions,omitempty"`
	Actions      []ActionRequest         `json:"actions,omitempty"`
	Parameters   map[string]interface{}  `json:"parameters,omitempty"`
	TargetFields []string                `json:"target_fields,omitempty"`
	MatchMode    *MatchMode              `json:"match_mode,omitempty"`
	StopOnMatch  *bool                   `json:"stop_on_match,omitempty"`
}

// RuleResponse represents a rule in a response
type RuleResponse struct {
	ID             string              `json:"id"`
	UserID         string              `json:"user_id"`
	ConfigID       string              `json:"config_id,omitempty"`
	Name           string              `json:"name"`
	Description    string              `json:"description,omitempty"`
	Type           RuleType            `json:"type"`
	Priority       int                 `json:"priority"`
	Enabled        bool                `json:"enabled"`
	Conditions     []ConditionResponse `json:"conditions"`
	Actions        []ActionResponse    `json:"actions"`
	Parameters     map[string]interface{} `json:"parameters,omitempty"`
	TargetFields   []string            `json:"target_fields,omitempty"`
	MatchMode      MatchMode           `json:"match_mode"`
	StopOnMatch    bool                `json:"stop_on_match"`
	ExecutionCount int                 `json:"execution_count"`
	LastExecutedAt *time.Time          `json:"last_executed_at,omitempty"`
	CreatedAt      time.Time           `json:"created_at"`
	UpdatedAt      time.Time           `json:"updated_at"`
}

// RuleListResponse represents a list of rules response
type RuleListResponse struct {
	Rules []*RuleResponse `json:"rules"`
	Total int             `json:"total"`
}

// =============================================================================
// Condition Management DTOs
// =============================================================================

// AddConditionRequest represents a request to add a condition to a rule
type AddConditionRequest struct {
	Field         string      `json:"field"`
	Operator      Operator    `json:"operator"`
	Value         interface{} `json:"value,omitempty"`
	CaseSensitive bool        `json:"case_sensitive,omitempty"`
	Negate        bool        `json:"negate,omitempty"`
}

// UpdateConditionRequest represents a request to update a condition
type UpdateConditionRequest struct {
	Field         *string      `json:"field,omitempty"`
	Operator      *Operator    `json:"operator,omitempty"`
	Value         interface{}  `json:"value,omitempty"`
	CaseSensitive *bool        `json:"case_sensitive,omitempty"`
	Negate        *bool        `json:"negate,omitempty"`
}

// ConditionListResponse represents a list of conditions response
type ConditionListResponse struct {
	Conditions []ConditionResponse `json:"conditions"`
	Total      int                 `json:"total"`
}

// =============================================================================
// Action Management DTOs
// =============================================================================

// AddActionRequest represents a request to add an action to a rule
type AddActionRequest struct {
	Type        ActionType             `json:"type"`
	Field       string                 `json:"field,omitempty"`
	Value       interface{}            `json:"value,omitempty"`
	Parameters  map[string]interface{} `json:"parameters,omitempty"`
	Order       int                    `json:"order,omitempty"`
	StopOnError bool                   `json:"stop_on_error,omitempty"`
}

// UpdateActionRequest represents a request to update an action
type UpdateActionRequest struct {
	Type        *ActionType            `json:"type,omitempty"`
	Field       *string                `json:"field,omitempty"`
	Value       interface{}            `json:"value,omitempty"`
	Parameters  map[string]interface{} `json:"parameters,omitempty"`
	Order       *int                   `json:"order,omitempty"`
	StopOnError *bool                  `json:"stop_on_error,omitempty"`
}

// ActionListResponse represents a list of actions response
type ActionListResponse struct {
	Actions []ActionResponse `json:"actions"`
	Total   int              `json:"total"`
}

// =============================================================================
// Priority DTOs
// =============================================================================

// SetPriorityRequest represents a request to set a rule's priority
type SetPriorityRequest struct {
	Priority int `json:"priority"`
}

// =============================================================================
// Execution DTOs
// =============================================================================

// ExecuteRuleRequest represents a request to execute a rule
type ExecuteRuleRequest struct {
	ItemID   string                 `json:"item_id"`
	ItemType string                 `json:"item_type"`
	Data     map[string]interface{} `json:"data"`
	DryRun   bool                   `json:"dry_run,omitempty"`
}

// TestRuleRequest represents a request to test a rule
type TestRuleRequest struct {
	Data map[string]interface{} `json:"data"`
}

// BatchExecuteRequest represents a request to execute multiple rules
type BatchExecuteRequest struct {
	UserID           string                 `json:"user_id"`
	ItemID           string                 `json:"item_id"`
	ItemType         string                 `json:"item_type"`
	Data             map[string]interface{} `json:"data"`
	DryRun           bool                   `json:"dry_run,omitempty"`
	StopOnFirstMatch bool                   `json:"stop_on_first_match,omitempty"`
}

// ConditionResultResponse represents the result of evaluating a condition
type ConditionResultResponse struct {
	ConditionID   string      `json:"condition_id"`
	Field         string      `json:"field"`
	Operator      Operator    `json:"operator"`
	ExpectedValue interface{} `json:"expected_value,omitempty"`
	ActualValue   interface{} `json:"actual_value,omitempty"`
	Matched       bool        `json:"matched"`
	Error         string      `json:"error,omitempty"`
}

// ActionResultResponse represents the result of executing an action
type ActionResultResponse struct {
	ActionID       string                 `json:"action_id"`
	Success        bool                   `json:"success"`
	Error          string                 `json:"error,omitempty"`
	FieldsModified []string               `json:"fields_modified,omitempty"`
	PreviousValues map[string]interface{} `json:"previous_values,omitempty"`
	NewValues      map[string]interface{} `json:"new_values,omitempty"`
}

// RuleExecutionResultResponse represents the result of executing a single rule
type RuleExecutionResultResponse struct {
	RuleID           string                    `json:"rule_id"`
	RuleName         string                    `json:"rule_name"`
	Matched          bool                      `json:"matched"`
	Executed         bool                      `json:"executed"`
	Success          bool                      `json:"success"`
	Skipped          bool                      `json:"skipped"`
	SkipReason       string                    `json:"skip_reason,omitempty"`
	ConditionResults []ConditionResultResponse `json:"condition_results,omitempty"`
	ActionResults    []ActionResultResponse    `json:"action_results,omitempty"`
	Error            string                    `json:"error,omitempty"`
	DurationMs       int64                     `json:"duration_ms"`
}

// ExecutionResultResponse represents the result of executing rules
type ExecutionResultResponse struct {
	ID             string                        `json:"id"`
	ContextID      string                        `json:"context_id"`
	Status         ExecutionStatus               `json:"status"`
	RulesEvaluated int                           `json:"rules_evaluated"`
	RulesMatched   int                           `json:"rules_matched"`
	RulesExecuted  int                           `json:"rules_executed"`
	RulesFailed    int                           `json:"rules_failed"`
	RuleResults    []RuleExecutionResultResponse `json:"rule_results,omitempty"`
	OriginalData   map[string]interface{}        `json:"original_data,omitempty"`
	ModifiedData   map[string]interface{}        `json:"modified_data,omitempty"`
	StartedAt      time.Time                     `json:"started_at"`
	CompletedAt    time.Time                     `json:"completed_at"`
	DurationMs     int64                         `json:"duration_ms"`
	Error          string                        `json:"error,omitempty"`
}

// =============================================================================
// Validation DTOs
// =============================================================================

// ValidationErrorResponse represents validation errors for a rule
type ValidationErrorResponse struct {
	Valid  bool     `json:"valid"`
	Errors []string `json:"errors,omitempty"`
}
