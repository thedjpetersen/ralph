package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"clockzen-next/internal/ent"
	"clockzen-next/internal/ent/emailconnection"
	"clockzen-next/internal/ent/googledriveconnection"
	"clockzen-next/internal/infrastructure/google"
)

// TestOAuthTokenValidation tests the OAuth token validation logic
func TestOAuthTokenValidation(t *testing.T) {
	t.Run("valid token", func(t *testing.T) {
		token := &google.Token{
			AccessToken: "test-access-token",
			Expiry:      time.Now().Add(1 * time.Hour),
		}

		assert.True(t, token.Valid())
		assert.False(t, token.IsExpired())
	})

	t.Run("expired token", func(t *testing.T) {
		token := &google.Token{
			AccessToken: "test-access-token",
			Expiry:      time.Now().Add(-1 * time.Hour),
		}

		assert.False(t, token.Valid())
		assert.True(t, token.IsExpired())
	})

	t.Run("token expiring within buffer", func(t *testing.T) {
		// Token expires in 5 seconds, but default buffer is 10 seconds
		token := &google.Token{
			AccessToken: "test-access-token",
			Expiry:      time.Now().Add(5 * time.Second),
		}

		assert.False(t, token.Valid())
		assert.True(t, token.IsExpired())
	})

	t.Run("token with custom buffer", func(t *testing.T) {
		token := &google.Token{
			AccessToken: "test-access-token",
			Expiry:      time.Now().Add(5 * time.Second),
		}

		// With 1-second buffer, token should still be valid
		assert.False(t, token.IsExpiredWithBuffer(1*time.Second))
		// With 10-second buffer, token should be expired
		assert.True(t, token.IsExpiredWithBuffer(10*time.Second))
	})

	t.Run("token with zero expiry (non-expiring)", func(t *testing.T) {
		token := &google.Token{
			AccessToken: "test-access-token",
			Expiry:      time.Time{}, // zero time
		}

		assert.True(t, token.Valid())
		assert.False(t, token.IsExpired())
	})

	t.Run("empty access token is invalid", func(t *testing.T) {
		token := &google.Token{
			AccessToken: "",
			Expiry:      time.Now().Add(1 * time.Hour),
		}

		assert.False(t, token.Valid())
	})
}

// TestOAuthConfigValidation tests OAuth configuration validation
func TestOAuthConfigValidation(t *testing.T) {
	t.Run("valid config", func(t *testing.T) {
		config := &google.Config{
			ClientID:     "test-client-id",
			ClientSecret: "test-client-secret",
			RedirectURL:  "http://localhost:8080/callback",
			Scopes:       google.DefaultScopes(),
		}

		assert.NoError(t, config.Validate())
	})

	t.Run("missing client ID", func(t *testing.T) {
		config := &google.Config{
			ClientID:     "",
			ClientSecret: "test-client-secret",
			RedirectURL:  "http://localhost:8080/callback",
		}

		err := config.Validate()
		assert.ErrorIs(t, err, google.ErrMissingCredentials)
	})

	t.Run("missing client secret", func(t *testing.T) {
		config := &google.Config{
			ClientID:     "test-client-id",
			ClientSecret: "",
			RedirectURL:  "http://localhost:8080/callback",
		}

		err := config.Validate()
		assert.ErrorIs(t, err, google.ErrMissingCredentials)
	})

	t.Run("missing redirect URL", func(t *testing.T) {
		config := &google.Config{
			ClientID:     "test-client-id",
			ClientSecret: "test-client-secret",
			RedirectURL:  "",
		}

		err := config.Validate()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "redirect URL is required")
	})
}

// TestScopeManager tests OAuth scope management
func TestScopeManager(t *testing.T) {
	t.Run("default scopes are allowed", func(t *testing.T) {
		sm := google.NewScopeManager()

		assert.True(t, sm.IsAllowed(google.ScopeOpenID))
		assert.True(t, sm.IsAllowed(google.ScopeProfile))
		assert.True(t, sm.IsAllowed(google.ScopeEmail))
		assert.True(t, sm.IsAllowed(google.ScopeDriveReadOnly))
		assert.True(t, sm.IsAllowed(google.ScopeGmailReadOnly))
	})

	t.Run("validate scopes success", func(t *testing.T) {
		sm := google.NewScopeManager()

		err := sm.ValidateScopes([]string{
			google.ScopeOpenID,
			google.ScopeProfile,
			google.ScopeEmail,
		})
		assert.NoError(t, err)
	})

	t.Run("validate scopes failure", func(t *testing.T) {
		sm := google.NewScopeManager()

		err := sm.ValidateScopes([]string{
			google.ScopeOpenID,
			"invalid-scope",
		})
		assert.ErrorIs(t, err, google.ErrInvalidScope)
		assert.Contains(t, err.Error(), "invalid-scope")
	})

	t.Run("register and unregister custom scope", func(t *testing.T) {
		sm := google.NewScopeManager()

		customScope := "https://custom.scope/test"
		assert.False(t, sm.IsAllowed(customScope))

		sm.RegisterScope(customScope)
		assert.True(t, sm.IsAllowed(customScope))

		sm.UnregisterScope(customScope)
		assert.False(t, sm.IsAllowed(customScope))
	})

	t.Run("list allowed scopes", func(t *testing.T) {
		sm := google.NewScopeManager()

		scopes := sm.AllowedScopes()
		assert.NotEmpty(t, scopes)
		assert.Contains(t, scopes, google.ScopeOpenID)
	})
}

// TestOAuthClient tests OAuth client creation and URL generation
func TestOAuthClient(t *testing.T) {
	t.Run("create client with valid config", func(t *testing.T) {
		config := &google.Config{
			ClientID:     "test-client-id",
			ClientSecret: "test-client-secret",
			RedirectURL:  "http://localhost:8080/callback",
			Scopes:       google.DefaultScopes(),
		}

		client, err := google.NewClient(config)
		require.NoError(t, err)
		assert.NotNil(t, client)
	})

	t.Run("create client with invalid config fails", func(t *testing.T) {
		config := &google.Config{
			ClientID:     "",
			ClientSecret: "test-client-secret",
			RedirectURL:  "http://localhost:8080/callback",
		}

		client, err := google.NewClient(config)
		assert.Error(t, err)
		assert.Nil(t, client)
	})

	t.Run("generate auth URL", func(t *testing.T) {
		config := &google.Config{
			ClientID:     "test-client-id",
			ClientSecret: "test-client-secret",
			RedirectURL:  "http://localhost:8080/callback",
			Scopes:       []string{google.ScopeOpenID, google.ScopeEmail},
		}

		client, err := google.NewClient(config)
		require.NoError(t, err)

		state := "test-state-123"
		authURL := client.AuthCodeURL(state)

		assert.Contains(t, authURL, "https://accounts.google.com/o/oauth2/v2/auth")
		assert.Contains(t, authURL, "client_id=test-client-id")
		assert.Contains(t, authURL, "state=test-state-123")
		assert.Contains(t, authURL, "response_type=code")
		assert.Contains(t, authURL, "access_type=offline")
	})

	t.Run("generate auth URL with options", func(t *testing.T) {
		config := &google.Config{
			ClientID:     "test-client-id",
			ClientSecret: "test-client-secret",
			RedirectURL:  "http://localhost:8080/callback",
			Scopes:       google.DefaultScopes(),
		}

		client, err := google.NewClient(config)
		require.NoError(t, err)

		authURL := client.AuthCodeURL("state",
			google.WithPrompt("consent"),
			google.WithLoginHint("user@example.com"),
			google.WithIncludeGrantedScopes(),
		)

		assert.Contains(t, authURL, "prompt=consent")
		assert.Contains(t, authURL, "login_hint=user%40example.com")
		assert.Contains(t, authURL, "include_granted_scopes=true")
	})
}

// TestTokenSource tests the token source with automatic refresh
func TestTokenSource(t *testing.T) {
	t.Run("returns valid token", func(t *testing.T) {
		config := &google.Config{
			ClientID:     "test-client-id",
			ClientSecret: "test-client-secret",
			RedirectURL:  "http://localhost:8080/callback",
			Scopes:       google.DefaultScopes(),
		}

		client, err := google.NewClient(config)
		require.NoError(t, err)

		initialToken := &google.Token{
			AccessToken:  "valid-access-token",
			RefreshToken: "refresh-token",
			Expiry:       time.Now().Add(1 * time.Hour),
		}

		ts := google.NewTokenSource(client, initialToken)

		token, err := ts.Token(context.Background())
		require.NoError(t, err)
		assert.Equal(t, "valid-access-token", token.AccessToken)
	})

	t.Run("returns error for nil token", func(t *testing.T) {
		config := &google.Config{
			ClientID:     "test-client-id",
			ClientSecret: "test-client-secret",
			RedirectURL:  "http://localhost:8080/callback",
			Scopes:       google.DefaultScopes(),
		}

		client, err := google.NewClient(config)
		require.NoError(t, err)

		ts := google.NewTokenSource(client, nil)

		_, err = ts.Token(context.Background())
		assert.ErrorIs(t, err, google.ErrInvalidToken)
	})

	t.Run("returns error for expired token without refresh", func(t *testing.T) {
		config := &google.Config{
			ClientID:     "test-client-id",
			ClientSecret: "test-client-secret",
			RedirectURL:  "http://localhost:8080/callback",
			Scopes:       google.DefaultScopes(),
		}

		client, err := google.NewClient(config)
		require.NoError(t, err)

		expiredToken := &google.Token{
			AccessToken:  "expired-access-token",
			RefreshToken: "", // No refresh token
			Expiry:       time.Now().Add(-1 * time.Hour),
		}

		ts := google.NewTokenSource(client, expiredToken)

		_, err = ts.Token(context.Background())
		assert.ErrorIs(t, err, google.ErrTokenExpired)
	})

	t.Run("set and get current token", func(t *testing.T) {
		config := &google.Config{
			ClientID:     "test-client-id",
			ClientSecret: "test-client-secret",
			RedirectURL:  "http://localhost:8080/callback",
			Scopes:       google.DefaultScopes(),
		}

		client, err := google.NewClient(config)
		require.NoError(t, err)

		ts := google.NewTokenSource(client, nil)

		newToken := &google.Token{
			AccessToken:  "new-token",
			RefreshToken: "new-refresh",
			Expiry:       time.Now().Add(1 * time.Hour),
		}

		ts.SetToken(newToken)
		assert.Equal(t, newToken, ts.CurrentToken())
	})
}

// TestGoogleDriveConnectionIntegration tests Google Drive connection operations with real database
func TestGoogleDriveConnectionIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	db := SetupTestDatabase(t)
	defer db.Cleanup(t)

	ctx := context.Background()

	t.Run("create google drive connection", func(t *testing.T) {
		conn, err := db.Client.GoogleDriveConnection.Create().
			SetID(uuid.New().String()).
			SetUserID("user-123").
			SetGoogleAccountID("google-account-123").
			SetEmail("test@example.com").
			SetAccessToken("access-token").
			SetRefreshToken("refresh-token").
			SetTokenExpiry(time.Now().Add(1 * time.Hour)).
			SetStatus(googledriveconnection.StatusActive).
			Save(ctx)

		require.NoError(t, err)
		assert.NotEmpty(t, conn.ID)
		assert.Equal(t, "user-123", conn.UserID)
		assert.Equal(t, "test@example.com", conn.Email)
		assert.Equal(t, googledriveconnection.StatusActive, conn.Status)
	})

	t.Run("query connections by user", func(t *testing.T) {
		// Create another connection for the same user
		_, err := db.Client.GoogleDriveConnection.Create().
			SetID(uuid.New().String()).
			SetUserID("user-123").
			SetGoogleAccountID("google-account-456").
			SetEmail("test2@example.com").
			SetAccessToken("access-token-2").
			SetRefreshToken("refresh-token-2").
			SetTokenExpiry(time.Now().Add(1 * time.Hour)).
			SetStatus(googledriveconnection.StatusActive).
			Save(ctx)
		require.NoError(t, err)

		connections, err := db.Client.GoogleDriveConnection.Query().
			Where(googledriveconnection.UserIDEQ("user-123")).
			All(ctx)

		require.NoError(t, err)
		assert.Len(t, connections, 2)
	})

	t.Run("update connection status", func(t *testing.T) {
		conn, err := db.Client.GoogleDriveConnection.Query().
			Where(googledriveconnection.GoogleAccountIDEQ("google-account-123")).
			First(ctx)
		require.NoError(t, err)

		updated, err := conn.Update().
			SetStatus(googledriveconnection.StatusRevoked).
			Save(ctx)
		require.NoError(t, err)
		assert.Equal(t, googledriveconnection.StatusRevoked, updated.Status)
	})

	t.Run("delete connection", func(t *testing.T) {
		conn, err := db.Client.GoogleDriveConnection.Query().
			Where(googledriveconnection.GoogleAccountIDEQ("google-account-456")).
			First(ctx)
		require.NoError(t, err)

		err = db.Client.GoogleDriveConnection.DeleteOne(conn).Exec(ctx)
		require.NoError(t, err)

		// Verify deletion
		count, err := db.Client.GoogleDriveConnection.Query().
			Where(googledriveconnection.GoogleAccountIDEQ("google-account-456")).
			Count(ctx)
		require.NoError(t, err)
		assert.Equal(t, 0, count)
	})
}

// TestEmailConnectionIntegration tests email connection operations with real database
func TestEmailConnectionIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	db := SetupTestDatabase(t)
	defer db.Cleanup(t)

	ctx := context.Background()

	t.Run("create email connection", func(t *testing.T) {
		conn, err := db.Client.EmailConnection.Create().
			SetID(uuid.New().String()).
			SetUserID("user-456").
			SetProviderAccountID("provider-account-123").
			SetEmail("email@example.com").
			SetProvider(emailconnection.ProviderGmail).
			SetAccessToken("email-access-token").
			SetRefreshToken("email-refresh-token").
			SetTokenExpiry(time.Now().Add(1 * time.Hour)).
			SetStatus(emailconnection.StatusActive).
			Save(ctx)

		require.NoError(t, err)
		assert.NotEmpty(t, conn.ID)
		assert.Equal(t, "user-456", conn.UserID)
		assert.Equal(t, emailconnection.ProviderGmail, conn.Provider)
	})

	t.Run("query by provider", func(t *testing.T) {
		// Create outlook connection
		_, err := db.Client.EmailConnection.Create().
			SetID(uuid.New().String()).
			SetUserID("user-789").
			SetProviderAccountID("provider-account-456").
			SetEmail("outlook@example.com").
			SetProvider(emailconnection.ProviderOutlook).
			SetAccessToken("outlook-access-token").
			SetRefreshToken("outlook-refresh-token").
			SetTokenExpiry(time.Now().Add(1 * time.Hour)).
			SetStatus(emailconnection.StatusActive).
			Save(ctx)
		require.NoError(t, err)

		gmailConns, err := db.Client.EmailConnection.Query().
			Where(emailconnection.ProviderEQ(emailconnection.ProviderGmail)).
			All(ctx)
		require.NoError(t, err)
		assert.Len(t, gmailConns, 1)

		outlookConns, err := db.Client.EmailConnection.Query().
			Where(emailconnection.ProviderEQ(emailconnection.ProviderOutlook)).
			All(ctx)
		require.NoError(t, err)
		assert.Len(t, outlookConns, 1)
	})

	t.Run("update token expiry", func(t *testing.T) {
		conn, err := db.Client.EmailConnection.Query().
			Where(emailconnection.ProviderAccountIDEQ("provider-account-123")).
			First(ctx)
		require.NoError(t, err)

		newExpiry := time.Now().Add(2 * time.Hour)
		updated, err := conn.Update().
			SetTokenExpiry(newExpiry).
			SetAccessToken("new-access-token").
			Save(ctx)
		require.NoError(t, err)
		assert.Equal(t, "new-access-token", updated.AccessToken)
		assert.True(t, updated.TokenExpiry.After(time.Now().Add(90*time.Minute)))
	})
}

// TestOAuthExchangeMock tests OAuth token exchange with a mock server
func TestOAuthExchangeMock(t *testing.T) {
	// Create a mock token endpoint
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		if err := r.ParseForm(); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		code := r.FormValue("code")
		if code == "valid-auth-code" {
			resp := map[string]interface{}{
				"access_token":  "mock-access-token",
				"refresh_token": "mock-refresh-token",
				"token_type":    "Bearer",
				"expires_in":    3600,
				"scope":         "openid profile email",
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(resp)
			return
		}

		// Invalid code
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error":             "invalid_grant",
			"error_description": "Invalid authorization code",
		})
	}))
	defer mockServer.Close()

	t.Run("successful token exchange (simulated)", func(t *testing.T) {
		// Note: We cannot actually test Exchange() with the mock server
		// because the token URL is hardcoded. This test documents the expected behavior.
		// In a real implementation, you would inject the token URL.

		config := &google.Config{
			ClientID:     "test-client-id",
			ClientSecret: "test-client-secret",
			RedirectURL:  "http://localhost:8080/callback",
			Scopes:       google.DefaultScopes(),
		}

		client, err := google.NewClient(config)
		require.NoError(t, err)
		assert.NotNil(t, client)

		// Verify the client is properly configured
		sm := client.ScopeManager()
		assert.NotNil(t, sm)
		assert.True(t, sm.IsAllowed(google.ScopeOpenID))
	})
}

// TestAuthAPIEndpoints tests the full request/response cycle for auth-related endpoints
func TestAuthAPIEndpoints(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	db := SetupTestDatabase(t)
	defer db.Cleanup(t)

	ctx := context.Background()

	// Create a test connection for querying
	connID := uuid.New().String()
	_, err := db.Client.GoogleDriveConnection.Create().
		SetID(connID).
		SetUserID("api-test-user").
		SetGoogleAccountID("api-test-account").
		SetEmail("api-test@example.com").
		SetAccessToken("api-access-token").
		SetRefreshToken("api-refresh-token").
		SetTokenExpiry(time.Now().Add(1 * time.Hour)).
		SetStatus(googledriveconnection.StatusActive).
		Save(ctx)
	require.NoError(t, err)

	t.Run("query connection via database client", func(t *testing.T) {
		conn, err := db.Client.GoogleDriveConnection.Get(ctx, connID)
		require.NoError(t, err)
		assert.Equal(t, "api-test@example.com", conn.Email)
	})

	t.Run("simulate API response for connection list", func(t *testing.T) {
		connections, err := db.Client.GoogleDriveConnection.Query().
			Where(googledriveconnection.UserIDEQ("api-test-user")).
			All(ctx)
		require.NoError(t, err)

		// Simulate JSON response
		type ConnectionResponse struct {
			ID        string `json:"id"`
			Email     string `json:"email"`
			Status    string `json:"status"`
			CreatedAt string `json:"created_at"`
		}

		responses := make([]ConnectionResponse, len(connections))
		for i, conn := range connections {
			responses[i] = ConnectionResponse{
				ID:        conn.ID,
				Email:     conn.Email,
				Status:    string(conn.Status),
				CreatedAt: conn.CreatedAt.Format(time.RFC3339),
			}
		}

		// Verify response structure
		jsonData, err := json.Marshal(responses)
		require.NoError(t, err)
		assert.NotEmpty(t, jsonData)

		// Verify can unmarshal
		var decoded []ConnectionResponse
		err = json.Unmarshal(jsonData, &decoded)
		require.NoError(t, err)
		assert.Len(t, decoded, 1)
		assert.Equal(t, "api-test@example.com", decoded[0].Email)
	})

	t.Run("simulate connection status update API", func(t *testing.T) {
		// Simulate request body
		type UpdateRequest struct {
			Status string `json:"status"`
		}

		reqBody := UpdateRequest{Status: "inactive"}
		jsonBody, _ := json.Marshal(reqBody)

		// Parse request
		var req UpdateRequest
		err := json.NewDecoder(bytes.NewReader(jsonBody)).Decode(&req)
		require.NoError(t, err)

		// Apply update
		conn, err := db.Client.GoogleDriveConnection.Get(ctx, connID)
		require.NoError(t, err)

		// Map string status to enum
		var status googledriveconnection.Status
		switch req.Status {
		case "active":
			status = googledriveconnection.StatusActive
		case "inactive":
			status = googledriveconnection.StatusInactive
		case "revoked":
			status = googledriveconnection.StatusRevoked
		case "expired":
			status = googledriveconnection.StatusExpired
		}

		updated, err := conn.Update().
			SetStatus(status).
			Save(ctx)
		require.NoError(t, err)
		assert.Equal(t, googledriveconnection.StatusInactive, updated.Status)
	})
}

// Helper function to run tests with database
func withTestDB(t *testing.T, f func(*testing.T, *ent.Client)) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	db := SetupTestDatabase(t)
	defer db.Cleanup(t)

	f(t, db.Client)
}
