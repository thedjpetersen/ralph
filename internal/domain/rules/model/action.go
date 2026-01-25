package model

// ActionType represents different types of actions
type ActionType string

const (
	// ActionTypeSetField sets a field value
	ActionTypeSetField ActionType = "set_field"
	// ActionTypeDeleteField removes a field
	ActionTypeDeleteField ActionType = "delete_field"
	// ActionTypeRenameField renames a field
	ActionTypeRenameField ActionType = "rename_field"
	// ActionTypeCopyField copies a field value to another field
	ActionTypeCopyField ActionType = "copy_field"
	// ActionTypeAppend appends a value to a field
	ActionTypeAppend ActionType = "append"
	// ActionTypePrepend prepends a value to a field
	ActionTypePrepend ActionType = "prepend"
	// ActionTypeReplace performs string replacement in a field
	ActionTypeReplace ActionType = "replace"
	// ActionTypeAddTag adds a tag
	ActionTypeAddTag ActionType = "add_tag"
	// ActionTypeRemoveTag removes a tag
	ActionTypeRemoveTag ActionType = "remove_tag"
	// ActionTypeSetCategory sets the category
	ActionTypeSetCategory ActionType = "set_category"
	// ActionTypeSetStatus sets the status
	ActionTypeSetStatus ActionType = "set_status"
	// ActionTypeTransform applies a transformation function
	ActionTypeTransform ActionType = "transform"
	// ActionTypeSendNotification sends a notification
	ActionTypeSendNotification ActionType = "send_notification"
	// ActionTypeExecuteWebhook calls a webhook
	ActionTypeExecuteWebhook ActionType = "execute_webhook"
	// ActionTypeLog logs information
	ActionTypeLog ActionType = "log"
	// ActionTypeSkip skips further processing
	ActionTypeSkip ActionType = "skip"
	// ActionTypeStop stops rule execution chain
	ActionTypeStop ActionType = "stop"
)

// TransformFunction represents a transformation function type
type TransformFunction string

const (
	// TransformUppercase converts to uppercase
	TransformUppercase TransformFunction = "uppercase"
	// TransformLowercase converts to lowercase
	TransformLowercase TransformFunction = "lowercase"
	// TransformTrim trims whitespace
	TransformTrim TransformFunction = "trim"
	// TransformTruncate truncates to specified length
	TransformTruncate TransformFunction = "truncate"
	// TransformExtractNumber extracts numeric value
	TransformExtractNumber TransformFunction = "extract_number"
	// TransformExtractDate extracts date value
	TransformExtractDate TransformFunction = "extract_date"
	// TransformFormatDate formats a date
	TransformFormatDate TransformFunction = "format_date"
	// TransformRound rounds numeric value
	TransformRound TransformFunction = "round"
	// TransformCeil rounds up numeric value
	TransformCeil TransformFunction = "ceil"
	// TransformFloor rounds down numeric value
	TransformFloor TransformFunction = "floor"
)

// Action represents an action to perform when conditions are met
type Action struct {
	// ID is the unique identifier for the action
	ID string

	// Type is the type of action to perform
	Type ActionType

	// Field is the field to operate on (if applicable)
	Field string

	// Value is the value to use (if applicable)
	Value interface{}

	// Parameters are additional parameters for the action
	Parameters map[string]interface{}

	// Order determines the execution order of actions (lower numbers first)
	Order int

	// StopOnError indicates whether to stop if this action fails
	StopOnError bool
}

// NewAction creates a new action
func NewAction(actionType ActionType) *Action {
	return &Action{
		Type:        actionType,
		Parameters:  make(map[string]interface{}),
		StopOnError: false,
	}
}

// WithField sets the field and returns the action
func (a *Action) WithField(field string) *Action {
	a.Field = field
	return a
}

// WithValue sets the value and returns the action
func (a *Action) WithValue(value interface{}) *Action {
	a.Value = value
	return a
}

// WithParameter sets a parameter and returns the action
func (a *Action) WithParameter(key string, value interface{}) *Action {
	a.Parameters[key] = value
	return a
}

// WithOrder sets the order and returns the action
func (a *Action) WithOrder(order int) *Action {
	a.Order = order
	return a
}

// WithStopOnError sets stop on error and returns the action
func (a *Action) WithStopOnError(stop bool) *Action {
	a.StopOnError = stop
	return a
}

// IsValid checks if the action has valid configuration
func (a *Action) IsValid() bool {
	if a.Type == "" {
		return false
	}
	// Validate based on action type
	switch a.Type {
	case ActionTypeSetField, ActionTypeDeleteField, ActionTypeRenameField, ActionTypeCopyField,
		ActionTypeAppend, ActionTypePrepend, ActionTypeReplace:
		return a.Field != ""
	case ActionTypeAddTag, ActionTypeRemoveTag, ActionTypeSetCategory, ActionTypeSetStatus:
		return a.Value != nil
	case ActionTypeLog, ActionTypeSkip, ActionTypeStop:
		return true
	default:
		return true
	}
}

// ActionResult represents the result of executing an action
type ActionResult struct {
	// ActionID is the ID of the action that was executed
	ActionID string

	// Success indicates whether the action succeeded
	Success bool

	// Error contains any error message
	Error string

	// FieldsModified lists the fields that were modified
	FieldsModified []string

	// PreviousValues contains the previous values of modified fields
	PreviousValues map[string]interface{}

	// NewValues contains the new values of modified fields
	NewValues map[string]interface{}
}

// NewActionResult creates a new action result
func NewActionResult(actionID string, success bool) *ActionResult {
	return &ActionResult{
		ActionID:       actionID,
		Success:        success,
		FieldsModified: []string{},
		PreviousValues: make(map[string]interface{}),
		NewValues:      make(map[string]interface{}),
	}
}

// WithError sets the error and returns the result
func (r *ActionResult) WithError(err string) *ActionResult {
	r.Error = err
	r.Success = false
	return r
}

// AddModifiedField adds a modified field record
func (r *ActionResult) AddModifiedField(field string, previous, newValue interface{}) {
	r.FieldsModified = append(r.FieldsModified, field)
	r.PreviousValues[field] = previous
	r.NewValues[field] = newValue
}
