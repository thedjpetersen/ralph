package rules

import (
	"context"
	"errors"
	"time"

	"clockzen-next/internal/domain/rules/model"
	"clockzen-next/internal/domain/rules/repository"

	"github.com/google/uuid"
)

// Service provides rule management operations
type Service struct {
	repo   repository.RuleRepository
	engine *Engine
}

// NewService creates a new rule service
func NewService(repo repository.RuleRepository) *Service {
	return &Service{
		repo:   repo,
		engine: NewEngine(repo),
	}
}

// CreateRule creates a new rule
func (s *Service) CreateRule(ctx context.Context, userID, name string, ruleType model.RuleType) (*model.Rule, error) {
	if userID == "" {
		return nil, errors.New("userID is required")
	}
	if name == "" {
		return nil, errors.New("name is required")
	}

	rule := model.NewRule(uuid.New().String(), userID, name, ruleType)

	if err := s.repo.Create(ctx, rule); err != nil {
		return nil, err
	}

	return rule, nil
}

// GetRule retrieves a rule by ID
func (s *Service) GetRule(ctx context.Context, id string) (*model.Rule, error) {
	return s.repo.Get(ctx, id)
}

// GetUserRules retrieves all rules for a user
func (s *Service) GetUserRules(ctx context.Context, userID string) ([]*model.Rule, error) {
	return s.repo.GetByUserID(ctx, userID)
}

// GetActiveRules retrieves active rules for a user
func (s *Service) GetActiveRules(ctx context.Context, userID string) ([]*model.Rule, error) {
	return s.repo.GetActiveRules(ctx, userID)
}

// UpdateRule updates an existing rule
func (s *Service) UpdateRule(ctx context.Context, rule *model.Rule) error {
	if rule == nil {
		return errors.New("rule is required")
	}
	if rule.ID == "" {
		return errors.New("rule ID is required")
	}
	rule.UpdatedAt = time.Now()
	return s.repo.Update(ctx, rule)
}

// DeleteRule deletes a rule
func (s *Service) DeleteRule(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

// EnableRule enables a rule
func (s *Service) EnableRule(ctx context.Context, id string) error {
	return s.repo.SetEnabled(ctx, id, true)
}

// DisableRule disables a rule
func (s *Service) DisableRule(ctx context.Context, id string) error {
	return s.repo.SetEnabled(ctx, id, false)
}

// SetPriority sets the priority of a rule
func (s *Service) SetPriority(ctx context.Context, id string, priority int) error {
	return s.repo.UpdatePriority(ctx, id, priority)
}

// AddCondition adds a condition to a rule
func (s *Service) AddCondition(ctx context.Context, id string, condition model.Condition) error {
	rule, err := s.repo.Get(ctx, id)
	if err != nil {
		return err
	}
	if rule == nil {
		return errors.New("rule not found")
	}

	condition.ID = uuid.New().String()
	rule.Conditions = append(rule.Conditions, condition)
	rule.UpdatedAt = time.Now()

	return s.repo.Update(ctx, rule)
}

// RemoveCondition removes a condition from a rule
func (s *Service) RemoveCondition(ctx context.Context, ruleID, conditionID string) error {
	rule, err := s.repo.Get(ctx, ruleID)
	if err != nil {
		return err
	}
	if rule == nil {
		return errors.New("rule not found")
	}

	newConditions := make([]model.Condition, 0, len(rule.Conditions))
	for _, c := range rule.Conditions {
		if c.ID != conditionID {
			newConditions = append(newConditions, c)
		}
	}
	rule.Conditions = newConditions
	rule.UpdatedAt = time.Now()

	return s.repo.Update(ctx, rule)
}

// AddAction adds an action to a rule
func (s *Service) AddAction(ctx context.Context, id string, action model.Action) error {
	rule, err := s.repo.Get(ctx, id)
	if err != nil {
		return err
	}
	if rule == nil {
		return errors.New("rule not found")
	}

	action.ID = uuid.New().String()
	action.Order = len(rule.Actions)
	rule.Actions = append(rule.Actions, action)
	rule.UpdatedAt = time.Now()

	return s.repo.Update(ctx, rule)
}

// RemoveAction removes an action from a rule
func (s *Service) RemoveAction(ctx context.Context, ruleID, actionID string) error {
	rule, err := s.repo.Get(ctx, ruleID)
	if err != nil {
		return err
	}
	if rule == nil {
		return errors.New("rule not found")
	}

	newActions := make([]model.Action, 0, len(rule.Actions))
	for _, a := range rule.Actions {
		if a.ID != actionID {
			newActions = append(newActions, a)
		}
	}
	rule.Actions = newActions
	rule.UpdatedAt = time.Now()

	return s.repo.Update(ctx, rule)
}

// ExecuteRules executes rules against the given data
func (s *Service) ExecuteRules(ctx context.Context, userID, itemID, itemType string, data map[string]interface{}) (*model.ExecutionResult, error) {
	execCtx := model.NewExecutionContext(uuid.New().String(), userID, itemID, itemType)
	execCtx.SetData(data)

	return s.engine.Execute(ctx, execCtx)
}

// ExecuteRulesWithOptions executes rules with custom options
func (s *Service) ExecuteRulesWithOptions(ctx context.Context, execCtx *model.ExecutionContext) (*model.ExecutionResult, error) {
	return s.engine.Execute(ctx, execCtx)
}

// TestRule tests a rule against sample data without persisting any changes
func (s *Service) TestRule(ctx context.Context, rule *model.Rule, data map[string]interface{}) (*model.ExecutionResult, error) {
	execCtx := model.NewExecutionContext(uuid.New().String(), rule.UserID, "test", "test")
	execCtx.SetData(data)
	execCtx.DryRun = true

	return s.engine.ExecuteRules(ctx, execCtx, []*model.Rule{rule})
}

// ValidateRule validates a rule configuration
func (s *Service) ValidateRule(rule *model.Rule) []string {
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
		if !condition.IsValid() {
			errors = append(errors, "condition "+string(rune('0'+i))+" is invalid")
		}
	}

	// Validate actions
	for i, action := range rule.Actions {
		if !action.IsValid() {
			errors = append(errors, "action "+string(rune('0'+i))+" is invalid")
		}
	}

	return errors
}

// GetEngine returns the rule execution engine
func (s *Service) GetEngine() *Engine {
	return s.engine
}
