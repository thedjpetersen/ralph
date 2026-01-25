package model

import (
	"time"
)

// ExecutionStatus represents the status of a rule execution
type ExecutionStatus string

const (
	// ExecutionStatusPending indicates execution is pending
	ExecutionStatusPending ExecutionStatus = "pending"
	// ExecutionStatusRunning indicates execution is in progress
	ExecutionStatusRunning ExecutionStatus = "running"
	// ExecutionStatusSuccess indicates execution completed successfully
	ExecutionStatusSuccess ExecutionStatus = "success"
	// ExecutionStatusFailure indicates execution failed
	ExecutionStatusFailure ExecutionStatus = "failure"
	// ExecutionStatusSkipped indicates execution was skipped
	ExecutionStatusSkipped ExecutionStatus = "skipped"
	// ExecutionStatusPartial indicates partial execution
	ExecutionStatusPartial ExecutionStatus = "partial"
)

// ExecutionContext provides context for rule execution
type ExecutionContext struct {
	// ID is the unique identifier for this execution
	ID string

	// UserID is the ID of the user running the rules
	UserID string

	// ItemID is the ID of the item being processed
	ItemID string

	// ItemType is the type of item being processed
	ItemType string

	// Data is the item data being processed
	Data map[string]interface{}

	// Metadata contains execution metadata
	Metadata map[string]interface{}

	// DryRun indicates whether this is a dry run (no actual changes)
	DryRun bool

	// StopOnFirstMatch indicates whether to stop after first matching rule
	StopOnFirstMatch bool

	// StartedAt is when execution started
	StartedAt time.Time

	// CompletedAt is when execution completed
	CompletedAt *time.Time
}

// NewExecutionContext creates a new execution context
func NewExecutionContext(id, userID, itemID, itemType string) *ExecutionContext {
	return &ExecutionContext{
		ID:               id,
		UserID:           userID,
		ItemID:           itemID,
		ItemType:         itemType,
		Data:             make(map[string]interface{}),
		Metadata:         make(map[string]interface{}),
		DryRun:           false,
		StopOnFirstMatch: false,
		StartedAt:        time.Now(),
	}
}

// SetData sets the item data
func (c *ExecutionContext) SetData(data map[string]interface{}) {
	c.Data = data
}

// GetField gets a field value from the data
func (c *ExecutionContext) GetField(field string) (interface{}, bool) {
	value, exists := c.Data[field]
	return value, exists
}

// SetField sets a field value in the data
func (c *ExecutionContext) SetField(field string, value interface{}) {
	c.Data[field] = value
}

// DeleteField removes a field from the data
func (c *ExecutionContext) DeleteField(field string) {
	delete(c.Data, field)
}

// HasField checks if a field exists in the data
func (c *ExecutionContext) HasField(field string) bool {
	_, exists := c.Data[field]
	return exists
}

// Clone creates a copy of the execution context
func (c *ExecutionContext) Clone() *ExecutionContext {
	dataCopy := make(map[string]interface{})
	for k, v := range c.Data {
		dataCopy[k] = v
	}
	metaCopy := make(map[string]interface{})
	for k, v := range c.Metadata {
		metaCopy[k] = v
	}
	return &ExecutionContext{
		ID:               c.ID,
		UserID:           c.UserID,
		ItemID:           c.ItemID,
		ItemType:         c.ItemType,
		Data:             dataCopy,
		Metadata:         metaCopy,
		DryRun:           c.DryRun,
		StopOnFirstMatch: c.StopOnFirstMatch,
		StartedAt:        c.StartedAt,
		CompletedAt:      c.CompletedAt,
	}
}

// ExecutionResult represents the result of executing rules
type ExecutionResult struct {
	// ID is the unique identifier for this execution
	ID string

	// ContextID is the ID of the execution context
	ContextID string

	// Status is the overall execution status
	Status ExecutionStatus

	// RulesEvaluated is the number of rules evaluated
	RulesEvaluated int

	// RulesMatched is the number of rules that matched
	RulesMatched int

	// RulesExecuted is the number of rules executed
	RulesExecuted int

	// RulesFailed is the number of rules that failed
	RulesFailed int

	// RuleResults contains results for each rule
	RuleResults []RuleExecutionResult

	// OriginalData contains the original data before modifications
	OriginalData map[string]interface{}

	// ModifiedData contains the data after modifications
	ModifiedData map[string]interface{}

	// StartedAt is when execution started
	StartedAt time.Time

	// CompletedAt is when execution completed
	CompletedAt time.Time

	// Duration is how long execution took
	Duration time.Duration

	// Error contains any top-level error
	Error string
}

// NewExecutionResult creates a new execution result
func NewExecutionResult(id, contextID string) *ExecutionResult {
	return &ExecutionResult{
		ID:           id,
		ContextID:    contextID,
		Status:       ExecutionStatusPending,
		RuleResults:  []RuleExecutionResult{},
		OriginalData: make(map[string]interface{}),
		ModifiedData: make(map[string]interface{}),
		StartedAt:    time.Now(),
	}
}

// AddRuleResult adds a rule execution result
func (r *ExecutionResult) AddRuleResult(result RuleExecutionResult) {
	r.RuleResults = append(r.RuleResults, result)
	r.RulesEvaluated++
	if result.Matched {
		r.RulesMatched++
	}
	if result.Executed {
		r.RulesExecuted++
	}
	if !result.Success {
		r.RulesFailed++
	}
}

// Complete marks the execution as complete
func (r *ExecutionResult) Complete() {
	r.CompletedAt = time.Now()
	r.Duration = r.CompletedAt.Sub(r.StartedAt)
	if r.RulesFailed > 0 {
		if r.RulesExecuted > r.RulesFailed {
			r.Status = ExecutionStatusPartial
		} else {
			r.Status = ExecutionStatusFailure
		}
	} else if r.RulesExecuted > 0 {
		r.Status = ExecutionStatusSuccess
	} else {
		r.Status = ExecutionStatusSkipped
	}
}

// RuleExecutionResult represents the result of executing a single rule
type RuleExecutionResult struct {
	// RuleID is the ID of the rule
	RuleID string

	// RuleName is the name of the rule
	RuleName string

	// Matched indicates whether conditions matched
	Matched bool

	// Executed indicates whether actions were executed
	Executed bool

	// Success indicates whether execution was successful
	Success bool

	// Skipped indicates whether the rule was skipped
	Skipped bool

	// SkipReason is the reason for skipping
	SkipReason string

	// ConditionResults contains results for each condition
	ConditionResults []ConditionResult

	// ActionResults contains results for each action
	ActionResults []ActionResult

	// Error contains any error message
	Error string

	// Duration is how long this rule took
	Duration time.Duration
}

// NewRuleExecutionResult creates a new rule execution result
func NewRuleExecutionResult(ruleID, ruleName string) *RuleExecutionResult {
	return &RuleExecutionResult{
		RuleID:           ruleID,
		RuleName:         ruleName,
		ConditionResults: []ConditionResult{},
		ActionResults:    []ActionResult{},
	}
}

// ConditionResult represents the result of evaluating a condition
type ConditionResult struct {
	// ConditionID is the ID of the condition
	ConditionID string

	// Field is the field that was evaluated
	Field string

	// Operator is the operator used
	Operator Operator

	// ExpectedValue is the expected value
	ExpectedValue interface{}

	// ActualValue is the actual value found
	ActualValue interface{}

	// Matched indicates whether the condition matched
	Matched bool

	// Error contains any error message
	Error string
}

// NewConditionResult creates a new condition result
func NewConditionResult(conditionID, field string, op Operator) *ConditionResult {
	return &ConditionResult{
		ConditionID: conditionID,
		Field:       field,
		Operator:    op,
	}
}
