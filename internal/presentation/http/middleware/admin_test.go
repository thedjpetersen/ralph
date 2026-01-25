package middleware

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRequireAdmin(t *testing.T) {
	// Create a simple handler that returns 200 OK
	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("success"))
	})

	// Wrap with admin middleware
	protectedHandler := RequireAdmin(testHandler)

	tests := []struct {
		name           string
		setupAuth      func(r *http.Request)
		expectedStatus int
		expectedBody   string
	}{
		{
			name:           "no auth header returns 403",
			setupAuth:      func(r *http.Request) {},
			expectedStatus: http.StatusForbidden,
			expectedBody:   `"error":"forbidden"`,
		},
		{
			name: "valid JWT with admin role returns 200",
			setupAuth: func(r *http.Request) {
				token := createTestJWT(t, JWTClaims{Role: "admin", UserID: "user-123"})
				r.Header.Set("Authorization", "Bearer "+token)
			},
			expectedStatus: http.StatusOK,
			expectedBody:   "success",
		},
		{
			name: "valid JWT with admin in roles array returns 200",
			setupAuth: func(r *http.Request) {
				token := createTestJWT(t, JWTClaims{Roles: []string{"user", "admin"}, UserID: "user-123"})
				r.Header.Set("Authorization", "Bearer "+token)
			},
			expectedStatus: http.StatusOK,
			expectedBody:   "success",
		},
		{
			name: "valid JWT without admin role returns 403",
			setupAuth: func(r *http.Request) {
				token := createTestJWT(t, JWTClaims{Role: "user", UserID: "user-123"})
				r.Header.Set("Authorization", "Bearer "+token)
			},
			expectedStatus: http.StatusForbidden,
			expectedBody:   `"error":"forbidden"`,
		},
		{
			name: "admin API key returns 200",
			setupAuth: func(r *http.Request) {
				r.Header.Set("X-API-Key", "admin:secret-key-123")
			},
			expectedStatus: http.StatusOK,
			expectedBody:   "success",
		},
		{
			name: "non-admin API key returns 403",
			setupAuth: func(r *http.Request) {
				r.Header.Set("X-API-Key", "user:secret-key-123")
			},
			expectedStatus: http.StatusForbidden,
			expectedBody:   `"error":"forbidden"`,
		},
		{
			name: "invalid JWT format returns 403",
			setupAuth: func(r *http.Request) {
				r.Header.Set("Authorization", "Bearer invalid-token")
			},
			expectedStatus: http.StatusForbidden,
			expectedBody:   `"error":"forbidden"`,
		},
		{
			name: "malformed JWT payload returns 403",
			setupAuth: func(r *http.Request) {
				// Create a token with invalid base64 in payload
				r.Header.Set("Authorization", "Bearer header.!!!invalid!!!.signature")
			},
			expectedStatus: http.StatusForbidden,
			expectedBody:   `"error":"forbidden"`,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/admin/endpoint", nil)
			tc.setupAuth(req)

			rr := httptest.NewRecorder()
			protectedHandler.ServeHTTP(rr, req)

			assert.Equal(t, tc.expectedStatus, rr.Code)
			assert.Contains(t, rr.Body.String(), tc.expectedBody)
		})
	}
}

func TestRequireAdminFunc(t *testing.T) {
	// Create a simple handler func
	testHandler := func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("success"))
	}

	// Wrap with admin middleware
	protectedHandler := RequireAdminFunc(testHandler)

	t.Run("allows admin access", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/admin/endpoint", nil)
		token := createTestJWT(t, JWTClaims{Role: "admin", UserID: "user-123"})
		req.Header.Set("Authorization", "Bearer "+token)

		rr := httptest.NewRecorder()
		protectedHandler(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
	})

	t.Run("denies non-admin access", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/admin/endpoint", nil)

		rr := httptest.NewRecorder()
		protectedHandler(rr, req)

		assert.Equal(t, http.StatusForbidden, rr.Code)
	})
}

func TestExtractJWTClaims(t *testing.T) {
	t.Run("valid token", func(t *testing.T) {
		token := createTestJWT(t, JWTClaims{
			Role:   "admin",
			Roles:  []string{"user", "admin"},
			UserID: "user-123",
		})

		claims, err := extractJWTClaims(token)
		require.NoError(t, err)
		assert.Equal(t, "admin", claims.Role)
		assert.Equal(t, []string{"user", "admin"}, claims.Roles)
		assert.Equal(t, "user-123", claims.UserID)
	})

	t.Run("invalid token format", func(t *testing.T) {
		_, err := extractJWTClaims("not-a-jwt")
		assert.ErrorIs(t, err, ErrInvalidToken)
	})

	t.Run("invalid base64", func(t *testing.T) {
		_, err := extractJWTClaims("header.!!!.signature")
		assert.ErrorIs(t, err, ErrInvalidToken)
	})

	t.Run("invalid JSON", func(t *testing.T) {
		invalidPayload := base64.RawURLEncoding.EncodeToString([]byte("not json"))
		_, err := extractJWTClaims("header." + invalidPayload + ".signature")
		assert.ErrorIs(t, err, ErrInvalidToken)
	})
}

func TestIsAdminAPIKey(t *testing.T) {
	tests := []struct {
		name     string
		apiKey   string
		expected bool
	}{
		{"admin prefix", "admin:secret", true},
		{"admin prefix with complex key", "admin:abc-123-xyz", true},
		{"user prefix", "user:secret", false},
		{"no prefix", "just-a-key", false},
		{"empty", "", false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := isAdminAPIKey(tc.apiKey)
			assert.Equal(t, tc.expected, result)
		})
	}
}

func TestMiddlewareError(t *testing.T) {
	err := &MiddlewareError{Code: "test_error", Message: "Test message"}
	assert.Equal(t, "Test message", err.Error())
}

// createTestJWT creates a simple JWT token for testing purposes.
// Note: This creates an unsigned token suitable only for testing.
func createTestJWT(t *testing.T, claims JWTClaims) string {
	t.Helper()

	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"HS256","typ":"JWT"}`))

	payload, err := json.Marshal(claims)
	require.NoError(t, err)
	encodedPayload := base64.RawURLEncoding.EncodeToString(payload)

	// Use a fake signature for testing
	signature := base64.RawURLEncoding.EncodeToString([]byte("test-signature"))

	return header + "." + encodedPayload + "." + signature
}
