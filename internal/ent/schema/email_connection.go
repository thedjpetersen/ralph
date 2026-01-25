package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// EmailConnection holds the schema definition for the EmailConnection entity.
type EmailConnection struct {
	ent.Schema
}

// Fields of the EmailConnection.
func (EmailConnection) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").
			Unique().
			Immutable(),
		field.String("user_id").
			NotEmpty().
			Comment("ID of the user who owns this connection"),
		field.String("provider_account_id").
			NotEmpty().
			Comment("Email provider account identifier"),
		field.String("email").
			NotEmpty().
			Comment("Email address"),
		field.Enum("provider").
			Values("gmail", "outlook", "imap").
			Comment("Email provider type"),
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

// Edges of the EmailConnection.
func (EmailConnection) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("labels", EmailLabel.Type).
			Comment("Labels/folders associated with this connection"),
		edge.To("syncs", EmailSync.Type).
			Comment("Sync history for this connection"),
	}
}

// Indexes of the EmailConnection.
func (EmailConnection) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id"),
		index.Fields("provider_account_id").
			Unique(),
		index.Fields("status"),
		index.Fields("provider"),
	}
}
