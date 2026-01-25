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

	"clockzen-next/internal/ent"
	"clockzen-next/internal/infrastructure/google"
	"clockzen-next/internal/presentation/http/handlers/integration"
	"clockzen-next/internal/presentation/http/handlers/retirement"
	"clockzen-next/internal/presentation/http/handlers/rules"

	_ "github.com/lib/pq"
)

func main() {
	// Get configuration from environment
	port := getEnv("PORT", "8080")
	dbURL := getEnv("DATABASE_URL", "")

	// Create HTTP server mux
	mux := http.NewServeMux()

	// Register health check endpoints first (using traditional pattern)
	mux.HandleFunc("/health", handleHealth)
	mux.HandleFunc("/api/health", handleHealth)

	// Register retirement routes (doesn't require DB)
	retirementRouter := retirement.NewDefaultRouter()
	retirementRouter.RegisterRoutes(mux)

	// Register rules routes (doesn't require DB)
	rulesRouter := rules.NewDefaultRouter()
	rulesRouter.RegisterRoutes(mux)

	// Register integration routes if database is configured
	if dbURL != "" {
		entClient, err := ent.Open("postgres", dbURL)
		if err != nil {
			log.Printf("Warning: Failed to connect to database: %v", err)
			log.Println("Integration routes will not be available")
		} else {
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

			// Register integration routes
			integrationRouter := integration.NewDefaultRouter(entClient, oauthConfig)
			integrationRouter.RegisterRoutes(mux)
			log.Println("Integration routes registered")
		}
	} else {
		log.Println("DATABASE_URL not set, integration routes disabled")
	}

	// Create HTTP server
	server := &http.Server{
		Addr:         ":" + port,
		Handler:      corsMiddleware(loggingMiddleware(mux)),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Printf("Starting API server on port %s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Create context with timeout for shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited gracefully")
}

// handleHealth returns health check status
func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	response := map[string]string{
		"status":  "healthy",
		"service": "clockzen-api",
	}
	json.NewEncoder(w).Encode(response)
}

// loggingMiddleware logs incoming requests
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
	})
}

// corsMiddleware adds CORS headers
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get allowed origin from environment or default to *
		allowedOrigin := getEnv("CORS_ORIGIN", "*")

		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Handle preflight requests
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// getEnv returns the value of an environment variable or a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
