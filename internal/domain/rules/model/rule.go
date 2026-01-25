package model

import (
	"time"
)

// RuleType represents different types of rules
type RuleType string

const (
	// RuleTypeFilter filters items based on conditions
	RuleTypeFilter RuleType = "filter"
	// RuleTypeTransform transforms item data
	RuleTypeTransform RuleType = "transform"
	// RuleTypeCategorize automatically categorizes items
	RuleTypeCategorize RuleType = "categorize"
	// RuleTypeTag adds tags to items
	RuleTypeTag RuleType = "tag"
	// RuleTypeExtract extracts data from items
	RuleTypeExtract RuleType = "extract"
	// RuleTypeValidate validates items against criteria
	RuleTypeValidate RuleType = "validate"
	// RuleTypeRoute routes items to different destinations
	RuleTypeRoute RuleType = "route"
)

// MatchMode represents how conditions are combined
type MatchMode string

const (
	// MatchModeAll requires all conditions to match (AND)
	MatchModeAll MatchMode = "all"
	// MatchModeAny requires any condition to match (OR)
	MatchModeAny MatchMode = "any"
	// MatchModeNone requires no conditions to match (NOT)
	MatchModeNone MatchMode = "none"
)

// Rule represents a processing rule in the domain
type Rule struct {
	// ID is the unique identifier for the rule
	ID string

	// UserID is the ID of the user who owns this rule
	UserID string

	// ConfigID is the ID of the parent pipeline config (optional)
	ConfigID string

	// Name is a human-readable name for the rule
	Name string

	// Description explains what this rule does
	Description string

	// Type indicates the type of rule operation
	Type RuleType

	// Priority determines execution order (lower numbers run first)
	Priority int

	// Enabled indicates whether the rule is active
	Enabled bool

	// Conditions that must be met for the rule to apply
	Conditions []Condition

	// Actions to perform when conditions are met
	Actions []Action

	// Parameters for rule execution
	Parameters map[string]interface{}

	// TargetFields specifies which fields this rule operates on
	TargetFields []string

	// MatchMode determines how conditions are combined
	MatchMode MatchMode

	// StopOnMatch indicates whether to stop processing subsequent rules after this rule matches
	StopOnMatch bool

	// ExecutionCount is the number of times this rule has been executed
	ExecutionCount int

	// LastExecutedAt is when the rule was last executed
	LastExecutedAt *time.Time

	// CreatedAt is when the rule was created
	CreatedAt time.Time

	// UpdatedAt is when the rule was last updated
	UpdatedAt time.Time
}

// NewRule creates a new rule with defaults
func NewRule(id, userID, name string, ruleType RuleType) *Rule {
	now := time.Now()
	return &Rule{
		ID:         id,
		UserID:     userID,
		Name:       name,
		Type:       ruleType,
		Priority:   0,
		Enabled:    true,
		Conditions: []Condition{},
		Actions:    []Action{},
		Parameters: make(map[string]interface{}),
		MatchMode:  MatchModeAll,
		StopOnMatch: false,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
}

// IsValid checks if the rule has valid configuration
func (r *Rule) IsValid() bool {
	if r.ID == "" || r.UserID == "" || r.Name == "" {
		return false
	}
	if r.Type == "" {
		return false
	}
	return true
}

// ShouldExecute checks if the rule should be executed
func (r *Rule) ShouldExecute() bool {
	return r.Enabled && r.IsValid()
}

// MarkExecuted updates the execution count and timestamp
func (r *Rule) MarkExecuted() {
	r.ExecutionCount++
	now := time.Now()
	r.LastExecutedAt = &now
	r.UpdatedAt = now
}
