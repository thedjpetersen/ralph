package model

// Operator represents a comparison operator for conditions
type Operator string

const (
	// OperatorEquals checks for equality
	OperatorEquals Operator = "equals"
	// OperatorNotEquals checks for inequality
	OperatorNotEquals Operator = "not_equals"
	// OperatorContains checks if value contains substring
	OperatorContains Operator = "contains"
	// OperatorNotContains checks if value does not contain substring
	OperatorNotContains Operator = "not_contains"
	// OperatorStartsWith checks if value starts with prefix
	OperatorStartsWith Operator = "starts_with"
	// OperatorEndsWith checks if value ends with suffix
	OperatorEndsWith Operator = "ends_with"
	// OperatorGreaterThan compares numeric values
	OperatorGreaterThan Operator = "greater_than"
	// OperatorLessThan compares numeric values
	OperatorLessThan Operator = "less_than"
	// OperatorGreaterThanOrEqual compares numeric values
	OperatorGreaterThanOrEqual Operator = "greater_than_or_equal"
	// OperatorLessThanOrEqual compares numeric values
	OperatorLessThanOrEqual Operator = "less_than_or_equal"
	// OperatorIn checks if value is in a list
	OperatorIn Operator = "in"
	// OperatorNotIn checks if value is not in a list
	OperatorNotIn Operator = "not_in"
	// OperatorMatches checks if value matches a regex pattern
	OperatorMatches Operator = "matches"
	// OperatorExists checks if field exists
	OperatorExists Operator = "exists"
	// OperatorNotExists checks if field does not exist
	OperatorNotExists Operator = "not_exists"
	// OperatorIsEmpty checks if value is empty
	OperatorIsEmpty Operator = "is_empty"
	// OperatorIsNotEmpty checks if value is not empty
	OperatorIsNotEmpty Operator = "is_not_empty"
)

// Condition represents a single condition to evaluate
type Condition struct {
	// ID is the unique identifier for the condition
	ID string

	// Field is the name of the field to evaluate
	Field string

	// Operator is the comparison operator to use
	Operator Operator

	// Value is the value to compare against
	Value interface{}

	// CaseSensitive indicates whether string comparisons are case-sensitive
	CaseSensitive bool

	// Negate inverts the condition result
	Negate bool
}

// NewCondition creates a new condition
func NewCondition(field string, op Operator, value interface{}) *Condition {
	return &Condition{
		Field:         field,
		Operator:      op,
		Value:         value,
		CaseSensitive: false,
		Negate:        false,
	}
}

// WithCaseSensitive sets case sensitivity and returns the condition
func (c *Condition) WithCaseSensitive(caseSensitive bool) *Condition {
	c.CaseSensitive = caseSensitive
	return c
}

// WithNegate sets negation and returns the condition
func (c *Condition) WithNegate(negate bool) *Condition {
	c.Negate = negate
	return c
}

// IsValid checks if the condition has valid configuration
func (c *Condition) IsValid() bool {
	if c.Field == "" {
		return false
	}
	if c.Operator == "" {
		return false
	}
	// Some operators don't require a value
	switch c.Operator {
	case OperatorExists, OperatorNotExists, OperatorIsEmpty, OperatorIsNotEmpty:
		return true
	default:
		return c.Value != nil
	}
}

// ConditionGroup represents a group of conditions with a match mode
type ConditionGroup struct {
	// ID is the unique identifier for the condition group
	ID string

	// Conditions are the conditions in this group
	Conditions []Condition

	// Groups are nested condition groups
	Groups []ConditionGroup

	// MatchMode determines how conditions are combined
	MatchMode MatchMode
}

// NewConditionGroup creates a new condition group
func NewConditionGroup(matchMode MatchMode) *ConditionGroup {
	return &ConditionGroup{
		Conditions: []Condition{},
		Groups:     []ConditionGroup{},
		MatchMode:  matchMode,
	}
}

// AddCondition adds a condition to the group
func (g *ConditionGroup) AddCondition(condition Condition) {
	g.Conditions = append(g.Conditions, condition)
}

// AddGroup adds a nested condition group
func (g *ConditionGroup) AddGroup(group ConditionGroup) {
	g.Groups = append(g.Groups, group)
}

// IsEmpty checks if the group has no conditions
func (g *ConditionGroup) IsEmpty() bool {
	return len(g.Conditions) == 0 && len(g.Groups) == 0
}
