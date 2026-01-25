package rules

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"clockzen-next/internal/domain/rules/model"
	"clockzen-next/internal/domain/rules/repository"

	"github.com/google/uuid"
)

// Engine executes rules against data
type Engine struct {
	repo repository.RuleRepository
}

// NewEngine creates a new rule execution engine
func NewEngine(repo repository.RuleRepository) *Engine {
	return &Engine{
		repo: repo,
	}
}

// Execute executes all active rules for a user against the given context
func (e *Engine) Execute(ctx context.Context, execCtx *model.ExecutionContext) (*model.ExecutionResult, error) {
	result := model.NewExecutionResult(uuid.New().String(), execCtx.ID)
	result.OriginalData = copyMap(execCtx.Data)

	// Get active rules for the user
	rules, err := e.repo.GetActiveRules(ctx, execCtx.UserID)
	if err != nil {
		result.Error = err.Error()
		result.Status = model.ExecutionStatusFailure
		return result, err
	}

	result.Status = model.ExecutionStatusRunning

	for _, rule := range rules {
		ruleResult := e.executeRule(execCtx, rule)
		result.AddRuleResult(ruleResult)

		// Increment execution count if rule was executed
		if ruleResult.Executed && !execCtx.DryRun {
			_ = e.repo.IncrementExecutionCount(ctx, rule.ID)
		}

		// Check if we should stop processing
		if ruleResult.Matched && rule.StopOnMatch {
			break
		}
		if execCtx.StopOnFirstMatch && ruleResult.Matched {
			break
		}
	}

	result.ModifiedData = copyMap(execCtx.Data)
	result.Complete()

	return result, nil
}

// ExecuteRules executes specific rules against the given context
func (e *Engine) ExecuteRules(ctx context.Context, execCtx *model.ExecutionContext, rules []*model.Rule) (*model.ExecutionResult, error) {
	result := model.NewExecutionResult(uuid.New().String(), execCtx.ID)
	result.OriginalData = copyMap(execCtx.Data)
	result.Status = model.ExecutionStatusRunning

	for _, rule := range rules {
		if !rule.ShouldExecute() {
			continue
		}

		ruleResult := e.executeRule(execCtx, rule)
		result.AddRuleResult(ruleResult)

		if ruleResult.Matched && rule.StopOnMatch {
			break
		}
		if execCtx.StopOnFirstMatch && ruleResult.Matched {
			break
		}
	}

	result.ModifiedData = copyMap(execCtx.Data)
	result.Complete()

	return result, nil
}

// executeRule executes a single rule against the context
func (e *Engine) executeRule(execCtx *model.ExecutionContext, rule *model.Rule) model.RuleExecutionResult {
	startTime := time.Now()
	result := *model.NewRuleExecutionResult(rule.ID, rule.Name)

	// Check if rule should execute
	if !rule.ShouldExecute() {
		result.Skipped = true
		result.SkipReason = "rule is disabled or invalid"
		result.Duration = time.Since(startTime)
		return result
	}

	// Evaluate conditions
	matched, conditionResults := e.evaluateConditions(execCtx, rule.Conditions, rule.MatchMode)
	result.ConditionResults = conditionResults
	result.Matched = matched

	if !matched {
		result.Duration = time.Since(startTime)
		return result
	}

	// Execute actions if not dry run
	result.Executed = true
	if !execCtx.DryRun {
		actionResults, err := e.executeActions(execCtx, rule.Actions)
		result.ActionResults = actionResults
		if err != nil {
			result.Error = err.Error()
			result.Success = false
		} else {
			result.Success = true
		}
	} else {
		result.Success = true
	}

	result.Duration = time.Since(startTime)
	return result
}

// evaluateConditions evaluates all conditions against the context
func (e *Engine) evaluateConditions(execCtx *model.ExecutionContext, conditions []model.Condition, matchMode model.MatchMode) (bool, []model.ConditionResult) {
	if len(conditions) == 0 {
		return true, nil
	}

	results := make([]model.ConditionResult, len(conditions))
	matchCount := 0

	for i, condition := range conditions {
		result := e.evaluateCondition(execCtx, &condition)
		results[i] = result
		if result.Matched {
			matchCount++
		}
	}

	var matched bool
	switch matchMode {
	case model.MatchModeAll:
		matched = matchCount == len(conditions)
	case model.MatchModeAny:
		matched = matchCount > 0
	case model.MatchModeNone:
		matched = matchCount == 0
	default:
		matched = matchCount == len(conditions)
	}

	return matched, results
}

// evaluateCondition evaluates a single condition
func (e *Engine) evaluateCondition(execCtx *model.ExecutionContext, condition *model.Condition) model.ConditionResult {
	result := *model.NewConditionResult(condition.ID, condition.Field, condition.Operator)
	result.ExpectedValue = condition.Value

	actualValue, exists := execCtx.GetField(condition.Field)
	result.ActualValue = actualValue

	// Handle existence checks
	switch condition.Operator {
	case model.OperatorExists:
		result.Matched = exists
		if condition.Negate {
			result.Matched = !result.Matched
		}
		return result
	case model.OperatorNotExists:
		result.Matched = !exists
		if condition.Negate {
			result.Matched = !result.Matched
		}
		return result
	}

	if !exists {
		result.Matched = false
		return result
	}

	// Perform comparison
	matched := e.compareValues(actualValue, condition.Value, condition.Operator, condition.CaseSensitive)
	if condition.Negate {
		matched = !matched
	}
	result.Matched = matched

	return result
}

// compareValues compares two values using the given operator
func (e *Engine) compareValues(actual, expected interface{}, op model.Operator, caseSensitive bool) bool {
	actualStr := toString(actual)
	expectedStr := toString(expected)

	if !caseSensitive {
		actualStr = strings.ToLower(actualStr)
		expectedStr = strings.ToLower(expectedStr)
	}

	switch op {
	case model.OperatorEquals:
		return actualStr == expectedStr

	case model.OperatorNotEquals:
		return actualStr != expectedStr

	case model.OperatorContains:
		return strings.Contains(actualStr, expectedStr)

	case model.OperatorNotContains:
		return !strings.Contains(actualStr, expectedStr)

	case model.OperatorStartsWith:
		return strings.HasPrefix(actualStr, expectedStr)

	case model.OperatorEndsWith:
		return strings.HasSuffix(actualStr, expectedStr)

	case model.OperatorGreaterThan:
		actualNum, expectedNum := toFloat(actual), toFloat(expected)
		return actualNum > expectedNum

	case model.OperatorLessThan:
		actualNum, expectedNum := toFloat(actual), toFloat(expected)
		return actualNum < expectedNum

	case model.OperatorGreaterThanOrEqual:
		actualNum, expectedNum := toFloat(actual), toFloat(expected)
		return actualNum >= expectedNum

	case model.OperatorLessThanOrEqual:
		actualNum, expectedNum := toFloat(actual), toFloat(expected)
		return actualNum <= expectedNum

	case model.OperatorIn:
		// Expected should be a slice or comma-separated string
		return isInList(actualStr, expected, caseSensitive)

	case model.OperatorNotIn:
		return !isInList(actualStr, expected, caseSensitive)

	case model.OperatorMatches:
		re, err := regexp.Compile(expectedStr)
		if err != nil {
			return false
		}
		return re.MatchString(actualStr)

	case model.OperatorIsEmpty:
		return actualStr == "" || actualStr == "0" || actualStr == "false"

	case model.OperatorIsNotEmpty:
		return actualStr != "" && actualStr != "0" && actualStr != "false"

	default:
		return false
	}
}

// executeActions executes all actions in order
func (e *Engine) executeActions(execCtx *model.ExecutionContext, actions []model.Action) ([]model.ActionResult, error) {
	results := make([]model.ActionResult, 0, len(actions))

	for _, action := range actions {
		result := e.executeAction(execCtx, &action)
		results = append(results, result)

		if !result.Success && action.StopOnError {
			return results, fmt.Errorf("action %s failed: %s", action.ID, result.Error)
		}
	}

	return results, nil
}

// executeAction executes a single action
func (e *Engine) executeAction(execCtx *model.ExecutionContext, action *model.Action) model.ActionResult {
	result := *model.NewActionResult(action.ID, true)

	switch action.Type {
	case model.ActionTypeSetField:
		oldValue, _ := execCtx.GetField(action.Field)
		execCtx.SetField(action.Field, action.Value)
		result.AddModifiedField(action.Field, oldValue, action.Value)

	case model.ActionTypeDeleteField:
		oldValue, _ := execCtx.GetField(action.Field)
		execCtx.DeleteField(action.Field)
		result.AddModifiedField(action.Field, oldValue, nil)

	case model.ActionTypeRenameField:
		if newName, ok := action.Value.(string); ok {
			oldValue, exists := execCtx.GetField(action.Field)
			if exists {
				execCtx.DeleteField(action.Field)
				execCtx.SetField(newName, oldValue)
				result.AddModifiedField(action.Field, oldValue, nil)
				result.AddModifiedField(newName, nil, oldValue)
			}
		}

	case model.ActionTypeCopyField:
		if targetField, ok := action.Value.(string); ok {
			value, exists := execCtx.GetField(action.Field)
			if exists {
				oldValue, _ := execCtx.GetField(targetField)
				execCtx.SetField(targetField, value)
				result.AddModifiedField(targetField, oldValue, value)
			}
		}

	case model.ActionTypeAppend:
		oldValue, _ := execCtx.GetField(action.Field)
		newValue := toString(oldValue) + toString(action.Value)
		execCtx.SetField(action.Field, newValue)
		result.AddModifiedField(action.Field, oldValue, newValue)

	case model.ActionTypePrepend:
		oldValue, _ := execCtx.GetField(action.Field)
		newValue := toString(action.Value) + toString(oldValue)
		execCtx.SetField(action.Field, newValue)
		result.AddModifiedField(action.Field, oldValue, newValue)

	case model.ActionTypeReplace:
		if params, ok := action.Parameters["find"].(string); ok {
			if replaceWith, ok := action.Parameters["replace"].(string); ok {
				oldValue, _ := execCtx.GetField(action.Field)
				newValue := strings.ReplaceAll(toString(oldValue), params, replaceWith)
				execCtx.SetField(action.Field, newValue)
				result.AddModifiedField(action.Field, oldValue, newValue)
			}
		}

	case model.ActionTypeAddTag:
		if tag, ok := action.Value.(string); ok {
			tags, _ := execCtx.GetField("tags")
			tagList := toStringSlice(tags)
			if !contains(tagList, tag) {
				tagList = append(tagList, tag)
				execCtx.SetField("tags", tagList)
				result.AddModifiedField("tags", tags, tagList)
			}
		}

	case model.ActionTypeRemoveTag:
		if tag, ok := action.Value.(string); ok {
			tags, _ := execCtx.GetField("tags")
			tagList := toStringSlice(tags)
			newList := removeFromSlice(tagList, tag)
			execCtx.SetField("tags", newList)
			result.AddModifiedField("tags", tags, newList)
		}

	case model.ActionTypeSetCategory:
		oldValue, _ := execCtx.GetField("category")
		execCtx.SetField("category", action.Value)
		result.AddModifiedField("category", oldValue, action.Value)

	case model.ActionTypeSetStatus:
		oldValue, _ := execCtx.GetField("status")
		execCtx.SetField("status", action.Value)
		result.AddModifiedField("status", oldValue, action.Value)

	case model.ActionTypeTransform:
		if transformFunc, ok := action.Parameters["function"].(string); ok {
			oldValue, _ := execCtx.GetField(action.Field)
			newValue := applyTransform(oldValue, model.TransformFunction(transformFunc), action.Parameters)
			execCtx.SetField(action.Field, newValue)
			result.AddModifiedField(action.Field, oldValue, newValue)
		}

	case model.ActionTypeLog:
		// Logging action - just mark as successful
		result.Success = true

	case model.ActionTypeSkip:
		// Skip action - mark the context as skipped
		execCtx.SetField("_skipped", true)

	case model.ActionTypeStop:
		// Stop action - mark the context to stop processing
		execCtx.SetField("_stopped", true)

	default:
		result.Error = fmt.Sprintf("unknown action type: %s", action.Type)
		result.Success = false
	}

	return result
}

// Helper functions

func copyMap(m map[string]interface{}) map[string]interface{} {
	if m == nil {
		return nil
	}
	result := make(map[string]interface{}, len(m))
	for k, v := range m {
		result[k] = v
	}
	return result
}

func toString(v interface{}) string {
	if v == nil {
		return ""
	}
	switch val := v.(type) {
	case string:
		return val
	case int:
		return strconv.Itoa(val)
	case int64:
		return strconv.FormatInt(val, 10)
	case float64:
		return strconv.FormatFloat(val, 'f', -1, 64)
	case bool:
		return strconv.FormatBool(val)
	default:
		return fmt.Sprintf("%v", v)
	}
}

func toFloat(v interface{}) float64 {
	if v == nil {
		return 0
	}
	switch val := v.(type) {
	case float64:
		return val
	case float32:
		return float64(val)
	case int:
		return float64(val)
	case int64:
		return float64(val)
	case string:
		f, _ := strconv.ParseFloat(val, 64)
		return f
	default:
		return 0
	}
}

func toStringSlice(v interface{}) []string {
	if v == nil {
		return nil
	}
	switch val := v.(type) {
	case []string:
		return val
	case []interface{}:
		result := make([]string, len(val))
		for i, item := range val {
			result[i] = toString(item)
		}
		return result
	default:
		return nil
	}
}

func isInList(value string, list interface{}, caseSensitive bool) bool {
	switch l := list.(type) {
	case []string:
		for _, item := range l {
			if !caseSensitive {
				if strings.EqualFold(value, item) {
					return true
				}
			} else if value == item {
				return true
			}
		}
	case []interface{}:
		for _, item := range l {
			itemStr := toString(item)
			if !caseSensitive {
				if strings.EqualFold(value, itemStr) {
					return true
				}
			} else if value == itemStr {
				return true
			}
		}
	case string:
		// Comma-separated list
		items := strings.Split(l, ",")
		for _, item := range items {
			item = strings.TrimSpace(item)
			if !caseSensitive {
				if strings.EqualFold(value, item) {
					return true
				}
			} else if value == item {
				return true
			}
		}
	}
	return false
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func removeFromSlice(slice []string, item string) []string {
	result := make([]string, 0, len(slice))
	for _, s := range slice {
		if s != item {
			result = append(result, s)
		}
	}
	return result
}

func applyTransform(value interface{}, fn model.TransformFunction, params map[string]interface{}) interface{} {
	strValue := toString(value)

	switch fn {
	case model.TransformUppercase:
		return strings.ToUpper(strValue)

	case model.TransformLowercase:
		return strings.ToLower(strValue)

	case model.TransformTrim:
		return strings.TrimSpace(strValue)

	case model.TransformTruncate:
		if length, ok := params["length"].(float64); ok {
			maxLen := int(length)
			if len(strValue) > maxLen {
				return strValue[:maxLen]
			}
		}
		return strValue

	case model.TransformExtractNumber:
		re := regexp.MustCompile(`[\d.]+`)
		match := re.FindString(strValue)
		if match != "" {
			f, _ := strconv.ParseFloat(match, 64)
			return f
		}
		return 0.0

	case model.TransformRound:
		f := toFloat(value)
		return float64(int(f + 0.5))

	case model.TransformCeil:
		f := toFloat(value)
		return float64(int(f + 0.9999999999))

	case model.TransformFloor:
		f := toFloat(value)
		return float64(int(f))

	default:
		return value
	}
}
