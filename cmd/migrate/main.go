package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"clockzen-next/internal/ent"
	"clockzen-next/internal/ent/emailconnection"
	"clockzen-next/internal/ent/googledriveconnection"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

// LegacyUser represents a user from the legacy database schema
type LegacyUser struct {
	ID        string
	Email     string
	Name      string
	CreatedAt time.Time
	UpdatedAt time.Time
}

// LegacyAccount represents an account from the legacy database schema
type LegacyAccount struct {
	ID              string
	UserID          string
	Provider        string // gmail, outlook, imap, google_drive
	ProviderID      string
	Email           string
	AccessToken     string
	RefreshToken    string
	TokenExpiry     time.Time
	Status          string
	CreatedAt       time.Time
	UpdatedAt       time.Time
	LastSyncAt      *time.Time
	GoogleAccountID string // For drive connections
}

// MigrationStats tracks migration progress
type MigrationStats struct {
	UsersProcessed            int
	AccountsProcessed         int
	EmailConnectionsCreated   int
	DriveConnectionsCreated   int
	Errors                    []string
}

func main() {
	// Command line flags
	legacyDSN := flag.String("legacy-db", "", "Legacy database connection string (required)")
	targetDSN := flag.String("target-db", "", "Target database connection string (required)")
	dryRun := flag.Bool("dry-run", false, "Perform a dry run without writing to target database")
	batchSize := flag.Int("batch-size", 100, "Number of records to process per batch")
	verbose := flag.Bool("verbose", false, "Enable verbose logging")

	flag.Parse()

	if *legacyDSN == "" || *targetDSN == "" {
		fmt.Println("Usage: migrate -legacy-db <dsn> -target-db <dsn> [-dry-run] [-batch-size N] [-verbose]")
		fmt.Println("\nRequired flags:")
		fmt.Println("  -legacy-db    Legacy database connection string")
		fmt.Println("  -target-db    Target database connection string")
		fmt.Println("\nOptional flags:")
		fmt.Println("  -dry-run      Perform a dry run without writing to target database")
		fmt.Println("  -batch-size   Number of records to process per batch (default: 100)")
		fmt.Println("  -verbose      Enable verbose logging")
		os.Exit(1)
	}

	ctx := context.Background()

	// Connect to legacy database
	legacyDB, err := sql.Open("postgres", *legacyDSN)
	if err != nil {
		log.Fatalf("Failed to connect to legacy database: %v", err)
	}
	defer legacyDB.Close()

	if err := legacyDB.PingContext(ctx); err != nil {
		log.Fatalf("Failed to ping legacy database: %v", err)
	}
	log.Println("Connected to legacy database")

	// Connect to target database using ent
	targetClient, err := ent.Open("postgres", *targetDSN)
	if err != nil {
		log.Fatalf("Failed to connect to target database: %v", err)
	}
	defer targetClient.Close()

	// Run ent migrations on target database
	if !*dryRun {
		if err := targetClient.Schema.Create(ctx); err != nil {
			log.Fatalf("Failed to run migrations on target database: %v", err)
		}
		log.Println("Target database schema ready")
	}

	// Create migrator
	migrator := &Migrator{
		legacyDB:     legacyDB,
		targetClient: targetClient,
		batchSize:    *batchSize,
		dryRun:       *dryRun,
		verbose:      *verbose,
		stats:        &MigrationStats{},
	}

	// Run migration
	if err := migrator.Run(ctx); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	// Print summary
	migrator.PrintSummary()
}

// Migrator handles the data migration process
type Migrator struct {
	legacyDB     *sql.DB
	targetClient *ent.Client
	batchSize    int
	dryRun       bool
	verbose      bool
	stats        *MigrationStats
	userIDMap    map[string]string // Maps legacy user IDs to new user IDs
}

// Run executes the full migration
func (m *Migrator) Run(ctx context.Context) error {
	m.userIDMap = make(map[string]string)

	log.Println("Starting migration...")

	// Step 1: Migrate users
	if err := m.migrateUsers(ctx); err != nil {
		return fmt.Errorf("user migration failed: %w", err)
	}

	// Step 2: Migrate accounts (email and drive connections)
	if err := m.migrateAccounts(ctx); err != nil {
		return fmt.Errorf("account migration failed: %w", err)
	}

	log.Println("Migration completed successfully")
	return nil
}

// migrateUsers migrates users from the legacy database
func (m *Migrator) migrateUsers(ctx context.Context) error {
	log.Println("Migrating users...")

	offset := 0
	for {
		users, err := m.fetchLegacyUsers(ctx, offset, m.batchSize)
		if err != nil {
			return fmt.Errorf("failed to fetch legacy users: %w", err)
		}

		if len(users) == 0 {
			break
		}

		for _, user := range users {
			if m.verbose {
				log.Printf("Processing user: %s (%s)", user.ID, user.Email)
			}

			// Map legacy user ID to a new UUID if needed
			newUserID := uuid.New().String()
			m.userIDMap[user.ID] = newUserID
			m.stats.UsersProcessed++
		}

		offset += len(users)
		log.Printf("Processed %d users...", offset)
	}

	log.Printf("User migration complete: %d users processed", m.stats.UsersProcessed)
	return nil
}

// migrateAccounts migrates accounts from the legacy database to new email/drive connections
func (m *Migrator) migrateAccounts(ctx context.Context) error {
	log.Println("Migrating accounts...")

	offset := 0
	for {
		accounts, err := m.fetchLegacyAccounts(ctx, offset, m.batchSize)
		if err != nil {
			return fmt.Errorf("failed to fetch legacy accounts: %w", err)
		}

		if len(accounts) == 0 {
			break
		}

		for _, account := range accounts {
			if err := m.migrateAccount(ctx, account); err != nil {
				errMsg := fmt.Sprintf("Failed to migrate account %s: %v", account.ID, err)
				m.stats.Errors = append(m.stats.Errors, errMsg)
				if m.verbose {
					log.Println(errMsg)
				}
				continue
			}
			m.stats.AccountsProcessed++
		}

		offset += len(accounts)
		log.Printf("Processed %d accounts...", offset)
	}

	log.Printf("Account migration complete: %d accounts processed", m.stats.AccountsProcessed)
	return nil
}

// migrateAccount migrates a single account to the appropriate new entity
func (m *Migrator) migrateAccount(ctx context.Context, account LegacyAccount) error {
	// Get the new user ID from the mapping
	newUserID, ok := m.userIDMap[account.UserID]
	if !ok {
		return fmt.Errorf("user ID %s not found in mapping", account.UserID)
	}

	if m.verbose {
		log.Printf("Migrating account: %s (provider: %s)", account.ID, account.Provider)
	}

	if m.dryRun {
		return nil
	}

	switch account.Provider {
	case "gmail", "outlook", "imap":
		return m.createEmailConnection(ctx, account, newUserID)
	case "google_drive":
		return m.createDriveConnection(ctx, account, newUserID)
	default:
		return fmt.Errorf("unknown provider: %s", account.Provider)
	}
}

// createEmailConnection creates a new EmailConnection from a legacy account
func (m *Migrator) createEmailConnection(ctx context.Context, account LegacyAccount, userID string) error {
	// Map legacy status to new enum values
	status := mapStatus(account.Status)

	// Map provider to enum
	provider := mapEmailProvider(account.Provider)

	// Check if connection already exists
	exists, err := m.targetClient.EmailConnection.Query().
		Where(emailconnection.ProviderAccountID(account.ProviderID)).
		Exist(ctx)
	if err != nil {
		return fmt.Errorf("failed to check existing connection: %w", err)
	}
	if exists {
		if m.verbose {
			log.Printf("EmailConnection for provider account %s already exists, skipping", account.ProviderID)
		}
		return nil
	}

	// Create the email connection
	create := m.targetClient.EmailConnection.Create().
		SetID(uuid.New().String()).
		SetUserID(userID).
		SetProviderAccountID(account.ProviderID).
		SetEmail(account.Email).
		SetProvider(provider).
		SetAccessToken(account.AccessToken).
		SetRefreshToken(account.RefreshToken).
		SetTokenExpiry(account.TokenExpiry).
		SetStatus(status).
		SetCreatedAt(account.CreatedAt).
		SetUpdatedAt(account.UpdatedAt)

	if account.LastSyncAt != nil {
		create.SetLastSyncAt(*account.LastSyncAt)
	}

	_, err = create.Save(ctx)
	if err != nil {
		return fmt.Errorf("failed to create email connection: %w", err)
	}

	m.stats.EmailConnectionsCreated++
	return nil
}

// createDriveConnection creates a new GoogleDriveConnection from a legacy account
func (m *Migrator) createDriveConnection(ctx context.Context, account LegacyAccount, userID string) error {
	// Map legacy status to new enum values
	status := mapDriveStatus(account.Status)

	// Use GoogleAccountID if available, otherwise use ProviderID
	googleAccountID := account.GoogleAccountID
	if googleAccountID == "" {
		googleAccountID = account.ProviderID
	}

	// Check if connection already exists
	exists, err := m.targetClient.GoogleDriveConnection.Query().
		Where(googledriveconnection.GoogleAccountID(googleAccountID)).
		Exist(ctx)
	if err != nil {
		return fmt.Errorf("failed to check existing connection: %w", err)
	}
	if exists {
		if m.verbose {
			log.Printf("GoogleDriveConnection for account %s already exists, skipping", googleAccountID)
		}
		return nil
	}

	// Create the drive connection
	create := m.targetClient.GoogleDriveConnection.Create().
		SetID(uuid.New().String()).
		SetUserID(userID).
		SetGoogleAccountID(googleAccountID).
		SetEmail(account.Email).
		SetAccessToken(account.AccessToken).
		SetRefreshToken(account.RefreshToken).
		SetTokenExpiry(account.TokenExpiry).
		SetStatus(status).
		SetCreatedAt(account.CreatedAt).
		SetUpdatedAt(account.UpdatedAt)

	if account.LastSyncAt != nil {
		create.SetLastSyncAt(*account.LastSyncAt)
	}

	_, err = create.Save(ctx)
	if err != nil {
		return fmt.Errorf("failed to create drive connection: %w", err)
	}

	m.stats.DriveConnectionsCreated++
	return nil
}

// fetchLegacyUsers fetches users from the legacy database with pagination
func (m *Migrator) fetchLegacyUsers(ctx context.Context, offset, limit int) ([]LegacyUser, error) {
	query := `
		SELECT id, email, COALESCE(name, ''), created_at, updated_at
		FROM users
		ORDER BY id
		LIMIT $1 OFFSET $2
	`

	rows, err := m.legacyDB.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []LegacyUser
	for rows.Next() {
		var user LegacyUser
		if err := rows.Scan(&user.ID, &user.Email, &user.Name, &user.CreatedAt, &user.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	return users, rows.Err()
}

// fetchLegacyAccounts fetches accounts from the legacy database with pagination
func (m *Migrator) fetchLegacyAccounts(ctx context.Context, offset, limit int) ([]LegacyAccount, error) {
	query := `
		SELECT
			id,
			user_id,
			provider,
			provider_id,
			email,
			access_token,
			refresh_token,
			token_expiry,
			COALESCE(status, 'active'),
			created_at,
			updated_at,
			last_sync_at,
			COALESCE(google_account_id, '')
		FROM accounts
		ORDER BY id
		LIMIT $1 OFFSET $2
	`

	rows, err := m.legacyDB.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accounts []LegacyAccount
	for rows.Next() {
		var account LegacyAccount
		if err := rows.Scan(
			&account.ID,
			&account.UserID,
			&account.Provider,
			&account.ProviderID,
			&account.Email,
			&account.AccessToken,
			&account.RefreshToken,
			&account.TokenExpiry,
			&account.Status,
			&account.CreatedAt,
			&account.UpdatedAt,
			&account.LastSyncAt,
			&account.GoogleAccountID,
		); err != nil {
			return nil, err
		}
		accounts = append(accounts, account)
	}

	return accounts, rows.Err()
}

// mapStatus maps legacy status strings to EmailConnection status enum values
func mapStatus(legacyStatus string) emailconnection.Status {
	switch legacyStatus {
	case "active":
		return emailconnection.StatusActive
	case "inactive":
		return emailconnection.StatusInactive
	case "revoked":
		return emailconnection.StatusRevoked
	case "expired":
		return emailconnection.StatusExpired
	default:
		return emailconnection.StatusActive
	}
}

// mapDriveStatus maps legacy status strings to GoogleDriveConnection status enum values
func mapDriveStatus(legacyStatus string) googledriveconnection.Status {
	switch legacyStatus {
	case "active":
		return googledriveconnection.StatusActive
	case "inactive":
		return googledriveconnection.StatusInactive
	case "revoked":
		return googledriveconnection.StatusRevoked
	case "expired":
		return googledriveconnection.StatusExpired
	default:
		return googledriveconnection.StatusActive
	}
}

// mapEmailProvider maps legacy provider strings to EmailConnection provider enum values
func mapEmailProvider(legacyProvider string) emailconnection.Provider {
	switch legacyProvider {
	case "gmail":
		return emailconnection.ProviderGmail
	case "outlook":
		return emailconnection.ProviderOutlook
	case "imap":
		return emailconnection.ProviderImap
	default:
		return emailconnection.ProviderGmail
	}
}

// PrintSummary prints the migration statistics
func (m *Migrator) PrintSummary() {
	fmt.Println("\n=== Migration Summary ===")
	fmt.Printf("Users processed:              %d\n", m.stats.UsersProcessed)
	fmt.Printf("Accounts processed:           %d\n", m.stats.AccountsProcessed)
	fmt.Printf("Email connections created:    %d\n", m.stats.EmailConnectionsCreated)
	fmt.Printf("Drive connections created:    %d\n", m.stats.DriveConnectionsCreated)

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
