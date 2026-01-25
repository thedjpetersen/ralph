package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// PipelineConfig holds the schema definition for the PipelineConfig entity.
type PipelineConfig struct {
	ent.Schema
}

// Fields of the PipelineConfig.
func (PipelineConfig) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").
			Unique().
			Immutable(),
		field.String("user_id").
			NotEmpty().
			Comment("ID of the user who owns this pipeline config"),
		field.String("name").
			NotEmpty().
			Comment("Human-readable name for the pipeline"),
		field.Text("description").
			Optional().
			Nillable().
			Comment("Description of the pipeline purpose"),
		field.Enum("pipeline_type").
			Values("receipt_processing", "email_parsing", "categorization", "export", "notification", "custom").
			Comment("Type of pipeline"),
		field.Enum("trigger_type").
			Values("manual", "on_receipt", "on_sync", "scheduled", "webhook").
			Default("manual").
			Comment("What triggers the pipeline execution"),
		field.String("trigger_config").
			Optional().
			Nillable().
			Comment("Configuration for the trigger (e.g., cron expression for scheduled)"),
		field.Bool("enabled").
			Default(true).
			Comment("Whether the pipeline is active"),
		field.Bool("is_default").
			Default(false).
			Comment("Whether this is a default pipeline for the user"),
		field.Int("current_version").
			Default(1).
			Comment("Current active version number"),
		field.JSON("settings", map[string]interface{}{}).
			Optional().
			Comment("Global settings for the pipeline"),
		field.JSON("input_schema", map[string]interface{}{}).
			Optional().
			Comment("Expected input schema/format"),
		field.JSON("output_schema", map[string]interface{}{}).
			Optional().
			Comment("Expected output schema/format"),
		field.Strings("tags").
			Optional().
			Comment("Tags for organizing pipelines"),
		field.Int("execution_count").
			Default(0).
			Comment("Total number of executions"),
		field.Int("success_count").
			Default(0).
			Comment("Number of successful executions"),
		field.Int("failure_count").
			Default(0).
			Comment("Number of failed executions"),
		field.Time("last_executed_at").
			Optional().
			Nillable().
			Comment("When the pipeline was last executed"),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

// Edges of the PipelineConfig.
func (PipelineConfig) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("rules", PipelineRule.Type).
			Comment("Rules associated with this pipeline"),
		edge.To("versions", PipelineVersion.Type).
			Comment("Version history for this pipeline"),
	}
}

// Indexes of the PipelineConfig.
func (PipelineConfig) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id"),
		index.Fields("pipeline_type"),
		index.Fields("trigger_type"),
		index.Fields("enabled"),
		index.Fields("is_default"),
		index.Fields("user_id", "pipeline_type"),
		index.Fields("user_id", "is_default"),
		index.Fields("created_at"),
	}
}
