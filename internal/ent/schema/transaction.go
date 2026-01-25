package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// Transaction holds the schema definition for the Transaction entity.
type Transaction struct {
	ent.Schema
}

// Fields of the Transaction.
func (Transaction) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").
			Unique().
			Immutable(),
		field.String("receipt_id").
			NotEmpty().
			Comment("ID of the parent Receipt"),
		field.String("user_id").
			NotEmpty().
			Comment("ID of the user who owns this transaction"),
		field.Enum("type").
			Values("purchase", "refund", "payment", "withdrawal", "deposit", "transfer", "other").
			Default("purchase").
			Comment("Type of transaction"),
		field.Float("amount").
			Comment("Transaction amount"),
		field.String("currency").
			Default("USD").
			Comment("Currency code (ISO 4217)"),
		field.Time("transaction_date").
			Comment("Date of the transaction"),
		field.String("description").
			Optional().
			Nillable().
			Comment("Transaction description"),
		field.String("merchant_name").
			Optional().
			Nillable().
			Comment("Merchant name for this transaction"),
		field.String("merchant_category").
			Optional().
			Nillable().
			Comment("Merchant category code or description"),
		field.String("payment_method").
			Optional().
			Nillable().
			Comment("Payment method used (credit card, debit, cash, etc.)"),
		field.String("card_last_four").
			Optional().
			Nillable().
			Comment("Last 4 digits of card if applicable"),
		field.String("reference_number").
			Optional().
			Nillable().
			Comment("Reference or confirmation number"),
		field.String("authorization_code").
			Optional().
			Nillable().
			Comment("Authorization code from payment processor"),
		field.Enum("status").
			Values("pending", "completed", "failed", "refunded", "disputed", "cancelled").
			Default("completed").
			Comment("Transaction status"),
		field.Bool("is_recurring").
			Default(false).
			Comment("Whether this is a recurring transaction"),
		field.String("recurrence_pattern").
			Optional().
			Nillable().
			Comment("Recurrence pattern if recurring (e.g., monthly, weekly)"),
		field.Strings("category_tags").
			Optional().
			Comment("Category tags for the transaction"),
		field.JSON("metadata", map[string]interface{}{}).
			Optional().
			Comment("Additional metadata"),
		field.String("notes").
			Optional().
			Nillable().
			Comment("User notes about the transaction"),
		field.String("legacy_id").
			Optional().
			Nillable().
			Comment("ID from legacy system for migration tracking"),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

// Edges of the Transaction.
func (Transaction) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("receipt", Receipt.Type).
			Ref("transactions").
			Field("receipt_id").
			Required().
			Unique().
			Comment("The receipt this transaction belongs to"),
	}
}

// Indexes of the Transaction.
func (Transaction) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("receipt_id"),
		index.Fields("user_id"),
		index.Fields("type"),
		index.Fields("status"),
		index.Fields("transaction_date"),
		index.Fields("user_id", "transaction_date"),
		index.Fields("merchant_name"),
		index.Fields("legacy_id"),
		index.Fields("created_at"),
	}
}
