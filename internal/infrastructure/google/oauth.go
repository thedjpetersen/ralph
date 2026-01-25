// Package google provides OAuth2 authentication and integration with Google services.
package google

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

// Common Google OAuth2 scopes
const (
	// ScopeOpenID provides access to the user's OpenID claims
	ScopeOpenID = "openid"
	// ScopeProfile provides access to user's basic profile information
	ScopeProfile = "profile"
	// ScopeEmail provides access to user's email address
	ScopeEmail = "email"
	// ScopeDriveReadOnly provides read-only access to Google Drive files
	ScopeDriveReadOnly = "https://www.googleapis.com/auth/drive.readonly"
	// ScopeDriveFile provides access to files created by the app
	ScopeDriveFile = "https://www.googleapis.com/auth/drive.file"
	// ScopeDriveFull provides full access to Google Drive
	ScopeDriveFull = "https://www.googleapis.com/auth/drive"
	// ScopeDriveMetadataReadOnly provides read-only access to file metadata
	ScopeDriveMetadataReadOnly = "https://www.googleapis.com/auth/drive.metadata.readonly"
	// ScopeCalendarReadOnly provides read-only access to Google Calendar
	ScopeCalendarReadOnly = "https://www.googleapis.com/auth/calendar.readonly"
	// ScopeCalendar provides full access to Google Calendar
	ScopeCalendar = "https://www.googleapis.com/auth/calendar"
	// ScopeGmailReadOnly provides read-only access to Gmail
	ScopeGmailReadOnly = "https://www.googleapis.com/auth/gmail.readonly"
	// ScopeGmailSend provides send-only access to Gmail
	ScopeGmailSend = "https://www.googleapis.com/auth/gmail.send"
	// ScopeGmailModify provides read/write access except delete
	ScopeGmailModify = "https://www.googleapis.com/auth/gmail.modify"
	// ScopeGmailFull provides full access to Gmail
	ScopeGmailFull = "https://www.googleapis.com/auth/mail.google.com"
)

// OAuth2 endpoints
const (
	authURL     = "https://accounts.google.com/o/oauth2/v2/auth"
	tokenURL    = "https://oauth2.googleapis.com/token"
	userInfoURL = "https://www.googleapis.com/oauth2/v2/userinfo"
	revokeURL   = "https://oauth2.googleapis.com/revoke"
)

// Error definitions
var (
	// ErrInvalidToken indicates the token is invalid or malformed
	ErrInvalidToken = errors.New("invalid token")
	// ErrTokenExpired indicates the access token has expired
	ErrTokenExpired = errors.New("access token expired")
	// ErrRefreshFailed indicates token refresh failed
	ErrRefreshFailed = errors.New("token refresh failed")
	// ErrMissingCredentials indicates client credentials are not configured
	ErrMissingCredentials = errors.New("missing OAuth client credentials")
	// ErrInvalidState indicates CSRF state mismatch
	ErrInvalidState = errors.New("invalid state parameter")
	// ErrInvalidScope indicates requested scopes are invalid
	ErrInvalidScope = errors.New("invalid scope requested")
	// ErrExchangeFailed indicates authorization code exchange failed
	ErrExchangeFailed = errors.New("authorization code exchange failed")
	// ErrUserInfoFailed indicates fetching user info failed
	ErrUserInfoFailed = errors.New("failed to fetch user info")
)

// Token represents an OAuth2 token with expiry tracking
type Token struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token,omitempty"`
	TokenType    string    `json:"token_type"`
	ExpiresIn    int       `json:"expires_in,omitempty"`
	Expiry       time.Time `json:"expiry,omitzero"`
	Scope        string    `json:"scope,omitempty"`
	IDToken      string    `json:"id_token,omitempty"`
}

// IsExpired returns true if the token has expired or will expire within the buffer period
func (t *Token) IsExpired() bool {
	return t.IsExpiredWithBuffer(10 * time.Second)
}

// IsExpiredWithBuffer returns true if the token expires within the given buffer duration
func (t *Token) IsExpiredWithBuffer(buffer time.Duration) bool {
	if t.Expiry.IsZero() {
		return false
	}
	return time.Now().Add(buffer).After(t.Expiry)
}

// Valid returns true if the token is valid and not expired
func (t *Token) Valid() bool {
	return t.AccessToken != "" && !t.IsExpired()
}

// tokenResponse represents the raw response from Google's token endpoint
type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token,omitempty"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	Scope        string `json:"scope"`
	IDToken      string `json:"id_token,omitempty"`
	Error        string `json:"error,omitempty"`
	ErrorDesc    string `json:"error_description,omitempty"`
}

// UserInfo represents the user information from Google
type UserInfo struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Picture       string `json:"picture"`
	Locale        string `json:"locale"`
}

// Config holds the OAuth2 client configuration
type Config struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
	Scopes       []string
}

// Validate ensures the configuration has all required fields
func (c *Config) Validate() error {
	if c.ClientID == "" || c.ClientSecret == "" {
		return ErrMissingCredentials
	}
	if c.RedirectURL == "" {
		return errors.New("redirect URL is required")
	}
	return nil
}

// ScopeManager handles OAuth scope validation and management
type ScopeManager struct {
	allowedScopes map[string]bool
	mu            sync.RWMutex
}

// NewScopeManager creates a new scope manager with default allowed scopes
func NewScopeManager() *ScopeManager {
	sm := &ScopeManager{
		allowedScopes: make(map[string]bool),
	}
	// Register default allowed scopes
	defaultScopes := []string{
		ScopeOpenID,
		ScopeProfile,
		ScopeEmail,
		ScopeDriveReadOnly,
		ScopeDriveFile,
		ScopeDriveFull,
		ScopeDriveMetadataReadOnly,
		ScopeCalendarReadOnly,
		ScopeCalendar,
		ScopeGmailReadOnly,
		ScopeGmailSend,
		ScopeGmailModify,
		ScopeGmailFull,
	}
	for _, scope := range defaultScopes {
		sm.allowedScopes[scope] = true
	}
	return sm
}

// RegisterScope adds a scope to the allowed list
func (sm *ScopeManager) RegisterScope(scope string) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	sm.allowedScopes[scope] = true
}

// UnregisterScope removes a scope from the allowed list
func (sm *ScopeManager) UnregisterScope(scope string) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	delete(sm.allowedScopes, scope)
}

// ValidateScopes checks if all requested scopes are allowed
func (sm *ScopeManager) ValidateScopes(scopes []string) error {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	var invalidScopes []string
	for _, scope := range scopes {
		if !sm.allowedScopes[scope] {
			invalidScopes = append(invalidScopes, scope)
		}
	}

	if len(invalidScopes) > 0 {
		return fmt.Errorf("%w: %s", ErrInvalidScope, strings.Join(invalidScopes, ", "))
	}
	return nil
}

// IsAllowed checks if a specific scope is allowed
func (sm *ScopeManager) IsAllowed(scope string) bool {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return sm.allowedScopes[scope]
}

// AllowedScopes returns a list of all currently allowed scopes
func (sm *ScopeManager) AllowedScopes() []string {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	scopes := make([]string, 0, len(sm.allowedScopes))
	for scope := range sm.allowedScopes {
		scopes = append(scopes, scope)
	}
	return scopes
}

// Client provides Google OAuth2 functionality
type Client struct {
	config       *Config
	httpClient   *http.Client
	scopeManager *ScopeManager
}

// NewClient creates a new Google OAuth2 client
func NewClient(config *Config) (*Client, error) {
	if err := config.Validate(); err != nil {
		return nil, err
	}

	return &Client{
		config: config,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		scopeManager: NewScopeManager(),
	}, nil
}

// NewClientWithHTTP creates a new client with a custom HTTP client
func NewClientWithHTTP(config *Config, httpClient *http.Client) (*Client, error) {
	if err := config.Validate(); err != nil {
		return nil, err
	}

	return &Client{
		config:       config,
		httpClient:   httpClient,
		scopeManager: NewScopeManager(),
	}, nil
}

// ScopeManager returns the scope manager for this client
func (c *Client) ScopeManager() *ScopeManager {
	return c.scopeManager
}

// AuthCodeURL generates the authorization URL for the OAuth2 flow
func (c *Client) AuthCodeURL(state string, opts ...AuthCodeOption) string {
	params := url.Values{
		"client_id":     {c.config.ClientID},
		"redirect_uri":  {c.config.RedirectURL},
		"response_type": {"code"},
		"scope":         {strings.Join(c.config.Scopes, " ")},
		"state":         {state},
		"access_type":   {"offline"}, // Request refresh token
	}

	// Apply optional parameters
	for _, opt := range opts {
		opt(params)
	}

	return authURL + "?" + params.Encode()
}

// AuthCodeOption is a functional option for customizing auth URL generation
type AuthCodeOption func(url.Values)

// WithPrompt sets the prompt parameter for the authorization request
func WithPrompt(prompt string) AuthCodeOption {
	return func(v url.Values) {
		v.Set("prompt", prompt)
	}
}

// WithLoginHint sets the login_hint parameter to pre-fill the email
func WithLoginHint(email string) AuthCodeOption {
	return func(v url.Values) {
		v.Set("login_hint", email)
	}
}

// WithIncludeGrantedScopes enables incremental authorization
func WithIncludeGrantedScopes() AuthCodeOption {
	return func(v url.Values) {
		v.Set("include_granted_scopes", "true")
	}
}

// Exchange exchanges an authorization code for a token
func (c *Client) Exchange(ctx context.Context, code string) (*Token, error) {
	data := url.Values{
		"code":          {code},
		"client_id":     {c.config.ClientID},
		"client_secret": {c.config.ClientSecret},
		"redirect_uri":  {c.config.RedirectURL},
		"grant_type":    {"authorization_code"},
	}

	return c.doTokenRequest(ctx, data)
}

// RefreshToken refreshes an access token using a refresh token
func (c *Client) RefreshToken(ctx context.Context, refreshToken string) (*Token, error) {
	if refreshToken == "" {
		return nil, fmt.Errorf("%w: refresh token is empty", ErrRefreshFailed)
	}

	data := url.Values{
		"refresh_token": {refreshToken},
		"client_id":     {c.config.ClientID},
		"client_secret": {c.config.ClientSecret},
		"grant_type":    {"refresh_token"},
	}

	token, err := c.doTokenRequest(ctx, data)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrRefreshFailed, err)
	}

	// Preserve the refresh token as Google doesn't always return a new one
	if token.RefreshToken == "" {
		token.RefreshToken = refreshToken
	}

	return token, nil
}

// doTokenRequest performs the token endpoint request
func (c *Client) doTokenRequest(ctx context.Context, data url.Values) (*Token, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		var errResp tokenResponse
		if err := json.Unmarshal(body, &errResp); err == nil && errResp.Error != "" {
			return nil, fmt.Errorf("%w: %s - %s", ErrExchangeFailed, errResp.Error, errResp.ErrorDesc)
		}
		return nil, fmt.Errorf("%w: status %d", ErrExchangeFailed, resp.StatusCode)
	}

	var tr tokenResponse
	if err := json.Unmarshal(body, &tr); err != nil {
		return nil, fmt.Errorf("parsing response: %w", err)
	}

	token := &Token{
		AccessToken:  tr.AccessToken,
		RefreshToken: tr.RefreshToken,
		TokenType:    tr.TokenType,
		ExpiresIn:    tr.ExpiresIn,
		Scope:        tr.Scope,
		IDToken:      tr.IDToken,
	}

	// Calculate expiry time
	if tr.ExpiresIn > 0 {
		token.Expiry = time.Now().Add(time.Duration(tr.ExpiresIn) * time.Second)
	}

	return token, nil
}

// GetUserInfo fetches the user's profile information using an access token
func (c *Client) GetUserInfo(ctx context.Context, accessToken string) (*UserInfo, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, userInfoURL, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, ErrTokenExpired
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: status %d", ErrUserInfoFailed, resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	var userInfo UserInfo
	if err := json.Unmarshal(body, &userInfo); err != nil {
		return nil, fmt.Errorf("parsing response: %w", err)
	}

	return &userInfo, nil
}

// RevokeToken revokes an access or refresh token
func (c *Client) RevokeToken(ctx context.Context, token string) error {
	data := url.Values{
		"token": {token},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, revokeURL, strings.NewReader(data.Encode()))
	if err != nil {
		return fmt.Errorf("creating request: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	// Google returns 200 for successful revocation
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("revocation failed: status %d, body: %s", resp.StatusCode, string(body))
	}

	return nil
}

// TokenSource provides automatic token refresh capability
type TokenSource struct {
	client       *Client
	currentToken *Token
	mu           sync.RWMutex
}

// NewTokenSource creates a new token source with automatic refresh
func NewTokenSource(client *Client, initialToken *Token) *TokenSource {
	return &TokenSource{
		client:       client,
		currentToken: initialToken,
	}
}

// Token returns a valid token, refreshing if necessary
func (ts *TokenSource) Token(ctx context.Context) (*Token, error) {
	ts.mu.RLock()
	token := ts.currentToken
	ts.mu.RUnlock()

	if token == nil {
		return nil, ErrInvalidToken
	}

	// Return current token if still valid
	if token.Valid() {
		return token, nil
	}

	// Token expired, try to refresh
	if token.RefreshToken == "" {
		return nil, ErrTokenExpired
	}

	ts.mu.Lock()
	defer ts.mu.Unlock()

	// Double-check after acquiring write lock
	if ts.currentToken.Valid() {
		return ts.currentToken, nil
	}

	newToken, err := ts.client.RefreshToken(ctx, ts.currentToken.RefreshToken)
	if err != nil {
		return nil, err
	}

	ts.currentToken = newToken
	return newToken, nil
}

// SetToken updates the current token
func (ts *TokenSource) SetToken(token *Token) {
	ts.mu.Lock()
	defer ts.mu.Unlock()
	ts.currentToken = token
}

// CurrentToken returns the current token without refreshing
func (ts *TokenSource) CurrentToken() *Token {
	ts.mu.RLock()
	defer ts.mu.RUnlock()
	return ts.currentToken
}

// ValidateToken checks if a token is valid by making a test API call
func (c *Client) ValidateToken(ctx context.Context, accessToken string) (bool, error) {
	_, err := c.GetUserInfo(ctx, accessToken)
	if err != nil {
		if errors.Is(err, ErrTokenExpired) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// DefaultScopes returns the recommended default scopes for typical applications
func DefaultScopes() []string {
	return []string{
		ScopeOpenID,
		ScopeProfile,
		ScopeEmail,
	}
}

// DriveScopes returns scopes needed for Google Drive integration
func DriveScopes() []string {
	return []string{
		ScopeOpenID,
		ScopeProfile,
		ScopeEmail,
		ScopeDriveReadOnly,
	}
}

// DriveFullScopes returns full Google Drive access scopes
func DriveFullScopes() []string {
	return []string{
		ScopeOpenID,
		ScopeProfile,
		ScopeEmail,
		ScopeDriveFull,
	}
}
