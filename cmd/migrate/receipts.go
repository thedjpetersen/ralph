package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"time"

	"clockzen-next/internal/ent"
	"clockzen-next/internal/ent/lineitem"
	"clockzen-next/internal/ent/receipt"
	"clockzen-next/internal/ent/transaction"

	"github.com/google/uuid"
)

// LegacyReceipt represents a receipt from the legacy database schema
type LegacyReceipt struct {
	ID                 string
	UserID             string
	SourceType         string
	SourceID           *string
	SourceConnectionID *string
	FileName           string
	FilePath           *string
	MimeType           string
	FileSize           int64
	StorageBucket      *string
	StorageKey         *string
	ThumbnailPath      *string
	Status             string
	OcrCompleted       bool
	OcrText            *string
	OcrConfidence      *float64
	MerchantName       *string
	MerchantAddress    *string
	ReceiptDate        *time.Time
	TotalAmount        *float64
	TaxAmount          *float64
	SubtotalAmount     *float64
	Currency           string
	PaymentMethod      *string
	ReceiptNumber      *string
	CategoryTags       []string
	ExtractedData      map[string]interface{}
	Metadata           map[string]interface{}
	Notes              *string
	CreatedAt          time.Time
	UpdatedAt          time.Time
	ProcessedAt        *time.Time
}

// LegacyTransaction represents a transaction from the legacy database schema
type LegacyTransaction struct {
	ID                string
	ReceiptID         string
	UserID            string
	Type              string
	Amount            float64
	Currency          string
	TransactionDate   time.Time
	Description       *string
	MerchantName      *string
	MerchantCategory  *string
	PaymentMethod     *string
	CardLastFour      *string
	ReferenceNumber   *string
	AuthorizationCode *string
	Status            string
	IsRecurring       bool
	RecurrencePattern *string
	CategoryTags      []string
	Metadata          map[string]interface{}
	Notes             *string
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

// LegacyLineItem represents a line item from the legacy database schema
type LegacyLineItem struct {
	ID                  string
	ReceiptID           string
	LineNumber          int
	Description         string
	SKU                 *string
	ProductCode         *string
	Quantity            float64
	Unit                *string
	UnitPrice           float64
	TotalPrice          float64
	DiscountAmount      float64
	DiscountDescription *string
	TaxAmount           float64
	TaxRate             *float64
	IsTaxable           bool
	Category            *string
	Tags                []string
	Metadata            map[string]interface{}
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

// ReceiptMigrationStats tracks receipt migration progress
type ReceiptMigrationStats struct {
	ReceiptsProcessed     int
	ReceiptsCreated       int
	ReceiptsSkipped       int
	TransactionsProcessed int
	TransactionsCreated   int
	LineItemsProcessed    int
	LineItemsCreated      int
	ImagesProcessed       int
	ImagesCopied          int
	ImagesFailed          int
	Errors                []string
}

// ReceiptMigrator handles receipt data migration
type ReceiptMigrator struct {
	legacyDB        *sql.DB
	targetClient    *ent.Client
	batchSize       int
	dryRun          bool
	verbose         bool
	stats           *ReceiptMigrationStats
	userIDMap       map[string]string // Maps legacy user IDs to new user IDs
	receiptIDMap    map[string]string // Maps legacy receipt IDs to new receipt IDs
	sourceImagePath string            // Path to legacy image storage
	targetImagePath string            // Path to new image storage
	progressCb      func(ReceiptMigrationProgress)
}

// ReceiptMigrationProgress represents the current migration progress
type ReceiptMigrationProgress struct {
	Phase                 string
	TotalReceipts         int
	ProcessedReceipts     int
	TotalTransactions     int
	ProcessedTransactions int
	TotalLineItems        int
	ProcessedLineItems    int
	CurrentItem           string
	Errors                int
}

// NewReceiptMigrator creates a new receipt migrator
func NewReceiptMigrator(legacyDB *sql.DB, targetClient *ent.Client, opts ...ReceiptMigratorOption) *ReceiptMigrator {
	m := &ReceiptMigrator{
		legacyDB:        legacyDB,
		targetClient:    targetClient,
		batchSize:       100,
		dryRun:          false,
		verbose:         false,
		stats:           &ReceiptMigrationStats{},
		userIDMap:       make(map[string]string),
		receiptIDMap:    make(map[string]string),
		sourceImagePath: "",
		targetImagePath: "",
	}
	for _, opt := range opts {
		opt(m)
	}
	return m
}

// ReceiptMigratorOption is a functional option for configuring the receipt migrator
type ReceiptMigratorOption func(*ReceiptMigrator)

// WithBatchSize sets the batch size for the migration
func WithBatchSize(size int) ReceiptMigratorOption {
	return func(m *ReceiptMigrator) {
		m.batchSize = size
	}
}

// WithDryRun enables dry run mode
func WithDryRun(dryRun bool) ReceiptMigratorOption {
	return func(m *ReceiptMigrator) {
		m.dryRun = dryRun
	}
}

// WithVerbose enables verbose logging
func WithVerbose(verbose bool) ReceiptMigratorOption {
	return func(m *ReceiptMigrator) {
		m.verbose = verbose
	}
}

// WithUserIDMap sets the user ID mapping from a previous migration
func WithUserIDMap(userIDMap map[string]string) ReceiptMigratorOption {
	return func(m *ReceiptMigrator) {
		m.userIDMap = userIDMap
	}
}

// WithImagePaths sets the source and target image storage paths
func WithImagePaths(source, target string) ReceiptMigratorOption {
	return func(m *ReceiptMigrator) {
		m.sourceImagePath = source
		m.targetImagePath = target
	}
}

// WithProgressCallback sets a callback for progress reporting
func WithProgressCallback(cb func(ReceiptMigrationProgress)) ReceiptMigratorOption {
	return func(m *ReceiptMigrator) {
		m.progressCb = cb
	}
}

// Run executes the receipt migration
func (m *ReceiptMigrator) Run(ctx context.Context) error {
	log.Println("Starting receipt migration...")

	// Step 1: Count totals for progress reporting
	totalReceipts, err := m.countLegacyReceipts(ctx)
	if err != nil {
		return fmt.Errorf("failed to count legacy receipts: %w", err)
	}
	log.Printf("Found %d receipts to migrate", totalReceipts)

	// Step 2: Migrate receipts
	if err := m.migrateReceipts(ctx); err != nil {
		return fmt.Errorf("receipt migration failed: %w", err)
	}

	// Step 3: Migrate transactions
	if err := m.migrateTransactions(ctx); err != nil {
		return fmt.Errorf("transaction migration failed: %w", err)
	}

	// Step 4: Migrate line items
	if err := m.migrateLineItems(ctx); err != nil {
		return fmt.Errorf("line item migration failed: %w", err)
	}

	// Step 5: Migrate receipt images (if paths are configured)
	if m.sourceImagePath != "" && m.targetImagePath != "" {
		if err := m.migrateImages(ctx); err != nil {
			return fmt.Errorf("image migration failed: %w", err)
		}
	}

	// Step 6: Verify data integrity
	if err := m.verifyDataIntegrity(ctx); err != nil {
		log.Printf("Warning: data integrity verification failed: %v", err)
		m.stats.Errors = append(m.stats.Errors, fmt.Sprintf("Data integrity verification failed: %v", err))
	}

	log.Println("Receipt migration completed successfully")
	return nil
}

// countLegacyReceipts counts the total number of receipts to migrate
func (m *ReceiptMigrator) countLegacyReceipts(ctx context.Context) (int, error) {
	var count int
	err := m.legacyDB.QueryRowContext(ctx, "SELECT COUNT(*) FROM receipts").Scan(&count)
	return count, err
}

// migrateReceipts migrates receipt records from the legacy database
func (m *ReceiptMigrator) migrateReceipts(ctx context.Context) error {
	log.Println("Migrating receipts...")
	m.reportProgress(ReceiptMigrationProgress{Phase: "receipts"})

	offset := 0
	for {
		receipts, err := m.fetchLegacyReceipts(ctx, offset, m.batchSize)
		if err != nil {
			return fmt.Errorf("failed to fetch legacy receipts: %w", err)
		}

		if len(receipts) == 0 {
			break
		}

		for _, legacyReceipt := range receipts {
			if err := m.migrateReceipt(ctx, legacyReceipt); err != nil {
				errMsg := fmt.Sprintf("Failed to migrate receipt %s: %v", legacyReceipt.ID, err)
				m.stats.Errors = append(m.stats.Errors, errMsg)
				if m.verbose {
					log.Println(errMsg)
				}
				continue
			}
			m.stats.ReceiptsProcessed++
			m.reportProgress(ReceiptMigrationProgress{
				Phase:             "receipts",
				ProcessedReceipts: m.stats.ReceiptsProcessed,
				CurrentItem:       legacyReceipt.FileName,
			})
		}

		offset += len(receipts)
		log.Printf("Processed %d receipts...", offset)
	}

	log.Printf("Receipt migration complete: %d receipts processed, %d created, %d skipped",
		m.stats.ReceiptsProcessed, m.stats.ReceiptsCreated, m.stats.ReceiptsSkipped)
	return nil
}

// migrateReceipt migrates a single receipt record
func (m *ReceiptMigrator) migrateReceipt(ctx context.Context, legacyReceipt LegacyReceipt) error {
	// Get the new user ID from the mapping
	newUserID, ok := m.userIDMap[legacyReceipt.UserID]
	if !ok {
		// If no mapping exists, use the legacy user ID (for fresh migrations)
		newUserID = legacyReceipt.UserID
	}

	if m.verbose {
		log.Printf("Migrating receipt: %s (%s)", legacyReceipt.ID, legacyReceipt.FileName)
	}

	if m.dryRun {
		newID := uuid.New().String()
		m.receiptIDMap[legacyReceipt.ID] = newID
		return nil
	}

	// Check if receipt already exists by legacy_id
	exists, err := m.targetClient.Receipt.Query().
		Where(receipt.LegacyID(legacyReceipt.ID)).
		Exist(ctx)
	if err != nil {
		return fmt.Errorf("failed to check existing receipt: %w", err)
	}
	if exists {
		if m.verbose {
			log.Printf("Receipt %s already exists, skipping", legacyReceipt.ID)
		}
		// Get the existing receipt ID for the mapping
		existingReceipt, err := m.targetClient.Receipt.Query().
			Where(receipt.LegacyID(legacyReceipt.ID)).
			First(ctx)
		if err != nil {
			return fmt.Errorf("failed to get existing receipt: %w", err)
		}
		m.receiptIDMap[legacyReceipt.ID] = existingReceipt.ID
		m.stats.ReceiptsSkipped++
		return nil
	}

	// Create the new receipt
	newID := uuid.New().String()
	create := m.targetClient.Receipt.Create().
		SetID(newID).
		SetUserID(newUserID).
		SetSourceType(mapReceiptSourceType(legacyReceipt.SourceType)).
		SetFileName(legacyReceipt.FileName).
		SetMimeType(legacyReceipt.MimeType).
		SetFileSize(legacyReceipt.FileSize).
		SetStatus(mapReceiptStatus(legacyReceipt.Status)).
		SetOcrCompleted(legacyReceipt.OcrCompleted).
		SetCurrency(legacyReceipt.Currency).
		SetCreatedAt(legacyReceipt.CreatedAt).
		SetUpdatedAt(legacyReceipt.UpdatedAt).
		SetLegacyID(legacyReceipt.ID)

	// Set optional fields
	if legacyReceipt.SourceID != nil {
		create.SetSourceID(*legacyReceipt.SourceID)
	}
	if legacyReceipt.SourceConnectionID != nil {
		create.SetSourceConnectionID(*legacyReceipt.SourceConnectionID)
	}
	if legacyReceipt.FilePath != nil {
		create.SetFilePath(*legacyReceipt.FilePath)
	}
	if legacyReceipt.StorageBucket != nil {
		create.SetStorageBucket(*legacyReceipt.StorageBucket)
	}
	if legacyReceipt.StorageKey != nil {
		create.SetStorageKey(*legacyReceipt.StorageKey)
	}
	if legacyReceipt.ThumbnailPath != nil {
		create.SetThumbnailPath(*legacyReceipt.ThumbnailPath)
	}
	if legacyReceipt.OcrText != nil {
		create.SetOcrText(*legacyReceipt.OcrText)
	}
	if legacyReceipt.OcrConfidence != nil {
		create.SetOcrConfidence(*legacyReceipt.OcrConfidence)
	}
	if legacyReceipt.MerchantName != nil {
		create.SetMerchantName(*legacyReceipt.MerchantName)
	}
	if legacyReceipt.MerchantAddress != nil {
		create.SetMerchantAddress(*legacyReceipt.MerchantAddress)
	}
	if legacyReceipt.ReceiptDate != nil {
		create.SetReceiptDate(*legacyReceipt.ReceiptDate)
	}
	if legacyReceipt.TotalAmount != nil {
		create.SetTotalAmount(*legacyReceipt.TotalAmount)
	}
	if legacyReceipt.TaxAmount != nil {
		create.SetTaxAmount(*legacyReceipt.TaxAmount)
	}
	if legacyReceipt.SubtotalAmount != nil {
		create.SetSubtotalAmount(*legacyReceipt.SubtotalAmount)
	}
	if legacyReceipt.PaymentMethod != nil {
		create.SetPaymentMethod(*legacyReceipt.PaymentMethod)
	}
	if legacyReceipt.ReceiptNumber != nil {
		create.SetReceiptNumber(*legacyReceipt.ReceiptNumber)
	}
	if len(legacyReceipt.CategoryTags) > 0 {
		create.SetCategoryTags(legacyReceipt.CategoryTags)
	}
	if len(legacyReceipt.ExtractedData) > 0 {
		create.SetExtractedData(legacyReceipt.ExtractedData)
	}
	if len(legacyReceipt.Metadata) > 0 {
		create.SetMetadata(legacyReceipt.Metadata)
	}
	if legacyReceipt.Notes != nil {
		create.SetNotes(*legacyReceipt.Notes)
	}
	if legacyReceipt.ProcessedAt != nil {
		create.SetProcessedAt(*legacyReceipt.ProcessedAt)
	}

	_, err = create.Save(ctx)
	if err != nil {
		return fmt.Errorf("failed to create receipt: %w", err)
	}

	m.receiptIDMap[legacyReceipt.ID] = newID
	m.stats.ReceiptsCreated++
	return nil
}

// migrateTransactions migrates transaction records from the legacy database
func (m *ReceiptMigrator) migrateTransactions(ctx context.Context) error {
	log.Println("Migrating transactions...")
	m.reportProgress(ReceiptMigrationProgress{Phase: "transactions"})

	offset := 0
	for {
		transactions, err := m.fetchLegacyTransactions(ctx, offset, m.batchSize)
		if err != nil {
			return fmt.Errorf("failed to fetch legacy transactions: %w", err)
		}

		if len(transactions) == 0 {
			break
		}

		for _, legacyTx := range transactions {
			if err := m.migrateTransaction(ctx, legacyTx); err != nil {
				errMsg := fmt.Sprintf("Failed to migrate transaction %s: %v", legacyTx.ID, err)
				m.stats.Errors = append(m.stats.Errors, errMsg)
				if m.verbose {
					log.Println(errMsg)
				}
				continue
			}
			m.stats.TransactionsProcessed++
			m.reportProgress(ReceiptMigrationProgress{
				Phase:                 "transactions",
				ProcessedTransactions: m.stats.TransactionsProcessed,
			})
		}

		offset += len(transactions)
		log.Printf("Processed %d transactions...", offset)
	}

	log.Printf("Transaction migration complete: %d processed, %d created",
		m.stats.TransactionsProcessed, m.stats.TransactionsCreated)
	return nil
}

// migrateTransaction migrates a single transaction record
func (m *ReceiptMigrator) migrateTransaction(ctx context.Context, legacyTx LegacyTransaction) error {
	// Get the new receipt ID from the mapping
	newReceiptID, ok := m.receiptIDMap[legacyTx.ReceiptID]
	if !ok {
		return fmt.Errorf("receipt ID %s not found in mapping", legacyTx.ReceiptID)
	}

	// Get the new user ID from the mapping
	newUserID, ok := m.userIDMap[legacyTx.UserID]
	if !ok {
		newUserID = legacyTx.UserID
	}

	if m.verbose {
		log.Printf("Migrating transaction: %s", legacyTx.ID)
	}

	if m.dryRun {
		return nil
	}

	// Check if transaction already exists by legacy_id
	exists, err := m.targetClient.Transaction.Query().
		Where(transaction.LegacyID(legacyTx.ID)).
		Exist(ctx)
	if err != nil {
		return fmt.Errorf("failed to check existing transaction: %w", err)
	}
	if exists {
		if m.verbose {
			log.Printf("Transaction %s already exists, skipping", legacyTx.ID)
		}
		return nil
	}

	// Create the new transaction
	create := m.targetClient.Transaction.Create().
		SetID(uuid.New().String()).
		SetReceiptID(newReceiptID).
		SetUserID(newUserID).
		SetType(mapTransactionType(legacyTx.Type)).
		SetAmount(legacyTx.Amount).
		SetCurrency(legacyTx.Currency).
		SetTransactionDate(legacyTx.TransactionDate).
		SetStatus(mapTransactionStatus(legacyTx.Status)).
		SetIsRecurring(legacyTx.IsRecurring).
		SetCreatedAt(legacyTx.CreatedAt).
		SetUpdatedAt(legacyTx.UpdatedAt).
		SetLegacyID(legacyTx.ID)

	// Set optional fields
	if legacyTx.Description != nil {
		create.SetDescription(*legacyTx.Description)
	}
	if legacyTx.MerchantName != nil {
		create.SetMerchantName(*legacyTx.MerchantName)
	}
	if legacyTx.MerchantCategory != nil {
		create.SetMerchantCategory(*legacyTx.MerchantCategory)
	}
	if legacyTx.PaymentMethod != nil {
		create.SetPaymentMethod(*legacyTx.PaymentMethod)
	}
	if legacyTx.CardLastFour != nil {
		create.SetCardLastFour(*legacyTx.CardLastFour)
	}
	if legacyTx.ReferenceNumber != nil {
		create.SetReferenceNumber(*legacyTx.ReferenceNumber)
	}
	if legacyTx.AuthorizationCode != nil {
		create.SetAuthorizationCode(*legacyTx.AuthorizationCode)
	}
	if legacyTx.RecurrencePattern != nil {
		create.SetRecurrencePattern(*legacyTx.RecurrencePattern)
	}
	if len(legacyTx.CategoryTags) > 0 {
		create.SetCategoryTags(legacyTx.CategoryTags)
	}
	if len(legacyTx.Metadata) > 0 {
		create.SetMetadata(legacyTx.Metadata)
	}
	if legacyTx.Notes != nil {
		create.SetNotes(*legacyTx.Notes)
	}

	_, err = create.Save(ctx)
	if err != nil {
		return fmt.Errorf("failed to create transaction: %w", err)
	}

	m.stats.TransactionsCreated++
	return nil
}

// migrateLineItems migrates line item records from the legacy database
func (m *ReceiptMigrator) migrateLineItems(ctx context.Context) error {
	log.Println("Migrating line items...")
	m.reportProgress(ReceiptMigrationProgress{Phase: "line_items"})

	offset := 0
	for {
		lineItems, err := m.fetchLegacyLineItems(ctx, offset, m.batchSize)
		if err != nil {
			return fmt.Errorf("failed to fetch legacy line items: %w", err)
		}

		if len(lineItems) == 0 {
			break
		}

		for _, legacyItem := range lineItems {
			if err := m.migrateLineItem(ctx, legacyItem); err != nil {
				errMsg := fmt.Sprintf("Failed to migrate line item %s: %v", legacyItem.ID, err)
				m.stats.Errors = append(m.stats.Errors, errMsg)
				if m.verbose {
					log.Println(errMsg)
				}
				continue
			}
			m.stats.LineItemsProcessed++
			m.reportProgress(ReceiptMigrationProgress{
				Phase:              "line_items",
				ProcessedLineItems: m.stats.LineItemsProcessed,
			})
		}

		offset += len(lineItems)
		log.Printf("Processed %d line items...", offset)
	}

	log.Printf("Line item migration complete: %d processed, %d created",
		m.stats.LineItemsProcessed, m.stats.LineItemsCreated)
	return nil
}

// migrateLineItem migrates a single line item record
func (m *ReceiptMigrator) migrateLineItem(ctx context.Context, legacyItem LegacyLineItem) error {
	// Get the new receipt ID from the mapping
	newReceiptID, ok := m.receiptIDMap[legacyItem.ReceiptID]
	if !ok {
		return fmt.Errorf("receipt ID %s not found in mapping", legacyItem.ReceiptID)
	}

	if m.verbose {
		log.Printf("Migrating line item: %s", legacyItem.ID)
	}

	if m.dryRun {
		return nil
	}

	// Check if line item already exists by legacy_id
	exists, err := m.targetClient.LineItem.Query().
		Where(lineitem.LegacyID(legacyItem.ID)).
		Exist(ctx)
	if err != nil {
		return fmt.Errorf("failed to check existing line item: %w", err)
	}
	if exists {
		if m.verbose {
			log.Printf("Line item %s already exists, skipping", legacyItem.ID)
		}
		return nil
	}

	// Create the new line item
	create := m.targetClient.LineItem.Create().
		SetID(uuid.New().String()).
		SetReceiptID(newReceiptID).
		SetLineNumber(legacyItem.LineNumber).
		SetDescription(legacyItem.Description).
		SetQuantity(legacyItem.Quantity).
		SetUnitPrice(legacyItem.UnitPrice).
		SetTotalPrice(legacyItem.TotalPrice).
		SetDiscountAmount(legacyItem.DiscountAmount).
		SetTaxAmount(legacyItem.TaxAmount).
		SetIsTaxable(legacyItem.IsTaxable).
		SetCreatedAt(legacyItem.CreatedAt).
		SetUpdatedAt(legacyItem.UpdatedAt).
		SetLegacyID(legacyItem.ID)

	// Set optional fields
	if legacyItem.SKU != nil {
		create.SetSku(*legacyItem.SKU)
	}
	if legacyItem.ProductCode != nil {
		create.SetProductCode(*legacyItem.ProductCode)
	}
	if legacyItem.Unit != nil {
		create.SetUnit(*legacyItem.Unit)
	}
	if legacyItem.DiscountDescription != nil {
		create.SetDiscountDescription(*legacyItem.DiscountDescription)
	}
	if legacyItem.TaxRate != nil {
		create.SetTaxRate(*legacyItem.TaxRate)
	}
	if legacyItem.Category != nil {
		create.SetCategory(*legacyItem.Category)
	}
	if len(legacyItem.Tags) > 0 {
		create.SetTags(legacyItem.Tags)
	}
	if len(legacyItem.Metadata) > 0 {
		create.SetMetadata(legacyItem.Metadata)
	}

	_, err = create.Save(ctx)
	if err != nil {
		return fmt.Errorf("failed to create line item: %w", err)
	}

	m.stats.LineItemsCreated++
	return nil
}

// migrateImages migrates receipt images from the legacy storage to the new storage
func (m *ReceiptMigrator) migrateImages(ctx context.Context) error {
	log.Println("Migrating receipt images...")
	m.reportProgress(ReceiptMigrationProgress{Phase: "images"})

	// Query all receipts that have file paths
	receipts, err := m.targetClient.Receipt.Query().
		Where(receipt.FilePathNotNil()).
		All(ctx)
	if err != nil {
		return fmt.Errorf("failed to query receipts with file paths: %w", err)
	}

	for _, r := range receipts {
		if r.FilePath == nil {
			continue
		}

		m.stats.ImagesProcessed++

		if m.dryRun {
			continue
		}

		// Build source and target paths
		sourcePath := filepath.Join(m.sourceImagePath, *r.FilePath)
		targetPath := filepath.Join(m.targetImagePath, *r.FilePath)

		// Ensure target directory exists
		targetDir := filepath.Dir(targetPath)
		if err := os.MkdirAll(targetDir, 0755); err != nil {
			errMsg := fmt.Sprintf("Failed to create directory %s: %v", targetDir, err)
			m.stats.Errors = append(m.stats.Errors, errMsg)
			m.stats.ImagesFailed++
			continue
		}

		// Copy the file
		if err := copyFile(sourcePath, targetPath); err != nil {
			errMsg := fmt.Sprintf("Failed to copy image %s: %v", sourcePath, err)
			m.stats.Errors = append(m.stats.Errors, errMsg)
			m.stats.ImagesFailed++
			continue
		}

		m.stats.ImagesCopied++
		m.reportProgress(ReceiptMigrationProgress{
			Phase:       "images",
			CurrentItem: r.FileName,
		})
	}

	log.Printf("Image migration complete: %d processed, %d copied, %d failed",
		m.stats.ImagesProcessed, m.stats.ImagesCopied, m.stats.ImagesFailed)
	return nil
}

// verifyDataIntegrity verifies that all data was migrated correctly
func (m *ReceiptMigrator) verifyDataIntegrity(ctx context.Context) error {
	log.Println("Verifying data integrity...")

	// Count receipts in target
	targetReceiptCount, err := m.targetClient.Receipt.Query().Count(ctx)
	if err != nil {
		return fmt.Errorf("failed to count target receipts: %w", err)
	}

	// Count receipts in legacy (that should have been migrated)
	legacyReceiptCount, err := m.countLegacyReceipts(ctx)
	if err != nil {
		return fmt.Errorf("failed to count legacy receipts: %w", err)
	}

	log.Printf("Legacy receipts: %d, Target receipts: %d", legacyReceiptCount, targetReceiptCount)

	// Verify that all transactions reference valid receipts
	orphanedTxCount, err := m.targetClient.Transaction.Query().
		Where(transaction.Not(transaction.HasReceipt())).
		Count(ctx)
	if err != nil {
		log.Printf("Warning: could not check for orphaned transactions: %v", err)
	} else if orphanedTxCount > 0 {
		log.Printf("Warning: found %d orphaned transactions", orphanedTxCount)
	}

	// Verify that all line items reference valid receipts
	orphanedItemCount, err := m.targetClient.LineItem.Query().
		Where(lineitem.Not(lineitem.HasReceipt())).
		Count(ctx)
	if err != nil {
		log.Printf("Warning: could not check for orphaned line items: %v", err)
	} else if orphanedItemCount > 0 {
		log.Printf("Warning: found %d orphaned line items", orphanedItemCount)
	}

	log.Println("Data integrity verification complete")
	return nil
}

// fetchLegacyReceipts fetches receipts from the legacy database with pagination
func (m *ReceiptMigrator) fetchLegacyReceipts(ctx context.Context, offset, limit int) ([]LegacyReceipt, error) {
	query := `
		SELECT
			id, user_id, source_type, source_id, source_connection_id,
			file_name, file_path, mime_type, file_size,
			storage_bucket, storage_key, thumbnail_path,
			status, ocr_completed, ocr_text, ocr_confidence,
			merchant_name, merchant_address, receipt_date,
			total_amount, tax_amount, subtotal_amount, currency,
			payment_method, receipt_number, category_tags,
			extracted_data, metadata, notes,
			created_at, updated_at, processed_at
		FROM receipts
		ORDER BY id
		LIMIT $1 OFFSET $2
	`

	rows, err := m.legacyDB.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var receipts []LegacyReceipt
	for rows.Next() {
		var r LegacyReceipt
		var categoryTagsJSON, extractedDataJSON, metadataJSON sql.NullString

		if err := rows.Scan(
			&r.ID, &r.UserID, &r.SourceType, &r.SourceID, &r.SourceConnectionID,
			&r.FileName, &r.FilePath, &r.MimeType, &r.FileSize,
			&r.StorageBucket, &r.StorageKey, &r.ThumbnailPath,
			&r.Status, &r.OcrCompleted, &r.OcrText, &r.OcrConfidence,
			&r.MerchantName, &r.MerchantAddress, &r.ReceiptDate,
			&r.TotalAmount, &r.TaxAmount, &r.SubtotalAmount, &r.Currency,
			&r.PaymentMethod, &r.ReceiptNumber, &categoryTagsJSON,
			&extractedDataJSON, &metadataJSON, &r.Notes,
			&r.CreatedAt, &r.UpdatedAt, &r.ProcessedAt,
		); err != nil {
			return nil, err
		}

		// Parse JSON fields
		if categoryTagsJSON.Valid {
			_ = json.Unmarshal([]byte(categoryTagsJSON.String), &r.CategoryTags)
		}
		if extractedDataJSON.Valid {
			_ = json.Unmarshal([]byte(extractedDataJSON.String), &r.ExtractedData)
		}
		if metadataJSON.Valid {
			_ = json.Unmarshal([]byte(metadataJSON.String), &r.Metadata)
		}

		receipts = append(receipts, r)
	}

	return receipts, rows.Err()
}

// fetchLegacyTransactions fetches transactions from the legacy database with pagination
func (m *ReceiptMigrator) fetchLegacyTransactions(ctx context.Context, offset, limit int) ([]LegacyTransaction, error) {
	query := `
		SELECT
			id, receipt_id, user_id, type, amount, currency,
			transaction_date, description, merchant_name, merchant_category,
			payment_method, card_last_four, reference_number, authorization_code,
			status, is_recurring, recurrence_pattern, category_tags,
			metadata, notes, created_at, updated_at
		FROM transactions
		ORDER BY id
		LIMIT $1 OFFSET $2
	`

	rows, err := m.legacyDB.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []LegacyTransaction
	for rows.Next() {
		var tx LegacyTransaction
		var categoryTagsJSON, metadataJSON sql.NullString

		if err := rows.Scan(
			&tx.ID, &tx.ReceiptID, &tx.UserID, &tx.Type, &tx.Amount, &tx.Currency,
			&tx.TransactionDate, &tx.Description, &tx.MerchantName, &tx.MerchantCategory,
			&tx.PaymentMethod, &tx.CardLastFour, &tx.ReferenceNumber, &tx.AuthorizationCode,
			&tx.Status, &tx.IsRecurring, &tx.RecurrencePattern, &categoryTagsJSON,
			&metadataJSON, &tx.Notes, &tx.CreatedAt, &tx.UpdatedAt,
		); err != nil {
			return nil, err
		}

		// Parse JSON fields
		if categoryTagsJSON.Valid {
			_ = json.Unmarshal([]byte(categoryTagsJSON.String), &tx.CategoryTags)
		}
		if metadataJSON.Valid {
			_ = json.Unmarshal([]byte(metadataJSON.String), &tx.Metadata)
		}

		transactions = append(transactions, tx)
	}

	return transactions, rows.Err()
}

// fetchLegacyLineItems fetches line items from the legacy database with pagination
func (m *ReceiptMigrator) fetchLegacyLineItems(ctx context.Context, offset, limit int) ([]LegacyLineItem, error) {
	query := `
		SELECT
			id, receipt_id, line_number, description, sku, product_code,
			quantity, unit, unit_price, total_price,
			discount_amount, discount_description, tax_amount, tax_rate,
			is_taxable, category, tags, metadata,
			created_at, updated_at
		FROM line_items
		ORDER BY id
		LIMIT $1 OFFSET $2
	`

	rows, err := m.legacyDB.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var lineItems []LegacyLineItem
	for rows.Next() {
		var item LegacyLineItem
		var tagsJSON, metadataJSON sql.NullString

		if err := rows.Scan(
			&item.ID, &item.ReceiptID, &item.LineNumber, &item.Description, &item.SKU, &item.ProductCode,
			&item.Quantity, &item.Unit, &item.UnitPrice, &item.TotalPrice,
			&item.DiscountAmount, &item.DiscountDescription, &item.TaxAmount, &item.TaxRate,
			&item.IsTaxable, &item.Category, &tagsJSON, &metadataJSON,
			&item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}

		// Parse JSON fields
		if tagsJSON.Valid {
			_ = json.Unmarshal([]byte(tagsJSON.String), &item.Tags)
		}
		if metadataJSON.Valid {
			_ = json.Unmarshal([]byte(metadataJSON.String), &item.Metadata)
		}

		lineItems = append(lineItems, item)
	}

	return lineItems, rows.Err()
}

// reportProgress sends a progress update through the callback if configured
func (m *ReceiptMigrator) reportProgress(progress ReceiptMigrationProgress) {
	progress.Errors = len(m.stats.Errors)
	if m.progressCb != nil {
		m.progressCb(progress)
	}
}

// GetStats returns the current migration statistics
func (m *ReceiptMigrator) GetStats() *ReceiptMigrationStats {
	return m.stats
}

// GetReceiptIDMap returns the mapping of legacy receipt IDs to new receipt IDs
func (m *ReceiptMigrator) GetReceiptIDMap() map[string]string {
	return m.receiptIDMap
}

// PrintSummary prints the migration statistics
func (m *ReceiptMigrator) PrintSummary() {
	fmt.Println("\n=== Receipt Migration Summary ===")
	fmt.Printf("Receipts processed:        %d\n", m.stats.ReceiptsProcessed)
	fmt.Printf("Receipts created:          %d\n", m.stats.ReceiptsCreated)
	fmt.Printf("Receipts skipped:          %d\n", m.stats.ReceiptsSkipped)
	fmt.Printf("Transactions processed:    %d\n", m.stats.TransactionsProcessed)
	fmt.Printf("Transactions created:      %d\n", m.stats.TransactionsCreated)
	fmt.Printf("Line items processed:      %d\n", m.stats.LineItemsProcessed)
	fmt.Printf("Line items created:        %d\n", m.stats.LineItemsCreated)
	fmt.Printf("Images processed:          %d\n", m.stats.ImagesProcessed)
	fmt.Printf("Images copied:             %d\n", m.stats.ImagesCopied)
	fmt.Printf("Images failed:             %d\n", m.stats.ImagesFailed)

	if len(m.stats.Errors) > 0 {
		fmt.Printf("\nErrors encountered: %d\n", len(m.stats.Errors))
		for i, err := range m.stats.Errors {
			if i >= 10 {
				fmt.Printf("  ... and %d more errors\n", len(m.stats.Errors)-10)
				break
			}
			fmt.Printf("  - %s\n", err)
		}
	}

	if m.dryRun {
		fmt.Println("\n[DRY RUN] No changes were made to the target database")
	}
}

// mapReceiptSourceType maps legacy source type to the new enum
func mapReceiptSourceType(legacyType string) receipt.SourceType {
	switch legacyType {
	case "email":
		return receipt.SourceTypeEmail
	case "drive":
		return receipt.SourceTypeDrive
	case "upload":
		return receipt.SourceTypeUpload
	case "scan":
		return receipt.SourceTypeScan
	default:
		return receipt.SourceTypeUpload
	}
}

// mapReceiptStatus maps legacy status to the new enum
func mapReceiptStatus(legacyStatus string) receipt.Status {
	switch legacyStatus {
	case "pending":
		return receipt.StatusPending
	case "processing":
		return receipt.StatusProcessing
	case "processed":
		return receipt.StatusProcessed
	case "failed":
		return receipt.StatusFailed
	case "archived":
		return receipt.StatusArchived
	default:
		return receipt.StatusPending
	}
}

// mapTransactionType maps legacy transaction type to the new enum
func mapTransactionType(legacyType string) transaction.Type {
	switch legacyType {
	case "purchase":
		return transaction.TypePurchase
	case "refund":
		return transaction.TypeRefund
	case "payment":
		return transaction.TypePayment
	case "withdrawal":
		return transaction.TypeWithdrawal
	case "deposit":
		return transaction.TypeDeposit
	case "transfer":
		return transaction.TypeTransfer
	case "other":
		return transaction.TypeOther
	default:
		return transaction.TypePurchase
	}
}

// mapTransactionStatus maps legacy transaction status to the new enum
func mapTransactionStatus(legacyStatus string) transaction.Status {
	switch legacyStatus {
	case "pending":
		return transaction.StatusPending
	case "completed":
		return transaction.StatusCompleted
	case "failed":
		return transaction.StatusFailed
	case "refunded":
		return transaction.StatusRefunded
	case "disputed":
		return transaction.StatusDisputed
	case "cancelled":
		return transaction.StatusCancelled
	default:
		return transaction.StatusCompleted
	}
}

// copyFile copies a file from src to dst
func copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return fmt.Errorf("failed to open source file: %w", err)
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return fmt.Errorf("failed to create destination file: %w", err)
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	if err != nil {
		return fmt.Errorf("failed to copy file: %w", err)
	}

	return destFile.Sync()
}
