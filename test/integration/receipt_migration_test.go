package integration

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"clockzen-next/internal/ent/lineitem"
	"clockzen-next/internal/ent/receipt"
	"clockzen-next/internal/ent/transaction"
)

// TestReceiptDatabaseIntegration tests receipt operations with database integration
func TestReceiptDatabaseIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	db := SetupTestDatabase(t)
	defer db.Cleanup(t)

	ctx := context.Background()

	t.Run("receipt schema is properly migrated", func(t *testing.T) {
		// Check that receipt table exists by querying it
		_, err := db.Client.Receipt.Query().Limit(1).All(ctx)
		require.NoError(t, err)

		// Check that transaction table exists
		_, err = db.Client.Transaction.Query().Limit(1).All(ctx)
		require.NoError(t, err)

		// Check that line_item table exists
		_, err = db.Client.LineItem.Query().Limit(1).All(ctx)
		require.NoError(t, err)
	})

	t.Run("create receipt with all fields", func(t *testing.T) {
		now := time.Now()
		receiptDate := now.Add(-24 * time.Hour)

		r, err := db.Client.Receipt.Create().
			SetID("test-receipt-001").
			SetUserID("test-user-001").
			SetSourceType(receipt.SourceTypeUpload).
			SetFileName("test-receipt.pdf").
			SetMimeType("application/pdf").
			SetFileSize(1024).
			SetStatus(receipt.StatusProcessed).
			SetOcrCompleted(true).
			SetOcrText("Test merchant receipt content").
			SetOcrConfidence(0.95).
			SetMerchantName("Test Merchant").
			SetMerchantAddress("123 Test St, Test City, TC 12345").
			SetReceiptDate(receiptDate).
			SetTotalAmount(99.99).
			SetTaxAmount(8.50).
			SetSubtotalAmount(91.49).
			SetCurrency("USD").
			SetPaymentMethod("credit_card").
			SetReceiptNumber("REC-12345").
			SetCategoryTags([]string{"groceries", "food"}).
			SetNotes("Test receipt notes").
			SetLegacyID("legacy-receipt-001").
			SetCreatedAt(now).
			SetUpdatedAt(now).
			SetProcessedAt(now).
			Save(ctx)

		require.NoError(t, err)
		assert.Equal(t, "test-receipt-001", r.ID)
		assert.Equal(t, "test-user-001", r.UserID)
		assert.Equal(t, receipt.SourceTypeUpload, r.SourceType)
		assert.Equal(t, "test-receipt.pdf", r.FileName)
		assert.Equal(t, "application/pdf", r.MimeType)
		assert.Equal(t, int64(1024), r.FileSize)
		assert.Equal(t, receipt.StatusProcessed, r.Status)
		assert.True(t, r.OcrCompleted)
		assert.NotNil(t, r.OcrText)
		assert.Equal(t, "Test merchant receipt content", *r.OcrText)
		assert.NotNil(t, r.OcrConfidence)
		assert.Equal(t, 0.95, *r.OcrConfidence)
		assert.NotNil(t, r.MerchantName)
		assert.Equal(t, "Test Merchant", *r.MerchantName)
		assert.NotNil(t, r.TotalAmount)
		assert.Equal(t, 99.99, *r.TotalAmount)
		assert.Equal(t, "USD", r.Currency)
		assert.NotNil(t, r.LegacyID)
		assert.Equal(t, "legacy-receipt-001", *r.LegacyID)
	})

	t.Run("create transaction linked to receipt", func(t *testing.T) {
		// First create a receipt
		r, err := db.Client.Receipt.Create().
			SetID("test-receipt-tx-001").
			SetUserID("test-user-001").
			SetSourceType(receipt.SourceTypeEmail).
			SetFileName("email-receipt.png").
			SetMimeType("image/png").
			SetFileSize(2048).
			SetStatus(receipt.StatusProcessed).
			Save(ctx)
		require.NoError(t, err)

		// Create a transaction linked to the receipt
		txDate := time.Now()
		tx, err := db.Client.Transaction.Create().
			SetID("test-transaction-001").
			SetReceiptID(r.ID).
			SetUserID("test-user-001").
			SetType(transaction.TypePurchase).
			SetAmount(150.00).
			SetCurrency("USD").
			SetTransactionDate(txDate).
			SetDescription("Purchase at test store").
			SetMerchantName("Test Store").
			SetMerchantCategory("retail").
			SetPaymentMethod("credit_card").
			SetCardLastFour("1234").
			SetReferenceNumber("REF-001").
			SetStatus(transaction.StatusCompleted).
			SetLegacyID("legacy-tx-001").
			Save(ctx)

		require.NoError(t, err)
		assert.Equal(t, "test-transaction-001", tx.ID)
		assert.Equal(t, r.ID, tx.ReceiptID)
		assert.Equal(t, transaction.TypePurchase, tx.Type)
		assert.Equal(t, 150.00, tx.Amount)
		assert.Equal(t, transaction.StatusCompleted, tx.Status)

		// Verify the relationship works
		linkedReceipt, err := tx.QueryReceipt().Only(ctx)
		require.NoError(t, err)
		assert.Equal(t, r.ID, linkedReceipt.ID)
	})

	t.Run("create line items linked to receipt", func(t *testing.T) {
		// First create a receipt
		r, err := db.Client.Receipt.Create().
			SetID("test-receipt-items-001").
			SetUserID("test-user-001").
			SetSourceType(receipt.SourceTypeDrive).
			SetFileName("drive-receipt.jpg").
			SetMimeType("image/jpeg").
			SetFileSize(3072).
			SetStatus(receipt.StatusProcessed).
			Save(ctx)
		require.NoError(t, err)

		// Create line items
		item1, err := db.Client.LineItem.Create().
			SetID("test-lineitem-001").
			SetReceiptID(r.ID).
			SetLineNumber(1).
			SetDescription("Item 1 - Test Product").
			SetSku("SKU-001").
			SetQuantity(2).
			SetUnit("each").
			SetUnitPrice(10.00).
			SetTotalPrice(20.00).
			SetTaxAmount(1.60).
			SetIsTaxable(true).
			SetCategory("groceries").
			SetLegacyID("legacy-item-001").
			Save(ctx)
		require.NoError(t, err)

		item2, err := db.Client.LineItem.Create().
			SetID("test-lineitem-002").
			SetReceiptID(r.ID).
			SetLineNumber(2).
			SetDescription("Item 2 - Another Product").
			SetQuantity(1).
			SetUnitPrice(15.00).
			SetTotalPrice(15.00).
			SetDiscountAmount(2.00).
			SetDiscountDescription("10% off").
			SetIsTaxable(false).
			Save(ctx)
		require.NoError(t, err)

		assert.Equal(t, "test-lineitem-001", item1.ID)
		assert.Equal(t, 1, item1.LineNumber)
		assert.Equal(t, 2.0, item1.Quantity)
		assert.Equal(t, 20.00, item1.TotalPrice)

		assert.Equal(t, "test-lineitem-002", item2.ID)
		assert.Equal(t, 2, item2.LineNumber)
		assert.Equal(t, 2.00, item2.DiscountAmount)
		assert.False(t, item2.IsTaxable)

		// Verify the relationships
		items, err := r.QueryLineItems().All(ctx)
		require.NoError(t, err)
		assert.Len(t, items, 2)
	})

	t.Run("query receipts by status", func(t *testing.T) {
		// Create receipts with different statuses
		_, err := db.Client.Receipt.Create().
			SetID("test-receipt-pending-001").
			SetUserID("test-user-001").
			SetSourceType(receipt.SourceTypeUpload).
			SetFileName("pending.pdf").
			SetMimeType("application/pdf").
			SetStatus(receipt.StatusPending).
			Save(ctx)
		require.NoError(t, err)

		_, err = db.Client.Receipt.Create().
			SetID("test-receipt-processing-001").
			SetUserID("test-user-001").
			SetSourceType(receipt.SourceTypeUpload).
			SetFileName("processing.pdf").
			SetMimeType("application/pdf").
			SetStatus(receipt.StatusProcessing).
			Save(ctx)
		require.NoError(t, err)

		// Query by status
		pendingReceipts, err := db.Client.Receipt.Query().
			Where(receipt.StatusEQ(receipt.StatusPending)).
			All(ctx)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(pendingReceipts), 1)

		processingReceipts, err := db.Client.Receipt.Query().
			Where(receipt.StatusEQ(receipt.StatusProcessing)).
			All(ctx)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(processingReceipts), 1)
	})

	t.Run("query receipts by source type", func(t *testing.T) {
		emailReceipts, err := db.Client.Receipt.Query().
			Where(receipt.SourceTypeEQ(receipt.SourceTypeEmail)).
			All(ctx)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(emailReceipts), 1)

		driveReceipts, err := db.Client.Receipt.Query().
			Where(receipt.SourceTypeEQ(receipt.SourceTypeDrive)).
			All(ctx)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(driveReceipts), 1)
	})

	t.Run("query transactions by type", func(t *testing.T) {
		purchaseTxs, err := db.Client.Transaction.Query().
			Where(transaction.TypeEQ(transaction.TypePurchase)).
			All(ctx)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(purchaseTxs), 1)
	})

	t.Run("query line items with receipt relationship", func(t *testing.T) {
		items, err := db.Client.LineItem.Query().
			Where(lineitem.HasReceipt()).
			WithReceipt().
			All(ctx)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(items), 2)

		// Verify each item has its receipt loaded
		for _, item := range items {
			assert.NotNil(t, item.Edges.Receipt)
		}
	})

	t.Run("verify data integrity - orphaned transactions check", func(t *testing.T) {
		// Verify all transactions have valid receipt references
		orphanedTxs, err := db.Client.Transaction.Query().
			Where(transaction.Not(transaction.HasReceipt())).
			All(ctx)
		require.NoError(t, err)
		assert.Empty(t, orphanedTxs, "There should be no orphaned transactions")
	})

	t.Run("verify data integrity - orphaned line items check", func(t *testing.T) {
		// Verify all line items have valid receipt references
		orphanedItems, err := db.Client.LineItem.Query().
			Where(lineitem.Not(lineitem.HasReceipt())).
			All(ctx)
		require.NoError(t, err)
		assert.Empty(t, orphanedItems, "There should be no orphaned line items")
	})

	t.Run("legacy ID lookup works correctly", func(t *testing.T) {
		// Query by legacy ID
		foundReceipt, err := db.Client.Receipt.Query().
			Where(receipt.LegacyID("legacy-receipt-001")).
			Only(ctx)
		require.NoError(t, err)
		assert.Equal(t, "test-receipt-001", foundReceipt.ID)

		foundTx, err := db.Client.Transaction.Query().
			Where(transaction.LegacyID("legacy-tx-001")).
			Only(ctx)
		require.NoError(t, err)
		assert.Equal(t, "test-transaction-001", foundTx.ID)

		foundItem, err := db.Client.LineItem.Query().
			Where(lineitem.LegacyID("legacy-item-001")).
			Only(ctx)
		require.NoError(t, err)
		assert.Equal(t, "test-lineitem-001", foundItem.ID)
	})

	t.Run("cascade operations - receipt with transactions and items", func(t *testing.T) {
		// Create a receipt with transactions and line items
		r, err := db.Client.Receipt.Create().
			SetID("test-cascade-receipt-001").
			SetUserID("test-user-001").
			SetSourceType(receipt.SourceTypeUpload).
			SetFileName("cascade-test.pdf").
			SetMimeType("application/pdf").
			SetStatus(receipt.StatusProcessed).
			Save(ctx)
		require.NoError(t, err)

		_, err = db.Client.Transaction.Create().
			SetID("test-cascade-tx-001").
			SetReceiptID(r.ID).
			SetUserID("test-user-001").
			SetType(transaction.TypePurchase).
			SetAmount(100.00).
			SetCurrency("USD").
			SetTransactionDate(time.Now()).
			SetStatus(transaction.StatusCompleted).
			Save(ctx)
		require.NoError(t, err)

		_, err = db.Client.LineItem.Create().
			SetID("test-cascade-item-001").
			SetReceiptID(r.ID).
			SetLineNumber(1).
			SetDescription("Cascade test item").
			SetQuantity(1).
			SetUnitPrice(100.00).
			SetTotalPrice(100.00).
			Save(ctx)
		require.NoError(t, err)

		// Verify the receipt has its related entities
		loadedReceipt, err := db.Client.Receipt.Query().
			Where(receipt.ID("test-cascade-receipt-001")).
			WithTransactions().
			WithLineItems().
			Only(ctx)
		require.NoError(t, err)
		assert.Len(t, loadedReceipt.Edges.Transactions, 1)
		assert.Len(t, loadedReceipt.Edges.LineItems, 1)
	})
}

// TestReceiptMigrationDataIntegrity tests the data integrity aspects of receipt migration
func TestReceiptMigrationDataIntegrity(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	db := SetupTestDatabase(t)
	defer db.Cleanup(t)

	ctx := context.Background()

	t.Run("verify receipt source types are correctly mapped", func(t *testing.T) {
		sourceTypes := []receipt.SourceType{
			receipt.SourceTypeEmail,
			receipt.SourceTypeDrive,
			receipt.SourceTypeUpload,
			receipt.SourceTypeScan,
		}

		for i, st := range sourceTypes {
			r, err := db.Client.Receipt.Create().
				SetID("source-type-test-" + string(st)).
				SetUserID("test-user-001").
				SetSourceType(st).
				SetFileName("test-" + string(st) + ".pdf").
				SetMimeType("application/pdf").
				SetStatus(receipt.StatusPending).
				Save(ctx)
			require.NoError(t, err, "Failed to create receipt with source type %s (index %d)", st, i)
			assert.Equal(t, st, r.SourceType)
		}
	})

	t.Run("verify receipt statuses are correctly mapped", func(t *testing.T) {
		statuses := []receipt.Status{
			receipt.StatusPending,
			receipt.StatusProcessing,
			receipt.StatusProcessed,
			receipt.StatusFailed,
			receipt.StatusArchived,
		}

		for i, status := range statuses {
			r, err := db.Client.Receipt.Create().
				SetID("status-test-" + string(status)).
				SetUserID("test-user-001").
				SetSourceType(receipt.SourceTypeUpload).
				SetFileName("test-" + string(status) + ".pdf").
				SetMimeType("application/pdf").
				SetStatus(status).
				Save(ctx)
			require.NoError(t, err, "Failed to create receipt with status %s (index %d)", status, i)
			assert.Equal(t, status, r.Status)
		}
	})

	t.Run("verify transaction types are correctly mapped", func(t *testing.T) {
		// First create a receipt to link transactions to
		r, err := db.Client.Receipt.Create().
			SetID("tx-type-test-receipt").
			SetUserID("test-user-001").
			SetSourceType(receipt.SourceTypeUpload).
			SetFileName("tx-types.pdf").
			SetMimeType("application/pdf").
			SetStatus(receipt.StatusProcessed).
			Save(ctx)
		require.NoError(t, err)

		txTypes := []transaction.Type{
			transaction.TypePurchase,
			transaction.TypeRefund,
			transaction.TypePayment,
			transaction.TypeWithdrawal,
			transaction.TypeDeposit,
			transaction.TypeTransfer,
			transaction.TypeOther,
		}

		for i, txType := range txTypes {
			tx, err := db.Client.Transaction.Create().
				SetID("tx-type-test-" + string(txType)).
				SetReceiptID(r.ID).
				SetUserID("test-user-001").
				SetType(txType).
				SetAmount(100.00).
				SetCurrency("USD").
				SetTransactionDate(time.Now()).
				SetStatus(transaction.StatusCompleted).
				Save(ctx)
			require.NoError(t, err, "Failed to create transaction with type %s (index %d)", txType, i)
			assert.Equal(t, txType, tx.Type)
		}
	})

	t.Run("verify transaction statuses are correctly mapped", func(t *testing.T) {
		// First create a receipt
		r, err := db.Client.Receipt.Create().
			SetID("tx-status-test-receipt").
			SetUserID("test-user-001").
			SetSourceType(receipt.SourceTypeUpload).
			SetFileName("tx-status.pdf").
			SetMimeType("application/pdf").
			SetStatus(receipt.StatusProcessed).
			Save(ctx)
		require.NoError(t, err)

		txStatuses := []transaction.Status{
			transaction.StatusPending,
			transaction.StatusCompleted,
			transaction.StatusFailed,
			transaction.StatusRefunded,
			transaction.StatusDisputed,
			transaction.StatusCancelled,
		}

		for i, status := range txStatuses {
			tx, err := db.Client.Transaction.Create().
				SetID("tx-status-test-" + string(status)).
				SetReceiptID(r.ID).
				SetUserID("test-user-001").
				SetType(transaction.TypePurchase).
				SetAmount(100.00).
				SetCurrency("USD").
				SetTransactionDate(time.Now()).
				SetStatus(status).
				Save(ctx)
			require.NoError(t, err, "Failed to create transaction with status %s (index %d)", status, i)
			assert.Equal(t, status, tx.Status)
		}
	})
}
