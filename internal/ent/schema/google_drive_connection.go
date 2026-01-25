package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// GoogleDriveConnection holds the schema definition for the GoogleDriveConnection entity.
type GoogleDriveConnection struct {
	ent.Schema
}

// Fields of the GoogleDriveConnection.
func (GoogleDriveConnection) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").
			Unique().
			Immutable(),
		field.String("user_id").
			NotEmpty().
			Comment("ID of the user who owns this connection"),
		field.String("google_account_id").
			NotEmpty().
			Comment("Google account identifier"),
		field.String("email").
			NotEmpty().
			Comment("Google account email address"),
		field.String("access_token").
			Sensitive().
			Comment("OAuth2 access token"),
		field.String("refresh_token").
			Sensitive().
			Comment("OAuth2 refresh token"),
		field.Time("token_expiry").
			Comment("When the access token expires"),
		field.Enum("status").
			Values("active", "inactive", "revoked", "expired").
			Default("active").
			Comment("Connection status"),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
		field.Time("last_sync_at").
			Optional().
			Nillable().
			Comment("Last successful sync timestamp"),
	}
}

// Edges of the GoogleDriveConnection.
func (GoogleDriveConnection) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("folders", GoogleDriveFolder.Type).
			Comment("Folders being tracked by this connection"),
		edge.To("syncs", GoogleDriveSync.Type).
			Comment("Sync history for this connection"),
	}
}

// Indexes of the GoogleDriveConnection.
func (GoogleDriveConnection) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id"),
		index.Fields("google_account_id").
			Unique(),
		index.Fields("status"),
	}
}
