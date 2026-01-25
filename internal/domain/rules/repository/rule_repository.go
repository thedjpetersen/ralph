package repository

import (
	"context"

	"clockzen-next/internal/domain/rules/model"
)

// RuleFilter contains options for filtering rules
type RuleFilter struct {
	// UserID filters by user
	UserID string

	// ConfigID filters by pipeline config
	ConfigID string

	// Type filters by rule type
	Type *model.RuleType

	// Enabled filters by enabled status
	Enabled *bool

	// MatchMode filters by match mode
	MatchMode *model.MatchMode

	// Priority filters rules with priority <= this value
	MaxPriority *int

	// Tags filters by tags (any match)
	Tags []string

	// Limit limits the number of results
	Limit int

	// Offset skips the first N results
	Offset int

	// OrderBy specifies the field to order by
	OrderBy string

	// OrderDesc specifies descending order
	OrderDesc bool
}

// NewRuleFilter creates a new rule filter with defaults
func NewRuleFilter() *RuleFilter {
	return &RuleFilter{
		Limit:     100,
		Offset:    0,
		OrderBy:   "priority",
		OrderDesc: false,
	}
}

// WithUserID sets the user filter
func (f *RuleFilter) WithUserID(userID string) *RuleFilter {
	f.UserID = userID
	return f
}

// WithConfigID sets the config filter
func (f *RuleFilter) WithConfigID(configID string) *RuleFilter {
	f.ConfigID = configID
	return f
}

// WithType sets the type filter
func (f *RuleFilter) WithType(t model.RuleType) *RuleFilter {
	f.Type = &t
	return f
}

// WithEnabled sets the enabled filter
func (f *RuleFilter) WithEnabled(enabled bool) *RuleFilter {
	f.Enabled = &enabled
	return f
}

// WithLimit sets the limit
func (f *RuleFilter) WithLimit(limit int) *RuleFilter {
	f.Limit = limit
	return f
}

// RuleRepository defines the interface for rule persistence
type RuleRepository interface {
	// Create creates a new rule
	Create(ctx context.Context, rule *model.Rule) error

	// Get retrieves a rule by ID
	Get(ctx context.Context, id string) (*model.Rule, error)

	// GetByUserID retrieves all rules for a user
	GetByUserID(ctx context.Context, userID string) ([]*model.Rule, error)

	// GetByConfigID retrieves all rules for a pipeline config
	GetByConfigID(ctx context.Context, configID string) ([]*model.Rule, error)

	// List retrieves rules matching the filter
	List(ctx context.Context, filter *RuleFilter) ([]*model.Rule, error)

	// Count returns the count of rules matching the filter
	Count(ctx context.Context, filter *RuleFilter) (int, error)

	// Update updates an existing rule
	Update(ctx context.Context, rule *model.Rule) error

	// Delete deletes a rule by ID
	Delete(ctx context.Context, id string) error

	// DeleteByUserID deletes all rules for a user
	DeleteByUserID(ctx context.Context, userID string) error

	// DeleteByConfigID deletes all rules for a pipeline config
	DeleteByConfigID(ctx context.Context, configID string) error

	// UpdatePriority updates the priority of a rule
	UpdatePriority(ctx context.Context, id string, priority int) error

	// SetEnabled sets the enabled status of a rule
	SetEnabled(ctx context.Context, id string, enabled bool) error

	// IncrementExecutionCount increments the execution count
	IncrementExecutionCount(ctx context.Context, id string) error

	// GetActiveRules retrieves active rules for a user ordered by priority
	GetActiveRules(ctx context.Context, userID string) ([]*model.Rule, error)
}

// ExecutionLogRepository defines the interface for execution log persistence
type ExecutionLogRepository interface {
	// Create creates a new execution log entry
	Create(ctx context.Context, result *model.ExecutionResult) error

	// Get retrieves an execution log by ID
	Get(ctx context.Context, id string) (*model.ExecutionResult, error)

	// GetByRuleID retrieves execution logs for a rule
	GetByRuleID(ctx context.Context, ruleID string, limit int) ([]*model.ExecutionResult, error)

	// GetByUserID retrieves execution logs for a user
	GetByUserID(ctx context.Context, userID string, limit int) ([]*model.ExecutionResult, error)

	// GetByItemID retrieves execution logs for an item
	GetByItemID(ctx context.Context, itemID string) ([]*model.ExecutionResult, error)

	// Delete deletes an execution log by ID
	Delete(ctx context.Context, id string) error

	// DeleteOlderThan deletes execution logs older than the given duration
	DeleteOlderThan(ctx context.Context, days int) (int, error)
}
