package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

// Receipt holds the schema definition for the Receipt entity.
type Receipt struct {
	ent.Schema
}

// Fields of the Receipt.
func (Receipt) Fields() []ent.Field {
	return []ent.Field{
		field.String("id").
			Unique().
			Immutable(),
		field.String("user_id").
			NotEmpty().
			Comment("ID of the user who owns this receipt"),
		field.Enum("source_type").
			Values("email", "drive", "upload", "scan").
			Comment("Source of the receipt (email attachment, drive file, manual upload, or scanned)"),
		field.String("source_id").
			Optional().
			Nillable().
			Comment("ID of the source (email message ID, drive file ID, etc.)"),
		field.String("source_connection_id").
			Optional().
			Nillable().
			Comment("ID of the connection used to sync this receipt"),
		field.String("file_name").
			NotEmpty().
			Comment("Original file name"),
		field.String("file_path").
			Optional().
			Nillable().
			Comment("Storage path for the receipt file"),
		field.String("mime_type").
			NotEmpty().
			Comment("MIME type of the receipt file"),
		field.Int64("file_size").
			Default(0).
			Comment("Size of the file in bytes"),
		field.String("storage_bucket").
			Optional().
			Nillable().
			Comment("Storage bucket name"),
		field.String("storage_key").
			Optional().
			Nillable().
			Comment("Storage key/path within bucket"),
		field.String("thumbnail_path").
			Optional().
			Nillable().
			Comment("Path to thumbnail image"),
		field.Enum("status").
			Values("pending", "processing", "processed", "failed", "archived").
			Default("pending").
			Comment("Processing status of the receipt"),
		field.Bool("ocr_completed").
			Default(false).
			Comment("Whether OCR processing has been completed"),
		field.Text("ocr_text").
			Optional().
			Nillable().
			Comment("Extracted text from OCR"),
		field.Float("ocr_confidence").
			Optional().
			Nillable().
			Comment("OCR confidence score (0-1)"),
		field.String("merchant_name").
			Optional().
			Nillable().
			Comment("Extracted or user-provided merchant name"),
		field.String("merchant_address").
			Optional().
			Nillable().
			Comment("Merchant address if available"),
		field.Time("receipt_date").
			Optional().
			Nillable().
			Comment("Date on the receipt"),
		field.Float("total_amount").
			Optional().
			Nillable().
			Comment("Total amount on the receipt"),
		field.Float("tax_amount").
			Optional().
			Nillable().
			Comment("Tax amount if extracted"),
		field.Float("subtotal_amount").
			Optional().
			Nillable().
			Comment("Subtotal before tax"),
		field.String("currency").
			Optional().
			Default("USD").
			Comment("Currency code (ISO 4217)"),
		field.String("payment_method").
			Optional().
			Nillable().
			Comment("Payment method used"),
		field.String("receipt_number").
			Optional().
			Nillable().
			Comment("Receipt/transaction number from merchant"),
		field.Strings("category_tags").
			Optional().
			Comment("Category tags for the receipt"),
		field.JSON("extracted_data", map[string]interface{}{}).
			Optional().
			Comment("Additional extracted data as JSON"),
		field.JSON("metadata", map[string]interface{}{}).
			Optional().
			Comment("Additional metadata"),
		field.String("notes").
			Optional().
			Nillable().
			Comment("User notes about the receipt"),
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
		field.Time("processed_at").
			Optional().
			Nillable().
			Comment("When the receipt was processed"),
	}
}

// Edges of the Receipt.
func (Receipt) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("transactions", Transaction.Type).
			Comment("Transactions associated with this receipt"),
		edge.To("line_items", LineItem.Type).
			Comment("Line items on this receipt"),
	}
}

// Indexes of the Receipt.
func (Receipt) Indexes() []ent.Index {
	return []ent.Index{
		index.Fields("user_id"),
		index.Fields("source_type"),
		index.Fields("source_id"),
		index.Fields("status"),
		index.Fields("user_id", "status"),
		index.Fields("merchant_name"),
		index.Fields("receipt_date"),
		index.Fields("legacy_id"),
		index.Fields("created_at"),
	}
}
