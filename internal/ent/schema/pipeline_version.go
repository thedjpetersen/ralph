package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// PipelineVersion holds the schema definition for the PipelineVersion entity.
type PipelineVersion struct {
	ent.Schema
}

// Fields of the PipelineVersion.
func (PipelineVersion) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").
			Unique().
			Immutable(),
		field.String("config_id").
			NotEmpty().
			Comment("ID of the parent pipeline config"),
		field.Int("version_number").
			Comment("Version number (incrementing)"),
		field.String("name").
			Optional().
			Nillable().
			Comment("Optional name for this version (e.g., 'Initial Release', 'Bug Fix')"),
		field.Text("description").
			Optional().
			Nillable().
			Comment("Description of changes in this version"),
		field.Text("changelog").
			Optional().
			Nillable().
			Comment("Detailed changelog for this version"),
		field.JSON("snapshot", map[string]interface{}{}).
			Optional().
			Comment("Complete snapshot of the pipeline config at this version"),
		field.JSON("rules_snapshot", []map[string]interface{}{}).
			Optional().
			Comment("Snapshot of all rules at this version"),
		field.Enum("status").
			Values("draft", "active", "deprecated", "archived").
			Default("draft").
			Comment("Version status"),
		field.Bool("is_current").
			Default(false).
			Comment("Whether this is the currently active version"),
		field.String("created_by").
			Optional().
			Nillable().
			Comment("User ID who created this version"),
		field.String("approved_by").
			Optional().
			Nillable().
			Comment("User ID who approved this version"),
		field.Time("approved_at").
			Optional().
			Nillable().
			Comment("When the version was approved"),
		field.Time("activated_at").
			Optional().
			Nillable().
			Comment("When the version became active"),
		field.Time("deprecated_at").
			Optional().
			Nillable().
			Comment("When the version was deprecated"),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

// Edges of the PipelineVersion.
func (PipelineVersion) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("config", PipelineConfig.Type).
			Ref("versions").
			Field("config_id").
			Required().
			Unique().
			Comment("The pipeline config this version belongs to"),
	}
}

// Indexes of the PipelineVersion.
func (PipelineVersion) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("config_id"),
		index.Fields("version_number"),
		index.Fields("status"),
		index.Fields("is_current"),
		index.Fields("config_id", "version_number").
			Unique(),
		index.Fields("config_id", "is_current"),
		index.Fields("created_at"),
	}
}
