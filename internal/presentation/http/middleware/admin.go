// Package middleware provides HTTP middleware for the clockzen API.
package middleware

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"slices"
	"strings"
)

// AdminRole is the role name required for admin access.
const AdminRole = "admin"

// JWTClaims represents the claims we expect in the JWT token.
type JWTClaims struct {
	Role   string   `json:"role"`
	Roles  []string `json:"roles"`
	UserID string   `json:"sub"`
}

// RequireAdmin is a middleware that checks for admin role in JWT or API key.
// It returns 403 Forbidden for non-admin users.
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !isAdmin(r) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{
				"error":   "forbidden",
				"message": "Admin access required",
			})
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RequireAdminFunc wraps a HandlerFunc with admin authorization.
func RequireAdminFunc(next http.HandlerFunc) http.HandlerFunc {
	return RequireAdmin(next).ServeHTTP
}

// isAdmin checks if the request has admin privileges via JWT or API key.
func isAdmin(r *http.Request) bool {
	// Check Authorization header for Bearer token (JWT)
	authHeader := r.Header.Get("Authorization")
	if token, ok := strings.CutPrefix(authHeader, "Bearer "); ok {
		if hasAdminRole(token) {
			return true
		}
	}

	// Check X-API-Key header for admin API key
	apiKey := r.Header.Get("X-API-Key")
	if apiKey != "" && isAdminAPIKey(apiKey) {
		return true
	}

	return false
}

// hasAdminRole extracts claims from a JWT and checks for admin role.
// This performs a basic JWT payload decode (not signature verification -
// signature verification should be done by an upstream auth middleware).
func hasAdminRole(token string) bool {
	claims, err := extractJWTClaims(token)
	if err != nil {
		return false
	}

	// Check single role field
	if claims.Role == AdminRole {
		return true
	}

	// Check roles array
	return slices.Contains(claims.Roles, AdminRole)
}

// extractJWTClaims decodes the payload portion of a JWT token.
// Note: This does NOT verify the signature. Signature verification
// should be handled by an upstream authentication middleware.
func extractJWTClaims(token string) (*JWTClaims, error) {
	// JWT format: header.payload.signature
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, ErrInvalidToken
	}

	// Decode the payload (second part)
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, ErrInvalidToken
	}

	var claims JWTClaims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil, ErrInvalidToken
	}

	return &claims, nil
}

// isAdminAPIKey checks if the provided API key grants admin access.
// API keys with the "admin:" prefix are considered admin keys.
func isAdminAPIKey(apiKey string) bool {
	return strings.HasPrefix(apiKey, "admin:")
}

// Error types for middleware operations.
var (
	ErrInvalidToken = &MiddlewareError{Code: "invalid_token", Message: "Invalid or malformed token"}
	ErrForbidden    = &MiddlewareError{Code: "forbidden", Message: "Admin access required"}
)

// MiddlewareError represents an error from middleware operations.
type MiddlewareError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e *MiddlewareError) Error() string {
	return e.Message
}
