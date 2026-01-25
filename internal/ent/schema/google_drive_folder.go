package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// GoogleDriveFolder holds the schema definition for the GoogleDriveFolder entity.
type GoogleDriveFolder struct {
	ent.Schema
}

// Fields of the GoogleDriveFolder.
func (GoogleDriveFolder) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").
			Unique().
			Immutable(),
		field.String("connection_id").
			NotEmpty().
			Comment("ID of the parent GoogleDriveConnection"),
		field.String("drive_folder_id").
			NotEmpty().
			Comment("Google Drive folder ID"),
		field.String("name").
			NotEmpty().
			Comment("Folder name in Google Drive"),
		field.String("path").
			Optional().
			Comment("Full path to the folder"),
		field.String("parent_folder_id").
			Optional().
			Nillable().
			Comment("Parent folder ID if nested"),
		field.Bool("is_root").
			Default(false).
			Comment("Whether this is a root sync folder"),
		field.Bool("sync_enabled").
			Default(true).
			Comment("Whether syncing is enabled for this folder"),
		field.Enum("sync_direction").
			Values("download", "upload", "bidirectional").
			Default("download").
			Comment("Direction of synchronization"),
		field.Int64("file_count").
			Default(0).
			Comment("Number of files in folder"),
		field.Int64("total_size_bytes").
			Default(0).
			Comment("Total size of files in bytes"),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
		field.Time("last_scanned_at").
			Optional().
			Nillable().
			Comment("Last time folder was scanned for changes"),
	}
}

// Edges of the GoogleDriveFolder.
func (GoogleDriveFolder) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("connection", GoogleDriveConnection.Type).
			Ref("folders").
			Field("connection_id").
			Required().
			Unique().
			Comment("The connection this folder belongs to"),
	}
}

// Indexes of the GoogleDriveFolder.
func (GoogleDriveFolder) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("connection_id"),
		index.Fields("drive_folder_id"),
		index.Fields("connection_id", "drive_folder_id").
			Unique(),
		index.Fields("sync_enabled"),
	}
}
