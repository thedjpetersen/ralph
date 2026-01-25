package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// PipelineRule holds the schema definition for the PipelineRule entity.
type PipelineRule struct {
	ent.Schema
}

// Fields of the PipelineRule.
func (PipelineRule) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").
			Unique().
			Immutable(),
		field.String("user_id").
			NotEmpty().
			Comment("ID of the user who owns this rule"),
		field.String("config_id").
			NotEmpty().
			Comment("ID of the parent pipeline config"),
		field.String("name").
			NotEmpty().
			Comment("Human-readable name for the rule"),
		field.Text("description").
			Optional().
			Nillable().
			Comment("Description of what this rule does"),
		field.Enum("rule_type").
			Values("filter", "transform", "categorize", "tag", "extract", "validate", "route").
			Comment("Type of rule operation"),
		field.Int("priority").
			Default(0).
			Comment("Execution priority (lower numbers run first)"),
		field.Bool("enabled").
			Default(true).
			Comment("Whether the rule is active"),
		field.JSON("conditions", map[string]interface{}{}).
			Optional().
			Comment("Conditions that must be met for the rule to apply"),
		field.JSON("actions", map[string]interface{}{}).
			Optional().
			Comment("Actions to perform when conditions are met"),
		field.JSON("parameters", map[string]interface{}{}).
			Optional().
			Comment("Additional parameters for rule execution"),
		field.Strings("target_fields").
			Optional().
			Comment("Fields this rule operates on"),
		field.Enum("match_mode").
			Values("all", "any", "none").
			Default("all").
			Comment("How conditions are combined (AND, OR, NOT)"),
		field.Bool("stop_on_match").
			Default(false).
			Comment("Whether to stop processing subsequent rules after this rule matches"),
		field.Int("execution_count").
			Default(0).
			Comment("Number of times this rule has been executed"),
		field.Time("last_executed_at").
			Optional().
			Nillable().
			Comment("When the rule was last executed"),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

// Edges of the PipelineRule.
func (PipelineRule) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("config", PipelineConfig.Type).
			Ref("rules").
			Field("config_id").
			Required().
			Unique().
			Comment("The pipeline config this rule belongs to"),
	}
}

// Indexes of the PipelineRule.
func (PipelineRule) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id"),
		index.Fields("config_id"),
		index.Fields("rule_type"),
		index.Fields("enabled"),
		index.Fields("priority"),
		index.Fields("config_id", "priority"),
		index.Fields("created_at"),
	}
}
