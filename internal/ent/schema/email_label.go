package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// EmailLabel holds the schema definition for the EmailLabel entity.
type EmailLabel struct {
	ent.Schema
}

// Fields of the EmailLabel.
func (EmailLabel) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").
			Unique().
			Immutable(),
		field.String("connection_id").
			NotEmpty().
			Comment("ID of the parent EmailConnection"),
		field.String("provider_label_id").
			NotEmpty().
			Comment("Label/folder ID from the email provider"),
		field.String("name").
			NotEmpty().
			Comment("Label/folder name"),
		field.String("display_name").
			Optional().
			Comment("User-friendly display name"),
		field.Enum("label_type").
			Values("system", "user", "category").
			Default("user").
			Comment("Type of label"),
		field.String("parent_label_id").
			Optional().
			Nillable().
			Comment("Parent label ID if nested"),
		field.Bool("sync_enabled").
			Default(true).
			Comment("Whether syncing is enabled for this label"),
		field.Int64("message_count").
			Default(0).
			Comment("Number of messages with this label"),
		field.Int64("unread_count").
			Default(0).
			Comment("Number of unread messages with this label"),
		field.String("color").
			Optional().
			Nillable().
			Comment("Label color if applicable"),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
		field.Time("last_scanned_at").
			Optional().
			Nillable().
			Comment("Last time label was scanned for changes"),
	}
}

// Edges of the EmailLabel.
func (EmailLabel) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("connection", EmailConnection.Type).
			Ref("labels").
			Field("connection_id").
			Required().
			Unique().
			Comment("The connection this label belongs to"),
	}
}

// Indexes of the EmailLabel.
func (EmailLabel) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("connection_id"),
		index.Fields("provider_label_id"),
		index.Fields("connection_id", "provider_label_id").
			Unique(),
		index.Fields("sync_enabled"),
		index.Fields("label_type"),
	}
}
