package integration

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"

	"clockzen-next/internal/application/integration"
	"clockzen-next/internal/ent"
	"clockzen-next/internal/ent/emailconnection"
	"clockzen-next/internal/ent/emaillabel"
	"clockzen-next/internal/infrastructure/google"
)

// EmailHandler handles HTTP requests for Email integration
type EmailHandler struct {
	mu          sync.RWMutex
	entClient   *ent.Client
	oauthConfig *google.Config
	syncService *integration.EmailSyncService
	states      map[string]emailStateData // CSRF state storage
}

// emailStateData holds OAuth state information for email
type emailStateData struct {
	UserID    string
	CreatedAt time.Time
	Scopes    []string
	Provider  string
}

// NewEmailHandler creates a new EmailHandler instance
func NewEmailHandler(entClient *ent.Client, oauthConfig *google.Config) *EmailHandler {
	syncService := integration.NewEmailSyncServiceWithDefaults(entClient, oauthConfig)
	return &EmailHandler{
		entClient:   entClient,
		oauthConfig: oauthConfig,
		syncService: syncService,
		states:      make(map[string]emailStateData),
	}
}

// NewEmailHandlerWithSyncService creates a handler with a custom sync service
func NewEmailHandlerWithSyncService(entClient *ent.Client, oauthConfig *google.Config, syncService *integration.EmailSyncService) *EmailHandler {
	return &EmailHandler{
		entClient:   entClient,
		oauthConfig: oauthConfig,
		syncService: syncService,
		states:      make(map[string]emailStateData),
	}
}

// ========================================
// OAuth Handlers
// ========================================

// EmailInitiateOAuthRequest represents a request to initiate OAuth flow for email
type EmailInitiateOAuthRequest struct {
	UserID   string   `json:"user_id"`
	Scopes   []string `json:"scopes,omitempty"`
	Provider string   `json:"provider"` // gmail, outlook
}

// EmailInitiateOAuthResponse represents the response with authorization URL
type EmailInitiateOAuthResponse struct {
	AuthorizationURL string `json:"authorization_url"`
	State            string `json:"state"`
}

// HandleInitiateOAuth handles POST /api/integrations/email/oauth/initiate
func (h *EmailHandler) HandleInitiateOAuth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req EmailInitiateOAuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if req.UserID == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "user_id is required")
		return
	}

	// Default to gmail provider
	provider := req.Provider
	if provider == "" {
		provider = "gmail"
	}

	// Validate provider
	switch provider {
	case "gmail":
		// supported
	case "outlook":
		h.writeError(w, http.StatusBadRequest, "unsupported_provider", "Outlook provider not yet implemented")
		return
	default:
		h.writeError(w, http.StatusBadRequest, "invalid_provider", "Provider must be one of: gmail, outlook")
		return
	}

	// Generate state for CSRF protection
	state := uuid.New().String()

	// Determine scopes
	scopes := req.Scopes
	if len(scopes) == 0 {
		scopes = google.GmailScopes()
	}

	// Store state with user context
	h.mu.Lock()
	h.states[state] = emailStateData{
		UserID:    req.UserID,
		CreatedAt: time.Now(),
		Scopes:    scopes,
		Provider:  provider,
	}
	h.mu.Unlock()

	// Clean up old states (older than 10 minutes)
	go h.cleanupOldStates()

	// Create OAuth client and generate auth URL
	config := &google.Config{
		ClientID:     h.oauthConfig.ClientID,
		ClientSecret: h.oauthConfig.ClientSecret,
		RedirectURL:  h.oauthConfig.RedirectURL,
		Scopes:       scopes,
	}

	oauthClient, err := google.NewClient(config)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "oauth_error", "Failed to create OAuth client: "+err.Error())
		return
	}

	authURL := oauthClient.AuthCodeURL(state, google.WithPrompt("consent"))

	h.writeJSON(w, http.StatusOK, EmailInitiateOAuthResponse{
		AuthorizationURL: authURL,
		State:            state,
	})
}

// EmailOAuthCallbackRequest represents the OAuth callback parameters
type EmailOAuthCallbackRequest struct {
	Code  string `json:"code"`
	State string `json:"state"`
	Error string `json:"error,omitempty"`
}

// EmailConnectionResponse represents an email connection
type EmailConnectionResponse struct {
	ID                string     `json:"id"`
	UserID            string     `json:"user_id"`
	ProviderAccountID string     `json:"provider_account_id"`
	Email             string     `json:"email"`
	Provider          string     `json:"provider"`
	Status            string     `json:"status"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	LastSyncAt        *time.Time `json:"last_sync_at,omitempty"`
}

// HandleOAuthCallback handles GET/POST /api/integrations/email/oauth/callback
func (h *EmailHandler) HandleOAuthCallback(w http.ResponseWriter, r *http.Request) {
	var code, state, oauthError string

	switch r.Method {
	case http.MethodGet:
		code = r.URL.Query().Get("code")
		state = r.URL.Query().Get("state")
		oauthError = r.URL.Query().Get("error")
	case http.MethodPost:
		var req EmailOAuthCallbackRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
			return
		}
		code = req.Code
		state = req.State
		oauthError = req.Error
	default:
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET/POST methods are allowed")
		return
	}

	// Check for OAuth error from provider
	if oauthError != "" {
		h.writeError(w, http.StatusBadRequest, "oauth_error", "OAuth authorization failed: "+oauthError)
		return
	}

	if code == "" || state == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "code and state parameters are required")
		return
	}

	// Validate and retrieve state
	h.mu.Lock()
	stateInfo, exists := h.states[state]
	if exists {
		delete(h.states, state)
	}
	h.mu.Unlock()

	if !exists {
		h.writeError(w, http.StatusBadRequest, "invalid_state", "Invalid or expired state parameter")
		return
	}

	// Check state age (10 minute max)
	if time.Since(stateInfo.CreatedAt) > 10*time.Minute {
		h.writeError(w, http.StatusBadRequest, "expired_state", "State parameter has expired")
		return
	}

	// Create OAuth client
	config := &google.Config{
		ClientID:     h.oauthConfig.ClientID,
		ClientSecret: h.oauthConfig.ClientSecret,
		RedirectURL:  h.oauthConfig.RedirectURL,
		Scopes:       stateInfo.Scopes,
	}

	oauthClient, err := google.NewClient(config)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "oauth_error", "Failed to create OAuth client: "+err.Error())
		return
	}

	// Exchange code for token
	ctx := r.Context()
	token, err := oauthClient.Exchange(ctx, code)
	if err != nil {
		h.writeError(w, http.StatusBadRequest, "exchange_failed", "Failed to exchange authorization code: "+err.Error())
		return
	}

	// Get user info from Google
	userInfo, err := oauthClient.GetUserInfo(ctx, token.AccessToken)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "user_info_failed", "Failed to get user info: "+err.Error())
		return
	}

	// Check if connection already exists for this provider account
	existingConn, err := h.entClient.EmailConnection.Query().
		Where(emailconnection.ProviderAccountID(userInfo.ID)).
		Only(ctx)

	var conn *ent.EmailConnection
	if err == nil {
		// Update existing connection
		conn, err = existingConn.Update().
			SetAccessToken(token.AccessToken).
			SetRefreshToken(token.RefreshToken).
			SetTokenExpiry(token.Expiry).
			SetStatus(emailconnection.StatusActive).
			SetEmail(userInfo.Email).
			Save(ctx)
		if err != nil {
			h.writeError(w, http.StatusInternalServerError, "update_failed", "Failed to update connection: "+err.Error())
			return
		}
	} else if ent.IsNotFound(err) {
		// Create new connection
		conn, err = h.entClient.EmailConnection.Create().
			SetID(uuid.New().String()).
			SetUserID(stateInfo.UserID).
			SetProviderAccountID(userInfo.ID).
			SetEmail(userInfo.Email).
			SetProvider(emailconnection.Provider(stateInfo.Provider)).
			SetAccessToken(token.AccessToken).
			SetRefreshToken(token.RefreshToken).
			SetTokenExpiry(token.Expiry).
			SetStatus(emailconnection.StatusActive).
			Save(ctx)
		if err != nil {
			h.writeError(w, http.StatusInternalServerError, "create_failed", "Failed to create connection: "+err.Error())
			return
		}
	} else {
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to check existing connection: "+err.Error())
		return
	}

	h.writeJSON(w, http.StatusOK, h.connectionToResponse(conn))
}

// HandleDisconnect handles DELETE /api/integrations/email/connections/{id}
func (h *EmailHandler) HandleDisconnect(w http.ResponseWriter, r *http.Request, connectionID string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	ctx := r.Context()

	// Get the connection
	conn, err := h.entClient.EmailConnection.Get(ctx, connectionID)
	if err != nil {
		if ent.IsNotFound(err) {
			h.writeError(w, http.StatusNotFound, "not_found", "Connection not found")
			return
		}
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to get connection: "+err.Error())
		return
	}

	// Optionally revoke the token with provider
	if conn.RefreshToken != "" {
		oauthClient, err := google.NewClient(h.oauthConfig)
		if err == nil {
			_ = oauthClient.RevokeToken(ctx, conn.RefreshToken)
		}
	}

	// Update status to revoked
	_, err = conn.Update().
		SetStatus(emailconnection.StatusRevoked).
		Save(ctx)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "update_failed", "Failed to revoke connection: "+err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ========================================
// Connection Management Handlers
// ========================================

// ListEmailConnectionsResponse represents a list of email connections
type ListEmailConnectionsResponse struct {
	Connections []*EmailConnectionResponse `json:"connections"`
	Total       int                        `json:"total"`
}

// HandleListConnections handles GET /api/integrations/email/connections
func (h *EmailHandler) HandleListConnections(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	ctx := r.Context()
	userID := r.URL.Query().Get("user_id")

	query := h.entClient.EmailConnection.Query()
	if userID != "" {
		query = query.Where(emailconnection.UserID(userID))
	}

	connections, err := query.All(ctx)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to list connections: "+err.Error())
		return
	}

	resp := ListEmailConnectionsResponse{
		Connections: make([]*EmailConnectionResponse, len(connections)),
		Total:       len(connections),
	}
	for i, conn := range connections {
		resp.Connections[i] = h.connectionToResponse(conn)
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleGetConnection handles GET /api/integrations/email/connections/{id}
func (h *EmailHandler) HandleGetConnection(w http.ResponseWriter, r *http.Request, connectionID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	ctx := r.Context()
	conn, err := h.entClient.EmailConnection.Get(ctx, connectionID)
	if err != nil {
		if ent.IsNotFound(err) {
			h.writeError(w, http.StatusNotFound, "not_found", "Connection not found")
			return
		}
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to get connection: "+err.Error())
		return
	}

	h.writeJSON(w, http.StatusOK, h.connectionToResponse(conn))
}

// HandleRefreshConnection handles POST /api/integrations/email/connections/{id}/refresh
func (h *EmailHandler) HandleRefreshConnection(w http.ResponseWriter, r *http.Request, connectionID string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	ctx := r.Context()
	conn, err := h.entClient.EmailConnection.Get(ctx, connectionID)
	if err != nil {
		if ent.IsNotFound(err) {
			h.writeError(w, http.StatusNotFound, "not_found", "Connection not found")
			return
		}
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to get connection: "+err.Error())
		return
	}

	if conn.RefreshToken == "" {
		h.writeError(w, http.StatusBadRequest, "no_refresh_token", "Connection has no refresh token")
		return
	}

	// Create OAuth client and refresh token
	oauthClient, err := google.NewClient(h.oauthConfig)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "oauth_error", "Failed to create OAuth client: "+err.Error())
		return
	}

	newToken, err := oauthClient.RefreshToken(ctx, conn.RefreshToken)
	if err != nil {
		// Mark connection as expired
		_, _ = conn.Update().
			SetStatus(emailconnection.StatusExpired).
			Save(ctx)
		h.writeError(w, http.StatusBadRequest, "refresh_failed", "Failed to refresh token: "+err.Error())
		return
	}

	// Update connection with new token
	conn, err = conn.Update().
		SetAccessToken(newToken.AccessToken).
		SetRefreshToken(newToken.RefreshToken).
		SetTokenExpiry(newToken.Expiry).
		SetStatus(emailconnection.StatusActive).
		Save(ctx)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "update_failed", "Failed to update connection: "+err.Error())
		return
	}

	h.writeJSON(w, http.StatusOK, h.connectionToResponse(conn))
}

// ========================================
// Label Management Handlers
// ========================================

// EmailLabelResponse represents an email label
type EmailLabelResponse struct {
	ID              string     `json:"id"`
	ConnectionID    string     `json:"connection_id"`
	ProviderLabelID string     `json:"provider_label_id"`
	Name            string     `json:"name"`
	DisplayName     string     `json:"display_name,omitempty"`
	LabelType       string     `json:"label_type"`
	ParentLabelID   *string    `json:"parent_label_id,omitempty"`
	SyncEnabled     bool       `json:"sync_enabled"`
	MessageCount    int64      `json:"message_count"`
	UnreadCount     int64      `json:"unread_count"`
	Color           *string    `json:"color,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	LastScannedAt   *time.Time `json:"last_scanned_at,omitempty"`
}

// ListEmailLabelsResponse represents a list of email labels
type ListEmailLabelsResponse struct {
	Labels []*EmailLabelResponse `json:"labels"`
	Total  int                   `json:"total"`
}

// CreateEmailLabelRequest represents a request to create/add a label
type CreateEmailLabelRequest struct {
	ProviderLabelID string  `json:"provider_label_id"`
	Name            string  `json:"name"`
	DisplayName     string  `json:"display_name,omitempty"`
	LabelType       string  `json:"label_type,omitempty"`
	ParentLabelID   *string `json:"parent_label_id,omitempty"`
	SyncEnabled     *bool   `json:"sync_enabled,omitempty"`
	Color           *string `json:"color,omitempty"`
}

// UpdateEmailLabelRequest represents a request to update a label
type UpdateEmailLabelRequest struct {
	DisplayName *string `json:"display_name,omitempty"`
	SyncEnabled *bool   `json:"sync_enabled,omitempty"`
	Color       *string `json:"color,omitempty"`
}

// HandleListLabels handles GET /api/integrations/email/connections/{id}/labels
func (h *EmailHandler) HandleListLabels(w http.ResponseWriter, r *http.Request, connectionID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	ctx := r.Context()

	// Verify connection exists
	_, err := h.entClient.EmailConnection.Get(ctx, connectionID)
	if err != nil {
		if ent.IsNotFound(err) {
			h.writeError(w, http.StatusNotFound, "not_found", "Connection not found")
			return
		}
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to get connection: "+err.Error())
		return
	}

	labels, err := h.entClient.EmailLabel.Query().
		Where(emaillabel.ConnectionID(connectionID)).
		All(ctx)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to list labels: "+err.Error())
		return
	}

	resp := ListEmailLabelsResponse{
		Labels: make([]*EmailLabelResponse, len(labels)),
		Total:  len(labels),
	}
	for i, label := range labels {
		resp.Labels[i] = h.labelToResponse(label)
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleCreateLabel handles POST /api/integrations/email/connections/{id}/labels
func (h *EmailHandler) HandleCreateLabel(w http.ResponseWriter, r *http.Request, connectionID string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req CreateEmailLabelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if req.ProviderLabelID == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "provider_label_id is required")
		return
	}
	if req.Name == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "name is required")
		return
	}

	ctx := r.Context()

	// Verify connection exists and is active
	conn, err := h.entClient.EmailConnection.Get(ctx, connectionID)
	if err != nil {
		if ent.IsNotFound(err) {
			h.writeError(w, http.StatusNotFound, "not_found", "Connection not found")
			return
		}
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to get connection: "+err.Error())
		return
	}

	if conn.Status != emailconnection.StatusActive {
		h.writeError(w, http.StatusBadRequest, "connection_inactive", "Connection is not active")
		return
	}

	// Check if label already exists
	existingCount, err := h.entClient.EmailLabel.Query().
		Where(
			emaillabel.ConnectionID(connectionID),
			emaillabel.ProviderLabelID(req.ProviderLabelID),
		).
		Count(ctx)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to check existing label: "+err.Error())
		return
	}
	if existingCount > 0 {
		h.writeError(w, http.StatusConflict, "already_exists", "Label is already being tracked")
		return
	}

	// Create label
	syncEnabled := true
	if req.SyncEnabled != nil {
		syncEnabled = *req.SyncEnabled
	}

	labelType := emaillabel.LabelTypeUser
	if req.LabelType != "" {
		switch req.LabelType {
		case "system":
			labelType = emaillabel.LabelTypeSystem
		case "user":
			labelType = emaillabel.LabelTypeUser
		case "category":
			labelType = emaillabel.LabelTypeCategory
		default:
			h.writeError(w, http.StatusBadRequest, "validation_error", "label_type must be one of: system, user, category")
			return
		}
	}

	labelCreate := h.entClient.EmailLabel.Create().
		SetID(uuid.New().String()).
		SetConnectionID(connectionID).
		SetProviderLabelID(req.ProviderLabelID).
		SetName(req.Name).
		SetLabelType(labelType).
		SetSyncEnabled(syncEnabled)

	if req.DisplayName != "" {
		labelCreate = labelCreate.SetDisplayName(req.DisplayName)
	}
	if req.ParentLabelID != nil {
		labelCreate = labelCreate.SetParentLabelID(*req.ParentLabelID)
	}
	if req.Color != nil {
		labelCreate = labelCreate.SetColor(*req.Color)
	}

	label, err := labelCreate.Save(ctx)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "create_failed", "Failed to create label: "+err.Error())
		return
	}

	h.writeJSON(w, http.StatusCreated, h.labelToResponse(label))
}

// HandleGetLabel handles GET /api/integrations/email/labels/{id}
func (h *EmailHandler) HandleGetLabel(w http.ResponseWriter, r *http.Request, labelID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	ctx := r.Context()
	label, err := h.entClient.EmailLabel.Get(ctx, labelID)
	if err != nil {
		if ent.IsNotFound(err) {
			h.writeError(w, http.StatusNotFound, "not_found", "Label not found")
			return
		}
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to get label: "+err.Error())
		return
	}

	h.writeJSON(w, http.StatusOK, h.labelToResponse(label))
}

// HandleUpdateLabel handles PUT/PATCH /api/integrations/email/labels/{id}
func (h *EmailHandler) HandleUpdateLabel(w http.ResponseWriter, r *http.Request, labelID string) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PUT/PATCH methods are allowed")
		return
	}

	var req UpdateEmailLabelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	ctx := r.Context()
	label, err := h.entClient.EmailLabel.Get(ctx, labelID)
	if err != nil {
		if ent.IsNotFound(err) {
			h.writeError(w, http.StatusNotFound, "not_found", "Label not found")
			return
		}
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to get label: "+err.Error())
		return
	}

	update := label.Update()
	if req.DisplayName != nil {
		update = update.SetDisplayName(*req.DisplayName)
	}
	if req.SyncEnabled != nil {
		update = update.SetSyncEnabled(*req.SyncEnabled)
	}
	if req.Color != nil {
		update = update.SetColor(*req.Color)
	}

	label, err = update.Save(ctx)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "update_failed", "Failed to update label: "+err.Error())
		return
	}

	h.writeJSON(w, http.StatusOK, h.labelToResponse(label))
}

// HandleDeleteLabel handles DELETE /api/integrations/email/labels/{id}
func (h *EmailHandler) HandleDeleteLabel(w http.ResponseWriter, r *http.Request, labelID string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	ctx := r.Context()
	err := h.entClient.EmailLabel.DeleteOneID(labelID).Exec(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			h.writeError(w, http.StatusNotFound, "not_found", "Label not found")
			return
		}
		h.writeError(w, http.StatusInternalServerError, "delete_failed", "Failed to delete label: "+err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// HandleFetchLabels handles POST /api/integrations/email/connections/{id}/labels/fetch
// This fetches labels from the email provider and syncs them
func (h *EmailHandler) HandleFetchLabels(w http.ResponseWriter, r *http.Request, connectionID string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	ctx := r.Context()

	// Get connection
	conn, err := h.entClient.EmailConnection.Get(ctx, connectionID)
	if err != nil {
		if ent.IsNotFound(err) {
			h.writeError(w, http.StatusNotFound, "not_found", "Connection not found")
			return
		}
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to get connection: "+err.Error())
		return
	}

	if conn.Status != emailconnection.StatusActive {
		h.writeError(w, http.StatusBadRequest, "connection_inactive", "Connection is not active")
		return
	}

	// Create Gmail client
	oauthClient, err := google.NewClient(h.oauthConfig)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "oauth_error", "Failed to create OAuth client: "+err.Error())
		return
	}

	token := &google.Token{
		AccessToken:  conn.AccessToken,
		RefreshToken: conn.RefreshToken,
		Expiry:       conn.TokenExpiry,
	}
	tokenSource := google.NewTokenSource(oauthClient, token)
	gmailClient := google.NewGmailClient(tokenSource)

	// Fetch labels from Gmail
	gmailLabels, err := gmailClient.ListLabels(ctx)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "gmail_error", "Failed to fetch labels: "+err.Error())
		return
	}

	// Sync labels to database
	var syncedLabels []*ent.EmailLabel
	for _, gl := range gmailLabels {
		// Check if label already exists
		existingLabel, err := h.entClient.EmailLabel.Query().
			Where(
				emaillabel.ConnectionID(connectionID),
				emaillabel.ProviderLabelID(gl.ID),
			).
			Only(ctx)

		if err == nil {
			// Update existing label
			updated, err := existingLabel.Update().
				SetName(gl.Name).
				SetMessageCount(int64(gl.MessagesTotal)).
				SetUnreadCount(int64(gl.MessagesUnread)).
				Save(ctx)
			if err == nil {
				syncedLabels = append(syncedLabels, updated)
			}
		} else if ent.IsNotFound(err) {
			// Determine label type
			labelType := emaillabel.LabelTypeUser
			if gl.Type == "system" {
				labelType = emaillabel.LabelTypeSystem
			}

			// Create new label
			newLabel, err := h.entClient.EmailLabel.Create().
				SetID(uuid.New().String()).
				SetConnectionID(connectionID).
				SetProviderLabelID(gl.ID).
				SetName(gl.Name).
				SetLabelType(labelType).
				SetSyncEnabled(false). // Default to not syncing
				SetMessageCount(int64(gl.MessagesTotal)).
				SetUnreadCount(int64(gl.MessagesUnread)).
				Save(ctx)
			if err == nil {
				syncedLabels = append(syncedLabels, newLabel)
			}
		}
	}

	resp := ListEmailLabelsResponse{
		Labels: make([]*EmailLabelResponse, len(syncedLabels)),
		Total:  len(syncedLabels),
	}
	for i, label := range syncedLabels {
		resp.Labels[i] = h.labelToResponse(label)
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// ========================================
// Sync Handlers
// ========================================

// EmailTriggerSyncRequest represents a request to trigger a sync
type EmailTriggerSyncRequest struct {
	SyncType string `json:"sync_type"` // full, incremental, manual
	LabelID  string `json:"label_id,omitempty"`
}

// EmailSyncResponse represents a sync operation result
type EmailSyncResponse struct {
	SyncID                string     `json:"sync_id"`
	ConnectionID          string     `json:"connection_id"`
	LabelID               *string    `json:"label_id,omitempty"`
	SyncType              string     `json:"sync_type"`
	Status                string     `json:"status"`
	StartedAt             time.Time  `json:"started_at"`
	CompletedAt           *time.Time `json:"completed_at,omitempty"`
	MessagesScanned       int        `json:"messages_scanned"`
	MessagesDownloaded    int        `json:"messages_downloaded"`
	MessagesIndexed       int        `json:"messages_indexed"`
	MessagesFailed        int        `json:"messages_failed"`
	AttachmentsDownloaded int        `json:"attachments_downloaded"`
	BytesTransferred      int64      `json:"bytes_transferred"`
	ErrorMessage          *string    `json:"error_message,omitempty"`
}

// HandleTriggerSync handles POST /api/integrations/email/connections/{id}/sync
func (h *EmailHandler) HandleTriggerSync(w http.ResponseWriter, r *http.Request, connectionID string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req EmailTriggerSyncRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	// Default to manual sync
	if req.SyncType == "" {
		req.SyncType = "manual"
	}

	// Validate sync type
	switch req.SyncType {
	case "full", "incremental", "manual":
		// valid
	default:
		h.writeError(w, http.StatusBadRequest, "validation_error", "sync_type must be one of: full, incremental, manual")
		return
	}

	// Use a background context for the sync operation
	syncCtx := context.Background()
	result, err := h.syncService.SyncLabel(syncCtx, connectionID, req.LabelID, req.SyncType)
	if err != nil {
		switch err {
		case integration.ErrEmailConnectionNotFound:
			h.writeError(w, http.StatusNotFound, "not_found", "Connection not found")
		case integration.ErrEmailConnectionInactive:
			h.writeError(w, http.StatusBadRequest, "connection_inactive", "Connection is not active")
		case integration.ErrEmailSyncAlreadyRunning:
			h.writeError(w, http.StatusConflict, "sync_running", "A sync is already running for this connection")
		case integration.ErrEmailLabelNotFound:
			h.writeError(w, http.StatusNotFound, "label_not_found", "Label not found")
		case integration.ErrNoEmailLabelsToSync:
			h.writeError(w, http.StatusBadRequest, "no_labels", "No labels configured for sync")
		default:
			h.writeError(w, http.StatusInternalServerError, "sync_failed", "Sync failed: "+err.Error())
		}
		return
	}

	h.writeJSON(w, http.StatusAccepted, h.emailSyncResultToResponse(result))
}

// HandleGetSyncStatus handles GET /api/integrations/email/syncs/{id}
func (h *EmailHandler) HandleGetSyncStatus(w http.ResponseWriter, r *http.Request, syncID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	ctx := r.Context()
	result, err := h.syncService.GetSyncStatus(ctx, syncID)
	if err != nil {
		if err == integration.ErrEmailSyncNotFound {
			h.writeError(w, http.StatusNotFound, "not_found", "Sync not found")
			return
		}
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to get sync status: "+err.Error())
		return
	}

	h.writeJSON(w, http.StatusOK, h.emailSyncResultToResponse(result))
}

// ListEmailSyncsResponse represents a list of syncs
type ListEmailSyncsResponse struct {
	Syncs []*EmailSyncResponse `json:"syncs"`
	Total int                  `json:"total"`
}

// HandleListSyncs handles GET /api/integrations/email/connections/{id}/syncs
func (h *EmailHandler) HandleListSyncs(w http.ResponseWriter, r *http.Request, connectionID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	ctx := r.Context()

	// Verify connection exists
	_, err := h.entClient.EmailConnection.Get(ctx, connectionID)
	if err != nil {
		if ent.IsNotFound(err) {
			h.writeError(w, http.StatusNotFound, "not_found", "Connection not found")
			return
		}
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to get connection: "+err.Error())
		return
	}

	results, err := h.syncService.GetSyncHistory(ctx, connectionID, 50)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to get sync history: "+err.Error())
		return
	}

	resp := ListEmailSyncsResponse{
		Syncs: make([]*EmailSyncResponse, len(results)),
		Total: len(results),
	}
	for i, result := range results {
		resp.Syncs[i] = h.emailSyncResultToResponse(result)
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleCancelSync handles POST /api/integrations/email/connections/{id}/sync/cancel
func (h *EmailHandler) HandleCancelSync(w http.ResponseWriter, r *http.Request, connectionID string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	err := h.syncService.CancelSync(connectionID)
	if err != nil {
		if err == integration.ErrEmailSyncNotFound {
			h.writeError(w, http.StatusNotFound, "not_found", "No active sync found for this connection")
			return
		}
		h.writeError(w, http.StatusInternalServerError, "cancel_failed", "Failed to cancel sync: "+err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ========================================
// Receipt and Attachment Handlers
// ========================================

// HandleExtractReceipts handles GET /api/integrations/email/labels/{id}/receipts
func (h *EmailHandler) HandleExtractReceipts(w http.ResponseWriter, r *http.Request, labelID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	ctx := r.Context()

	// Get the label to find the connection ID
	label, err := h.entClient.EmailLabel.Get(ctx, labelID)
	if err != nil {
		if ent.IsNotFound(err) {
			h.writeError(w, http.StatusNotFound, "not_found", "Label not found")
			return
		}
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to get label: "+err.Error())
		return
	}

	receipts, err := h.syncService.ExtractReceiptsFromLabel(ctx, label.ConnectionID, labelID)
	if err != nil {
		switch err {
		case integration.ErrEmailConnectionNotFound:
			h.writeError(w, http.StatusNotFound, "connection_not_found", "Connection not found")
		case integration.ErrEmailConnectionInactive:
			h.writeError(w, http.StatusBadRequest, "connection_inactive", "Connection is not active")
		default:
			h.writeError(w, http.StatusInternalServerError, "extraction_failed", "Failed to extract receipts: "+err.Error())
		}
		return
	}

	h.writeJSON(w, http.StatusOK, map[string]any{
		"receipts": receipts,
		"total":    len(receipts),
	})
}

// HandleDownloadAttachment handles GET /api/integrations/email/connections/{connID}/messages/{msgID}/attachments/{attID}
func (h *EmailHandler) HandleDownloadAttachment(w http.ResponseWriter, r *http.Request, connectionID, messageID, attachmentID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	ctx := r.Context()
	data, attachmentInfo, err := h.syncService.DownloadAttachment(ctx, connectionID, messageID, attachmentID)
	if err != nil {
		switch err {
		case integration.ErrEmailConnectionNotFound:
			h.writeError(w, http.StatusNotFound, "connection_not_found", "Connection not found")
		case integration.ErrEmailConnectionInactive:
			h.writeError(w, http.StatusBadRequest, "connection_inactive", "Connection is not active")
		case integration.ErrAttachmentDownloadFail:
			h.writeError(w, http.StatusNotFound, "attachment_not_found", "Attachment not found")
		default:
			h.writeError(w, http.StatusInternalServerError, "download_failed", "Failed to download attachment: "+err.Error())
		}
		return
	}

	// Set appropriate headers
	w.Header().Set("Content-Type", attachmentInfo.MimeType)
	w.Header().Set("Content-Disposition", "attachment; filename=\""+attachmentInfo.Filename+"\"")
	w.Header().Set("Content-Length", string(rune(len(data))))
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

// ========================================
// Helper Methods
// ========================================

// cleanupOldStates removes OAuth states older than 10 minutes
func (h *EmailHandler) cleanupOldStates() {
	h.mu.Lock()
	defer h.mu.Unlock()

	cutoff := time.Now().Add(-10 * time.Minute)
	for state, data := range h.states {
		if data.CreatedAt.Before(cutoff) {
			delete(h.states, state)
		}
	}
}

// connectionToResponse converts an ent connection to response format
func (h *EmailHandler) connectionToResponse(conn *ent.EmailConnection) *EmailConnectionResponse {
	resp := &EmailConnectionResponse{
		ID:                conn.ID,
		UserID:            conn.UserID,
		ProviderAccountID: conn.ProviderAccountID,
		Email:             conn.Email,
		Provider:          string(conn.Provider),
		Status:            string(conn.Status),
		CreatedAt:         conn.CreatedAt,
		UpdatedAt:         conn.UpdatedAt,
	}
	if conn.LastSyncAt != nil {
		resp.LastSyncAt = conn.LastSyncAt
	}
	return resp
}

// labelToResponse converts an ent label to response format
func (h *EmailHandler) labelToResponse(label *ent.EmailLabel) *EmailLabelResponse {
	resp := &EmailLabelResponse{
		ID:              label.ID,
		ConnectionID:    label.ConnectionID,
		ProviderLabelID: label.ProviderLabelID,
		Name:            label.Name,
		DisplayName:     label.DisplayName,
		LabelType:       string(label.LabelType),
		SyncEnabled:     label.SyncEnabled,
		MessageCount:    label.MessageCount,
		UnreadCount:     label.UnreadCount,
		CreatedAt:       label.CreatedAt,
		UpdatedAt:       label.UpdatedAt,
	}
	if label.ParentLabelID != nil {
		resp.ParentLabelID = label.ParentLabelID
	}
	if label.Color != nil {
		resp.Color = label.Color
	}
	if label.LastScannedAt != nil {
		resp.LastScannedAt = label.LastScannedAt
	}
	return resp
}

// emailSyncResultToResponse converts a sync result to response format
func (h *EmailHandler) emailSyncResultToResponse(result *integration.EmailSyncResult) *EmailSyncResponse {
	return &EmailSyncResponse{
		SyncID:                result.SyncID,
		ConnectionID:          result.ConnectionID,
		LabelID:               result.LabelID,
		SyncType:              result.SyncType,
		Status:                result.Status,
		StartedAt:             result.StartedAt,
		CompletedAt:           result.CompletedAt,
		MessagesScanned:       result.MessagesScanned,
		MessagesDownloaded:    result.MessagesDownloaded,
		MessagesIndexed:       result.MessagesIndexed,
		MessagesFailed:        result.MessagesFailed,
		AttachmentsDownloaded: result.AttachmentsDownloaded,
		BytesTransferred:      result.BytesTransferred,
		ErrorMessage:          result.ErrorMessage,
	}
}

// writeJSON writes a JSON response
func (h *EmailHandler) writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeError writes an error response
func (h *EmailHandler) writeError(w http.ResponseWriter, status int, errCode string, message string) {
	h.writeJSON(w, status, ErrorResponse{
		Error:   errCode,
		Message: message,
	})
}
