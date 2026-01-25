package database

import (
	"context"
	"encoding/json"
	"time"

	"clockzen-next/internal/domain/rules/model"
	"clockzen-next/internal/domain/rules/repository"
	"clockzen-next/internal/ent"
	"clockzen-next/internal/ent/pipelinerule"

	"entgo.io/ent/dialect/sql"
)

// RuleRepository implements repository.RuleRepository using ent
type RuleRepository struct {
	client *ent.Client
}

// NewRuleRepository creates a new RuleRepository
func NewRuleRepository(client *ent.Client) *RuleRepository {
	return &RuleRepository{
		client: client,
	}
}

// Create creates a new rule
func (r *RuleRepository) Create(ctx context.Context, rule *model.Rule) error {
	// Convert conditions to map[string]interface{} for storage
	conditionsJSON, err := conditionsToMap(rule.Conditions)
	if err != nil {
		return err
	}

	// Convert actions to map[string]interface{} for storage
	actionsJSON, err := actionsToMap(rule.Actions)
	if err != nil {
		return err
	}

	builder := r.client.PipelineRule.Create().
		SetID(rule.ID).
		SetUserID(rule.UserID).
		SetName(rule.Name).
		SetRuleType(pipelinerule.RuleType(rule.Type)).
		SetPriority(rule.Priority).
		SetEnabled(rule.Enabled).
		SetConditions(conditionsJSON).
		SetActions(actionsJSON).
		SetParameters(rule.Parameters).
		SetMatchMode(pipelinerule.MatchMode(rule.MatchMode)).
		SetStopOnMatch(rule.StopOnMatch).
		SetExecutionCount(rule.ExecutionCount).
		SetCreatedAt(rule.CreatedAt).
		SetUpdatedAt(rule.UpdatedAt)

	if rule.ConfigID != "" {
		builder.SetConfigID(rule.ConfigID)
	}

	if rule.Description != "" {
		builder.SetDescription(rule.Description)
	}

	if len(rule.TargetFields) > 0 {
		builder.SetTargetFields(rule.TargetFields)
	}

	if rule.LastExecutedAt != nil {
		builder.SetLastExecutedAt(*rule.LastExecutedAt)
	}

	_, err = builder.Save(ctx)
	return err
}

// Get retrieves a rule by ID
func (r *RuleRepository) Get(ctx context.Context, id string) (*model.Rule, error) {
	entRule, err := r.client.PipelineRule.Get(ctx, id)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, nil
		}
		return nil, err
	}
	return entRuleToModel(entRule), nil
}

// GetByUserID retrieves all rules for a user
func (r *RuleRepository) GetByUserID(ctx context.Context, userID string) ([]*model.Rule, error) {
	entRules, err := r.client.PipelineRule.Query().
		Where(pipelinerule.UserIDEQ(userID)).
		Order(pipelinerule.ByPriority()).
		All(ctx)
	if err != nil {
		return nil, err
	}
	return entRulesToModels(entRules), nil
}

// GetByConfigID retrieves all rules for a pipeline config
func (r *RuleRepository) GetByConfigID(ctx context.Context, configID string) ([]*model.Rule, error) {
	entRules, err := r.client.PipelineRule.Query().
		Where(pipelinerule.ConfigIDEQ(configID)).
		Order(pipelinerule.ByPriority()).
		All(ctx)
	if err != nil {
		return nil, err
	}
	return entRulesToModels(entRules), nil
}

// List retrieves rules matching the filter
func (r *RuleRepository) List(ctx context.Context, filter *repository.RuleFilter) ([]*model.Rule, error) {
	query := r.client.PipelineRule.Query()

	// Apply filters
	if filter.UserID != "" {
		query = query.Where(pipelinerule.UserIDEQ(filter.UserID))
	}
	if filter.ConfigID != "" {
		query = query.Where(pipelinerule.ConfigIDEQ(filter.ConfigID))
	}
	if filter.Type != nil {
		query = query.Where(pipelinerule.RuleTypeEQ(pipelinerule.RuleType(*filter.Type)))
	}
	if filter.Enabled != nil {
		query = query.Where(pipelinerule.EnabledEQ(*filter.Enabled))
	}
	if filter.MatchMode != nil {
		query = query.Where(pipelinerule.MatchModeEQ(pipelinerule.MatchMode(*filter.MatchMode)))
	}
	if filter.MaxPriority != nil {
		query = query.Where(pipelinerule.PriorityLTE(*filter.MaxPriority))
	}

	// Apply ordering
	switch filter.OrderBy {
	case "priority":
		if filter.OrderDesc {
			query = query.Order(pipelinerule.ByPriority(sql.OrderDesc()))
		} else {
			query = query.Order(pipelinerule.ByPriority())
		}
	case "created_at":
		if filter.OrderDesc {
			query = query.Order(pipelinerule.ByCreatedAt(sql.OrderDesc()))
		} else {
			query = query.Order(pipelinerule.ByCreatedAt())
		}
	case "updated_at":
		if filter.OrderDesc {
			query = query.Order(pipelinerule.ByUpdatedAt(sql.OrderDesc()))
		} else {
			query = query.Order(pipelinerule.ByUpdatedAt())
		}
	case "name":
		if filter.OrderDesc {
			query = query.Order(pipelinerule.ByName(sql.OrderDesc()))
		} else {
			query = query.Order(pipelinerule.ByName())
		}
	default:
		query = query.Order(pipelinerule.ByPriority())
	}

	// Apply pagination
	if filter.Offset > 0 {
		query = query.Offset(filter.Offset)
	}
	if filter.Limit > 0 {
		query = query.Limit(filter.Limit)
	}

	entRules, err := query.All(ctx)
	if err != nil {
		return nil, err
	}
	return entRulesToModels(entRules), nil
}

// Count returns the count of rules matching the filter
func (r *RuleRepository) Count(ctx context.Context, filter *repository.RuleFilter) (int, error) {
	query := r.client.PipelineRule.Query()

	if filter.UserID != "" {
		query = query.Where(pipelinerule.UserIDEQ(filter.UserID))
	}
	if filter.ConfigID != "" {
		query = query.Where(pipelinerule.ConfigIDEQ(filter.ConfigID))
	}
	if filter.Type != nil {
		query = query.Where(pipelinerule.RuleTypeEQ(pipelinerule.RuleType(*filter.Type)))
	}
	if filter.Enabled != nil {
		query = query.Where(pipelinerule.EnabledEQ(*filter.Enabled))
	}

	return query.Count(ctx)
}

// Update updates an existing rule
func (r *RuleRepository) Update(ctx context.Context, rule *model.Rule) error {
	conditionsJSON, err := conditionsToMap(rule.Conditions)
	if err != nil {
		return err
	}

	actionsJSON, err := actionsToMap(rule.Actions)
	if err != nil {
		return err
	}

	builder := r.client.PipelineRule.UpdateOneID(rule.ID).
		SetName(rule.Name).
		SetRuleType(pipelinerule.RuleType(rule.Type)).
		SetPriority(rule.Priority).
		SetEnabled(rule.Enabled).
		SetConditions(conditionsJSON).
		SetActions(actionsJSON).
		SetParameters(rule.Parameters).
		SetMatchMode(pipelinerule.MatchMode(rule.MatchMode)).
		SetStopOnMatch(rule.StopOnMatch).
		SetExecutionCount(rule.ExecutionCount).
		SetUpdatedAt(time.Now())

	if rule.Description != "" {
		builder.SetDescription(rule.Description)
	} else {
		builder.ClearDescription()
	}

	if len(rule.TargetFields) > 0 {
		builder.SetTargetFields(rule.TargetFields)
	} else {
		builder.ClearTargetFields()
	}

	if rule.LastExecutedAt != nil {
		builder.SetLastExecutedAt(*rule.LastExecutedAt)
	} else {
		builder.ClearLastExecutedAt()
	}

	_, err = builder.Save(ctx)
	return err
}

// Delete deletes a rule by ID
func (r *RuleRepository) Delete(ctx context.Context, id string) error {
	return r.client.PipelineRule.DeleteOneID(id).Exec(ctx)
}

// DeleteByUserID deletes all rules for a user
func (r *RuleRepository) DeleteByUserID(ctx context.Context, userID string) error {
	_, err := r.client.PipelineRule.Delete().
		Where(pipelinerule.UserIDEQ(userID)).
		Exec(ctx)
	return err
}

// DeleteByConfigID deletes all rules for a pipeline config
func (r *RuleRepository) DeleteByConfigID(ctx context.Context, configID string) error {
	_, err := r.client.PipelineRule.Delete().
		Where(pipelinerule.ConfigIDEQ(configID)).
		Exec(ctx)
	return err
}

// UpdatePriority updates the priority of a rule
func (r *RuleRepository) UpdatePriority(ctx context.Context, id string, priority int) error {
	_, err := r.client.PipelineRule.UpdateOneID(id).
		SetPriority(priority).
		SetUpdatedAt(time.Now()).
		Save(ctx)
	return err
}

// SetEnabled sets the enabled status of a rule
func (r *RuleRepository) SetEnabled(ctx context.Context, id string, enabled bool) error {
	_, err := r.client.PipelineRule.UpdateOneID(id).
		SetEnabled(enabled).
		SetUpdatedAt(time.Now()).
		Save(ctx)
	return err
}

// IncrementExecutionCount increments the execution count
func (r *RuleRepository) IncrementExecutionCount(ctx context.Context, id string) error {
	_, err := r.client.PipelineRule.UpdateOneID(id).
		AddExecutionCount(1).
		SetLastExecutedAt(time.Now()).
		SetUpdatedAt(time.Now()).
		Save(ctx)
	return err
}

// GetActiveRules retrieves active rules for a user ordered by priority
func (r *RuleRepository) GetActiveRules(ctx context.Context, userID string) ([]*model.Rule, error) {
	entRules, err := r.client.PipelineRule.Query().
		Where(
			pipelinerule.UserIDEQ(userID),
			pipelinerule.EnabledEQ(true),
		).
		Order(pipelinerule.ByPriority()).
		All(ctx)
	if err != nil {
		return nil, err
	}
	return entRulesToModels(entRules), nil
}

// entRuleToModel converts an ent PipelineRule to a domain model Rule
func entRuleToModel(entRule *ent.PipelineRule) *model.Rule {
	rule := &model.Rule{
		ID:             entRule.ID,
		UserID:         entRule.UserID,
		ConfigID:       entRule.ConfigID,
		Name:           entRule.Name,
		Type:           model.RuleType(entRule.RuleType),
		Priority:       entRule.Priority,
		Enabled:        entRule.Enabled,
		Parameters:     entRule.Parameters,
		TargetFields:   entRule.TargetFields,
		MatchMode:      model.MatchMode(entRule.MatchMode),
		StopOnMatch:    entRule.StopOnMatch,
		ExecutionCount: entRule.ExecutionCount,
		LastExecutedAt: entRule.LastExecutedAt,
		CreatedAt:      entRule.CreatedAt,
		UpdatedAt:      entRule.UpdatedAt,
	}

	if entRule.Description != nil {
		rule.Description = *entRule.Description
	}

	// Convert conditions from map to model
	rule.Conditions = mapToConditions(entRule.Conditions)

	// Convert actions from map to model
	rule.Actions = mapToActions(entRule.Actions)

	return rule
}

// entRulesToModels converts a slice of ent PipelineRules to domain model Rules
func entRulesToModels(entRules []*ent.PipelineRule) []*model.Rule {
	rules := make([]*model.Rule, len(entRules))
	for i, entRule := range entRules {
		rules[i] = entRuleToModel(entRule)
	}
	return rules
}

// conditionsToMap converts a slice of Conditions to a map for storage
func conditionsToMap(conditions []model.Condition) (map[string]interface{}, error) {
	if len(conditions) == 0 {
		return nil, nil
	}
	data, err := json.Marshal(conditions)
	if err != nil {
		return nil, err
	}
	var result map[string]interface{}
	// Store as array under "items" key
	result = map[string]interface{}{
		"items": json.RawMessage(data),
	}
	return result, nil
}

// actionsToMap converts a slice of Actions to a map for storage
func actionsToMap(actions []model.Action) (map[string]interface{}, error) {
	if len(actions) == 0 {
		return nil, nil
	}
	data, err := json.Marshal(actions)
	if err != nil {
		return nil, err
	}
	result := map[string]interface{}{
		"items": json.RawMessage(data),
	}
	return result, nil
}

// mapToConditions converts a map from storage to a slice of Conditions
func mapToConditions(data map[string]interface{}) []model.Condition {
	if data == nil {
		return nil
	}
	items, ok := data["items"]
	if !ok {
		return nil
	}

	var conditions []model.Condition
	// Try to unmarshal the items
	itemsBytes, err := json.Marshal(items)
	if err != nil {
		return nil
	}
	if err := json.Unmarshal(itemsBytes, &conditions); err != nil {
		return nil
	}
	return conditions
}

// mapToActions converts a map from storage to a slice of Actions
func mapToActions(data map[string]interface{}) []model.Action {
	if data == nil {
		return nil
	}
	items, ok := data["items"]
	if !ok {
		return nil
	}

	var actions []model.Action
	itemsBytes, err := json.Marshal(items)
	if err != nil {
		return nil
	}
	if err := json.Unmarshal(itemsBytes, &actions); err != nil {
		return nil
	}
	return actions
}

// Ensure RuleRepository implements repository.RuleRepository
var _ repository.RuleRepository = (*RuleRepository)(nil)
