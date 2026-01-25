package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// LineItem holds the schema definition for the LineItem entity.
type LineItem struct {
	ent.Schema
}

// Fields of the LineItem.
func (LineItem) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").
			Unique().
			Immutable(),
		field.String("receipt_id").
			NotEmpty().
			Comment("ID of the parent Receipt"),
		field.Int("line_number").
			Default(0).
			Comment("Order of the line item on the receipt"),
		field.String("description").
			NotEmpty().
			Comment("Item description"),
		field.String("sku").
			Optional().
			Nillable().
			Comment("Product SKU if available"),
		field.String("product_code").
			Optional().
			Nillable().
			Comment("Product code or barcode"),
		field.Float("quantity").
			Default(1).
			Comment("Quantity purchased"),
		field.String("unit").
			Optional().
			Nillable().
			Comment("Unit of measure (e.g., each, lb, oz)"),
		field.Float("unit_price").
			Comment("Price per unit"),
		field.Float("total_price").
			Comment("Total price for this line item"),
		field.Float("discount_amount").
			Optional().
			Default(0).
			Comment("Discount applied to this item"),
		field.String("discount_description").
			Optional().
			Nillable().
			Comment("Description of discount if applied"),
		field.Float("tax_amount").
			Optional().
			Default(0).
			Comment("Tax amount for this item"),
		field.Float("tax_rate").
			Optional().
			Nillable().
			Comment("Tax rate applied (as decimal, e.g., 0.08 for 8%)"),
		field.Bool("is_taxable").
			Default(true).
			Comment("Whether this item is taxable"),
		field.String("category").
			Optional().
			Nillable().
			Comment("Item category"),
		field.Strings("tags").
			Optional().
			Comment("Tags for categorization"),
		field.JSON("metadata", map[string]interface{}{}).
			Optional().
			Comment("Additional metadata"),
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

// Edges of the LineItem.
func (LineItem) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("receipt", Receipt.Type).
			Ref("line_items").
			Field("receipt_id").
			Required().
			Unique().
			Comment("The receipt this line item belongs to"),
	}
}

// Indexes of the LineItem.
func (LineItem) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("receipt_id"),
		index.Fields("receipt_id", "line_number"),
		index.Fields("sku"),
		index.Fields("product_code"),
		index.Fields("category"),
		index.Fields("legacy_id"),
	}
}
