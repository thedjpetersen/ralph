package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// GoogleDriveSync holds the schema definition for the GoogleDriveSync entity.
type GoogleDriveSync struct {
	ent.Schema
}

// Fields of the GoogleDriveSync.
func (GoogleDriveSync) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").
			Unique().
			Immutable(),
		field.String("connection_id").
			NotEmpty().
			Comment("ID of the parent GoogleDriveConnection"),
		field.String("folder_id").
			Optional().
			Nillable().
			Comment("Specific folder ID if sync was for a folder"),
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
		field.Int("files_scanned").
			Default(0).
			Comment("Number of files scanned"),
		field.Int("files_downloaded").
			Default(0).
			Comment("Number of files downloaded"),
		field.Int("files_uploaded").
			Default(0).
			Comment("Number of files uploaded"),
		field.Int("files_deleted").
			Default(0).
			Comment("Number of files deleted"),
		field.Int("files_failed").
			Default(0).
			Comment("Number of file operations that failed"),
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
		field.String("change_token").
			Optional().
			Nillable().
			Comment("Google Drive change token for incremental sync"),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

// Edges of the GoogleDriveSync.
func (GoogleDriveSync) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("connection", GoogleDriveConnection.Type).
			Ref("syncs").
			Field("connection_id").
			Required().
			Unique().
			Comment("The connection this sync belongs to"),
	}
}

// Indexes of the GoogleDriveSync.
func (GoogleDriveSync) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("connection_id"),
		index.Fields("status"),
		index.Fields("sync_type"),
		index.Fields("connection_id", "status"),
		index.Fields("created_at"),
	}
}
