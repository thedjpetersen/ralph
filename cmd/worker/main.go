package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"clockzen-next/internal/application/integration"
	"clockzen-next/internal/ent"
	"clockzen-next/internal/infrastructure/google"
	"clockzen-next/internal/infrastructure/worker"

	_ "github.com/lib/pq"
)

func main() {
	// Get configuration from environment
	port := getEnv("PORT", "8081")
	dbURL := getEnv("DATABASE_URL", "")

	if dbURL == "" {
		log.Fatal("DATABASE_URL is required for worker")
	}

	// Connect to database
	entClient, err := ent.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer entClient.Close()

	// Run migrations
	ctx := context.Background()
	if err := entClient.Schema.Create(ctx); err != nil {
		log.Printf("Warning: Failed to run migrations: %v", err)
	} else {
		log.Println("Database migrations completed")
	}

	// Configure OAuth (from environment)
	oauthConfig := &google.Config{
		ClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		ClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		RedirectURL:  getEnv("GOOGLE_REDIRECT_URL", ""),
	}

	// Create sync services with default configuration
	emailSyncService := integration.NewEmailSyncServiceWithDefaults(entClient, oauthConfig)
	driveSyncService := integration.NewDriveSyncServiceWithDefaults(entClient, oauthConfig)

	// Create workers with default configuration
	emailWorker := worker.NewEmailImportWorkerWithDefaults(entClient, oauthConfig, emailSyncService)
	driveWorker := worker.NewDriveSyncWorkerWithDefaults(entClient, oauthConfig, driveSyncService)

	// Start workers
	if err := emailWorker.Start(ctx); err != nil {
		log.Fatalf("Failed to start email worker: %v", err)
	}
	log.Println("Email import worker started")

	if err := driveWorker.Start(ctx); err != nil {
		log.Fatalf("Failed to start drive worker: %v", err)
	}
	log.Println("Drive sync worker started")

	// Create HTTP server for health checks
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		// Check if workers are running
		status := "healthy"
		if !emailWorker.IsRunning() || !driveWorker.IsRunning() {
			status = "unhealthy"
			w.WriteHeader(http.StatusServiceUnavailable)
		} else {
			w.WriteHeader(http.StatusOK)
		}

		response := map[string]any{
			"status":  status,
			"service": "clockzen-worker",
			"workers": map[string]any{
				"email": map[string]any{
					"running":      emailWorker.IsRunning(),
					"queued_tasks": emailWorker.QueuedTaskCount(),
					"ocr_queued":   emailWorker.QueuedOCRTaskCount(),
				},
				"drive": map[string]any{
					"running":      driveWorker.IsRunning(),
					"queued_tasks": driveWorker.QueuedTaskCount(),
					"ocr_queued":   driveWorker.QueuedOCRTaskCount(),
				},
			},
		}
		json.NewEncoder(w).Encode(response)
	})

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start health check server in goroutine
	go func() {
		log.Printf("Starting worker health check server on port %s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start health check server: %v", err)
		}
	}()

	// Wait for interrupt signal for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down worker...")

	// Stop workers gracefully
	if err := emailWorker.Stop(); err != nil {
		log.Printf("Error stopping email worker: %v", err)
	}
	if err := driveWorker.Stop(); err != nil {
		log.Printf("Error stopping drive worker: %v", err)
	}

	// Shutdown health check server
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Worker exited gracefully")
}

// getEnv returns the value of an environment variable or a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
