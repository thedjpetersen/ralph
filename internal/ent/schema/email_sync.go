package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// EmailSync holds the schema definition for the EmailSync entity.
type EmailSync struct {
	ent.Schema
}

// Fields of the EmailSync.
func (EmailSync) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").
			Unique().
			Immutable(),
		field.String("connection_id").
			NotEmpty().
			Comment("ID of the parent EmailConnection"),
		field.String("label_id").
			Optional().
			Nillable().
			Comment("Specific label ID if sync was for a label"),
		field.Enum("sync_type").
			Values("full", "incremental", "manual").
			Default("incremental").
			Comment("Type of sync operation"),
		field.Enum("status").
			Values("pending", "running", "completed", "failed", "cancelled").
			Default("pending").
			Comment("Current sync status"),
		field.Time("started_at").
			Optional().
			Nillable().
			Comment("When sync started"),
		field.Time("completed_at").
			Optional().
			Nillable().
			Comment("When sync completed"),
		field.Int("messages_scanned").
			Default(0).
			Comment("Number of messages scanned"),
		field.Int("messages_downloaded").
			Default(0).
			Comment("Number of messages downloaded"),
		field.Int("messages_indexed").
			Default(0).
			Comment("Number of messages indexed"),
		field.Int("messages_failed").
			Default(0).
			Comment("Number of message operations that failed"),
		field.Int("attachments_downloaded").
			Default(0).
			Comment("Number of attachments downloaded"),
		field.Int64("bytes_transferred").
			Default(0).
			Comment("Total bytes transferred"),
		field.String("error_message").
			Optional().
			Nillable().
			Comment("Error message if sync failed"),
		field.JSON("error_details", map[string]interface{}{}).
			Optional().
			Comment("Detailed error information"),
		field.String("history_id").
			Optional().
			Nillable().
			Comment("Email provider history ID for incremental sync"),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

// Edges of the EmailSync.
func (EmailSync) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("connection", EmailConnection.Type).
			Ref("syncs").
			Field("connection_id").
			Required().
			Unique().
			Comment("The connection this sync belongs to"),
	}
}

// Indexes of the EmailSync.
func (EmailSync) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("connection_id"),
		index.Fields("status"),
		index.Fields("sync_type"),
		index.Fields("connection_id", "status"),
		index.Fields("created_at"),
	}
}
