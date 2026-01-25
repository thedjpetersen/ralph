package integration

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"

	"clockzen-next/internal/ent"

	_ "github.com/lib/pq"
)

func init() {
	// Disable Ryuk (resource reaper) to avoid authentication issues
	os.Setenv("TESTCONTAINERS_RYUK_DISABLED", "true")
}

// TestDatabase holds the test database container and client
type TestDatabase struct {
	Container testcontainers.Container
	Client    *ent.Client
	DSN       string
}

// SetupTestDatabase creates a PostgreSQL container for testing
func SetupTestDatabase(t *testing.T) *TestDatabase {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	// Start PostgreSQL container with simplified configuration
	pgContainer, err := postgres.Run(ctx,
		"postgres:15-alpine",
		postgres.WithDatabase("testdb"),
		postgres.WithUsername("testuser"),
		postgres.WithPassword("testpass"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(60*time.Second),
		),
	)
	if err != nil {
		t.Fatalf("failed to start postgres container: %v", err)
	}

	// Get the connection string
	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		pgContainer.Terminate(context.Background())
		t.Fatalf("failed to get connection string: %v", err)
	}

	// Create ent client
	client, err := ent.Open("postgres", connStr)
	if err != nil {
		pgContainer.Terminate(context.Background())
		t.Fatalf("failed to create ent client: %v", err)
	}

	// Run migrations
	if err := client.Schema.Create(ctx); err != nil {
		client.Close()
		pgContainer.Terminate(context.Background())
		t.Fatalf("failed to run migrations: %v", err)
	}

	return &TestDatabase{
		Container: pgContainer,
		Client:    client,
		DSN:       connStr,
	}
}

// Cleanup terminates the container and closes connections
func (td *TestDatabase) Cleanup(t *testing.T) {
	t.Helper()

	ctx := context.Background()

	if td.Client != nil {
		if err := td.Client.Close(); err != nil {
			t.Logf("failed to close ent client: %v", err)
		}
	}

	if td.Container != nil {
		if err := td.Container.Terminate(ctx); err != nil {
			t.Logf("failed to terminate postgres container: %v", err)
		}
	}
}

// MustGetHost returns the container host or fails the test
func (td *TestDatabase) MustGetHost(t *testing.T) string {
	t.Helper()

	host, err := td.Container.Host(context.Background())
	if err != nil {
		t.Fatalf("failed to get container host: %v", err)
	}
	return host
}

// MustGetPort returns the mapped port or fails the test
func (td *TestDatabase) MustGetPort(t *testing.T) string {
	t.Helper()

	port, err := td.Container.MappedPort(context.Background(), "5432")
	if err != nil {
		t.Fatalf("failed to get mapped port: %v", err)
	}
	return port.Port()
}

// FormatDSN creates a DSN from individual components
func FormatDSN(host, port, user, password, database string) string {
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		user, password, host, port, database)
}
