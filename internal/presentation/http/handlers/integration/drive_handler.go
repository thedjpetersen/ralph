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
	"clockzen-next/internal/ent/googledriveconnection"
	"clockzen-next/internal/ent/googledrivefolder"
	"clockzen-next/internal/infrastructure/google"
)

// DriveHandler handles HTTP requests for Google Drive integration
type DriveHandler struct {
	mu          sync.RWMutex
	entClient   *ent.Client
	oauthConfig *google.Config
	syncService *integration.DriveSyncService
	states      map[string]stateData // CSRF state storage
}

// stateData holds OAuth state information
type stateData struct {
	UserID    string
	CreatedAt time.Time
	Scopes    []string
}

// NewDriveHandler creates a new DriveHandler instance
func NewDriveHandler(entClient *ent.Client, oauthConfig *google.Config) *DriveHandler {
	syncService := integration.NewDriveSyncServiceWithDefaults(entClient, oauthConfig)
	return &DriveHandler{
		entClient:   entClient,
		oauthConfig: oauthConfig,
		syncService: syncService,
		states:      make(map[string]stateData),
	}
}

// NewDriveHandlerWithSyncService creates a handler with a custom sync service
func NewDriveHandlerWithSyncService(entClient *ent.Client, oauthConfig *google.Config, syncService *integration.DriveSyncService) *DriveHandler {
	return &DriveHandler{
		entClient:   entClient,
		oauthConfig: oauthConfig,
		syncService: syncService,
		states:      make(map[string]stateData),
	}
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// ========================================
// OAuth Handlers
// ========================================

// InitiateOAuthRequest represents a request to initiate OAuth flow
type InitiateOAuthRequest struct {
	UserID string   `json:"user_id"`
	Scopes []string `json:"scopes,omitempty"`
}

// InitiateOAuthResponse represents the response with authorization URL
type InitiateOAuthResponse struct {
	AuthorizationURL string `json:"authorization_url"`
	State            string `json:"state"`
}

// HandleInitiateOAuth handles POST /api/integrations/drive/oauth/initiate
func (h *DriveHandler) HandleInitiateOAuth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req InitiateOAuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if req.UserID == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "user_id is required")
		return
	}

	// Generate state for CSRF protection
	state := uuid.New().String()

	// Determine scopes
	scopes := req.Scopes
	if len(scopes) == 0 {
		scopes = google.DriveScopes()
	}

	// Store state with user context
	h.mu.Lock()
	h.states[state] = stateData{
		UserID:    req.UserID,
		CreatedAt: time.Now(),
		Scopes:    scopes,
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

	h.writeJSON(w, http.StatusOK, InitiateOAuthResponse{
		AuthorizationURL: authURL,
		State:            state,
	})
}

// OAuthCallbackRequest represents the OAuth callback parameters
type OAuthCallbackRequest struct {
	Code  string `json:"code"`
	State string `json:"state"`
	Error string `json:"error,omitempty"`
}

// ConnectionResponse represents a Google Drive connection
type ConnectionResponse struct {
	ID              string     `json:"id"`
	UserID          string     `json:"user_id"`
	GoogleAccountID string     `json:"google_account_id"`
	Email           string     `json:"email"`
	Status          string     `json:"status"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	LastSyncAt      *time.Time `json:"last_sync_at,omitempty"`
}

// HandleOAuthCallback handles GET/POST /api/integrations/drive/oauth/callback
func (h *DriveHandler) HandleOAuthCallback(w http.ResponseWriter, r *http.Request) {
	var code, state, oauthError string

	switch r.Method {
	case http.MethodGet:
		code = r.URL.Query().Get("code")
		state = r.URL.Query().Get("state")
		oauthError = r.URL.Query().Get("error")
	case http.MethodPost:
		var req OAuthCallbackRequest
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

	// Check for OAuth error from Google
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

	// Check if connection already exists for this Google account
	existingConn, err := h.entClient.GoogleDriveConnection.Query().
		Where(googledriveconnection.GoogleAccountID(userInfo.ID)).
		Only(ctx)

	var conn *ent.GoogleDriveConnection
	if err == nil {
		// Update existing connection
		conn, err = existingConn.Update().
			SetAccessToken(token.AccessToken).
			SetRefreshToken(token.RefreshToken).
			SetTokenExpiry(token.Expiry).
			SetStatus(googledriveconnection.StatusActive).
			SetEmail(userInfo.Email).
			Save(ctx)
		if err != nil {
			h.writeError(w, http.StatusInternalServerError, "update_failed", "Failed to update connection: "+err.Error())
			return
		}
	} else if ent.IsNotFound(err) {
		// Create new connection
		conn, err = h.entClient.GoogleDriveConnection.Create().
			SetID(uuid.New().String()).
			SetUserID(stateInfo.UserID).
			SetGoogleAccountID(userInfo.ID).
			SetEmail(userInfo.Email).
			SetAccessToken(token.AccessToken).
			SetRefreshToken(token.RefreshToken).
			SetTokenExpiry(token.Expiry).
			SetStatus(googledriveconnection.StatusActive).
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

// HandleDisconnect handles DELETE /api/integrations/drive/connections/{id}
func (h *DriveHandler) HandleDisconnect(w http.ResponseWriter, r *http.Request, connectionID string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	ctx := r.Context()

	// Get the connection
	conn, err := h.entClient.GoogleDriveConnection.Get(ctx, connectionID)
	if err != nil {
		if ent.IsNotFound(err) {
			h.writeError(w, http.StatusNotFound, "not_found", "Connection not found")
			return
		}
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to get connection: "+err.Error())
		return
	}

	// Optionally revoke the token with Google
	if conn.RefreshToken != "" {
		oauthClient, err := google.NewClient(h.oauthConfig)
		if err == nil {
			_ = oauthClient.RevokeToken(ctx, conn.RefreshToken)
		}
	}

	// Update status to revoked
	_, err = conn.Update().
		SetStatus(googledriveconnection.StatusRevoked).
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

// ListConnectionsResponse represents a list of connections
type ListConnectionsResponse struct {
	Connections []*ConnectionResponse `json:"connections"`
	Total       int                   `json:"total"`
}

// HandleListConnections handles GET /api/integrations/drive/connections
func (h *DriveHandler) HandleListConnections(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	ctx := r.Context()
	userID := r.URL.Query().Get("user_id")

	query := h.entClient.GoogleDriveConnection.Query()
	if userID != "" {
		query = query.Where(googledriveconnection.UserID(userID))
	}

	connections, err := query.All(ctx)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to list connections: "+err.Error())
		return
	}

	resp := ListConnectionsResponse{
		Connections: make([]*ConnectionResponse, len(connections)),
		Total:       len(connections),
	}
	for i, conn := range connections {
		resp.Connections[i] = h.connectionToResponse(conn)
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleGetConnection handles GET /api/integrations/drive/connections/{id}
func (h *DriveHandler) HandleGetConnection(w http.ResponseWriter, r *http.Request, connectionID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	ctx := r.Context()
	conn, err := h.entClient.GoogleDriveConnection.Get(ctx, connectionID)
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

// HandleRefreshConnection handles POST /api/integrations/drive/connections/{id}/refresh
func (h *DriveHandler) HandleRefreshConnection(w http.ResponseWriter, r *http.Request, connectionID string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	ctx := r.Context()
	conn, err := h.entClient.GoogleDriveConnection.Get(ctx, connectionID)
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
			SetStatus(googledriveconnection.StatusExpired).
			Save(ctx)
		h.writeError(w, http.StatusBadRequest, "refresh_failed", "Failed to refresh token: "+err.Error())
		return
	}

	// Update connection with new token
	conn, err = conn.Update().
		SetAccessToken(newToken.AccessToken).
		SetRefreshToken(newToken.RefreshToken).
		SetTokenExpiry(newToken.Expiry).
		SetStatus(googledriveconnection.StatusActive).
		Save(ctx)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "update_failed", "Failed to update connection: "+err.Error())
		return
	}

	h.writeJSON(w, http.StatusOK, h.connectionToResponse(conn))
}

// ========================================
// Folder Management Handlers
// ========================================

// FolderResponse represents a tracked folder
type FolderResponse struct {
	ID             string     `json:"id"`
	ConnectionID   string     `json:"connection_id"`
	DriveFolderID  string     `json:"drive_folder_id"`
	Name           string     `json:"name"`
	Path           string     `json:"path,omitempty"`
	ParentFolderID *string    `json:"parent_folder_id,omitempty"`
	IsRoot         bool       `json:"is_root"`
	SyncEnabled    bool       `json:"sync_enabled"`
	SyncDirection  string     `json:"sync_direction"`
	FileCount      int64      `json:"file_count"`
	TotalSizeBytes int64      `json:"total_size_bytes"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	LastScannedAt  *time.Time `json:"last_scanned_at,omitempty"`
}

// ListFoldersResponse represents a list of folders
type ListFoldersResponse struct {
	Folders []*FolderResponse `json:"folders"`
	Total   int               `json:"total"`
}

// CreateFolderRequest represents a request to add a folder
type CreateFolderRequest struct {
	DriveFolderID  string  `json:"drive_folder_id"`
	Name           string  `json:"name"`
	Path           string  `json:"path,omitempty"`
	ParentFolderID *string `json:"parent_folder_id,omitempty"`
	IsRoot         bool    `json:"is_root"`
	SyncEnabled    *bool   `json:"sync_enabled,omitempty"`
	SyncDirection  string  `json:"sync_direction,omitempty"`
}

// UpdateFolderRequest represents a request to update a folder
type UpdateFolderRequest struct {
	Name          *string `json:"name,omitempty"`
	SyncEnabled   *bool   `json:"sync_enabled,omitempty"`
	SyncDirection *string `json:"sync_direction,omitempty"`
}

// HandleListFolders handles GET /api/integrations/drive/connections/{id}/folders
func (h *DriveHandler) HandleListFolders(w http.ResponseWriter, r *http.Request, connectionID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	ctx := r.Context()

	// Verify connection exists
	_, err := h.entClient.GoogleDriveConnection.Get(ctx, connectionID)
	if err != nil {
		if ent.IsNotFound(err) {
			h.writeError(w, http.StatusNotFound, "not_found", "Connection not found")
			return
		}
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to get connection: "+err.Error())
		return
	}

	folders, err := h.entClient.GoogleDriveFolder.Query().
		Where(googledrivefolder.ConnectionID(connectionID)).
		All(ctx)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to list folders: "+err.Error())
		return
	}

	resp := ListFoldersResponse{
		Folders: make([]*FolderResponse, len(folders)),
		Total:   len(folders),
	}
	for i, folder := range folders {
		resp.Folders[i] = h.folderToResponse(folder)
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleCreateFolder handles POST /api/integrations/drive/connections/{id}/folders
func (h *DriveHandler) HandleCreateFolder(w http.ResponseWriter, r *http.Request, connectionID string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req CreateFolderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if req.DriveFolderID == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "drive_folder_id is required")
		return
	}
	if req.Name == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "name is required")
		return
	}

	ctx := r.Context()

	// Verify connection exists and is active
	conn, err := h.entClient.GoogleDriveConnection.Get(ctx, connectionID)
	if err != nil {
		if ent.IsNotFound(err) {
			h.writeError(w, http.StatusNotFound, "not_found", "Connection not found")
			return
		}
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to get connection: "+err.Error())
		return
	}

	if conn.Status != googledriveconnection.StatusActive {
		h.writeError(w, http.StatusBadRequest, "connection_inactive", "Connection is not active")
		return
	}

	// Check if folder already exists
	existingCount, err := h.entClient.GoogleDriveFolder.Query().
		Where(
			googledrivefolder.ConnectionID(connectionID),
			googledrivefolder.DriveFolderID(req.DriveFolderID),
		).
		Count(ctx)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to check existing folder: "+err.Error())
		return
	}
	if existingCount > 0 {
		h.writeError(w, http.StatusConflict, "already_exists", "Folder is already being tracked")
		return
	}

	// Create folder
	syncEnabled := true
	if req.SyncEnabled != nil {
		syncEnabled = *req.SyncEnabled
	}

	syncDirection := googledrivefolder.SyncDirectionDownload
	if req.SyncDirection != "" {
		switch req.SyncDirection {
		case "download":
			syncDirection = googledrivefolder.SyncDirectionDownload
		case "upload":
			syncDirection = googledrivefolder.SyncDirectionUpload
		case "bidirectional":
			syncDirection = googledrivefolder.SyncDirectionBidirectional
		default:
			h.writeError(w, http.StatusBadRequest, "validation_error", "sync_direction must be one of: download, upload, bidirectional")
			return
		}
	}

	folderCreate := h.entClient.GoogleDriveFolder.Create().
		SetID(uuid.New().String()).
		SetConnectionID(connectionID).
		SetDriveFolderID(req.DriveFolderID).
		SetName(req.Name).
		SetIsRoot(req.IsRoot).
		SetSyncEnabled(syncEnabled).
		SetSyncDirection(syncDirection)

	if req.Path != "" {
		folderCreate = folderCreate.SetPath(req.Path)
	}
	if req.ParentFolderID != nil {
		folderCreate = folderCreate.SetParentFolderID(*req.ParentFolderID)
	}

	folder, err := folderCreate.Save(ctx)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "create_failed", "Failed to create folder: "+err.Error())
		return
	}

	h.writeJSON(w, http.StatusCreated, h.folderToResponse(folder))
}

// HandleGetFolder handles GET /api/integrations/drive/folders/{id}
func (h *DriveHandler) HandleGetFolder(w http.ResponseWriter, r *http.Request, folderID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	ctx := r.Context()
	folder, err := h.entClient.GoogleDriveFolder.Get(ctx, folderID)
	if err != nil {
		if ent.IsNotFound(err) {
			h.writeError(w, http.StatusNotFound, "not_found", "Folder not found")
			return
		}
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to get folder: "+err.Error())
		return
	}

	h.writeJSON(w, http.StatusOK, h.folderToResponse(folder))
}

// HandleUpdateFolder handles PUT/PATCH /api/integrations/drive/folders/{id}
func (h *DriveHandler) HandleUpdateFolder(w http.ResponseWriter, r *http.Request, folderID string) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PUT/PATCH methods are allowed")
		return
	}

	var req UpdateFolderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	ctx := r.Context()
	folder, err := h.entClient.GoogleDriveFolder.Get(ctx, folderID)
	if err != nil {
		if ent.IsNotFound(err) {
			h.writeError(w, http.StatusNotFound, "not_found", "Folder not found")
			return
		}
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to get folder: "+err.Error())
		return
	}

	update := folder.Update()
	if req.Name != nil {
		update = update.SetName(*req.Name)
	}
	if req.SyncEnabled != nil {
		update = update.SetSyncEnabled(*req.SyncEnabled)
	}
	if req.SyncDirection != nil {
		switch *req.SyncDirection {
		case "download":
			update = update.SetSyncDirection(googledrivefolder.SyncDirectionDownload)
		case "upload":
			update = update.SetSyncDirection(googledrivefolder.SyncDirectionUpload)
		case "bidirectional":
			update = update.SetSyncDirection(googledrivefolder.SyncDirectionBidirectional)
		default:
			h.writeError(w, http.StatusBadRequest, "validation_error", "sync_direction must be one of: download, upload, bidirectional")
			return
		}
	}

	folder, err = update.Save(ctx)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "update_failed", "Failed to update folder: "+err.Error())
		return
	}

	h.writeJSON(w, http.StatusOK, h.folderToResponse(folder))
}

// HandleDeleteFolder handles DELETE /api/integrations/drive/folders/{id}
func (h *DriveHandler) HandleDeleteFolder(w http.ResponseWriter, r *http.Request, folderID string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	ctx := r.Context()
	err := h.entClient.GoogleDriveFolder.DeleteOneID(folderID).Exec(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			h.writeError(w, http.StatusNotFound, "not_found", "Folder not found")
			return
		}
		h.writeError(w, http.StatusInternalServerError, "delete_failed", "Failed to delete folder: "+err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// HandleBrowseDrive handles GET /api/integrations/drive/connections/{id}/browse
func (h *DriveHandler) HandleBrowseDrive(w http.ResponseWriter, r *http.Request, connectionID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	ctx := r.Context()
	folderID := r.URL.Query().Get("folder_id")
	if folderID == "" {
		folderID = "root"
	}

	// Get connection
	conn, err := h.entClient.GoogleDriveConnection.Get(ctx, connectionID)
	if err != nil {
		if ent.IsNotFound(err) {
			h.writeError(w, http.StatusNotFound, "not_found", "Connection not found")
			return
		}
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to get connection: "+err.Error())
		return
	}

	if conn.Status != googledriveconnection.StatusActive {
		h.writeError(w, http.StatusBadRequest, "connection_inactive", "Connection is not active")
		return
	}

	// Create Drive client
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
	driveClient := google.NewDriveClient(tokenSource)

	// List folder contents
	files, err := driveClient.ListFolder(ctx, folderID, google.ListFilesOptions{
		PageSize: 100,
	})
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "drive_error", "Failed to list Drive folder: "+err.Error())
		return
	}

	h.writeJSON(w, http.StatusOK, files)
}

// ========================================
// Sync Handlers
// ========================================

// TriggerSyncRequest represents a request to trigger a sync
type TriggerSyncRequest struct {
	SyncType string `json:"sync_type"` // full, incremental, manual
	FolderID string `json:"folder_id,omitempty"`
}

// SyncResponse represents a sync operation result
type SyncResponse struct {
	SyncID           string     `json:"sync_id"`
	ConnectionID     string     `json:"connection_id"`
	FolderID         *string    `json:"folder_id,omitempty"`
	SyncType         string     `json:"sync_type"`
	Status           string     `json:"status"`
	StartedAt        time.Time  `json:"started_at"`
	CompletedAt      *time.Time `json:"completed_at,omitempty"`
	FilesScanned     int        `json:"files_scanned"`
	FilesDownloaded  int        `json:"files_downloaded"`
	FilesUploaded    int        `json:"files_uploaded"`
	FilesDeleted     int        `json:"files_deleted"`
	FilesFailed      int        `json:"files_failed"`
	BytesTransferred int64      `json:"bytes_transferred"`
	ErrorMessage     *string    `json:"error_message,omitempty"`
}

// HandleTriggerSync handles POST /api/integrations/drive/connections/{id}/sync
func (h *DriveHandler) HandleTriggerSync(w http.ResponseWriter, r *http.Request, connectionID string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req TriggerSyncRequest
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

	ctx := r.Context()

	// Use a background context for the sync operation
	syncCtx := context.Background()
	result, err := h.syncService.SyncFolder(syncCtx, connectionID, req.FolderID, req.SyncType)
	if err != nil {
		switch err {
		case integration.ErrConnectionNotFound:
			h.writeError(w, http.StatusNotFound, "not_found", "Connection not found")
		case integration.ErrConnectionInactive:
			h.writeError(w, http.StatusBadRequest, "connection_inactive", "Connection is not active")
		case integration.ErrSyncAlreadyRunning:
			h.writeError(w, http.StatusConflict, "sync_running", "A sync is already running for this connection")
		case integration.ErrFolderNotFound:
			h.writeError(w, http.StatusNotFound, "folder_not_found", "Folder not found")
		case integration.ErrNoFoldersToSync:
			h.writeError(w, http.StatusBadRequest, "no_folders", "No folders configured for sync")
		default:
			h.writeError(w, http.StatusInternalServerError, "sync_failed", "Sync failed: "+err.Error())
		}
		return
	}

	// Mark request context as done to prevent handler from blocking
	_ = ctx

	h.writeJSON(w, http.StatusAccepted, h.syncResultToResponse(result))
}

// HandleGetSyncStatus handles GET /api/integrations/drive/syncs/{id}
func (h *DriveHandler) HandleGetSyncStatus(w http.ResponseWriter, r *http.Request, syncID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	ctx := r.Context()
	result, err := h.syncService.GetSyncStatus(ctx, syncID)
	if err != nil {
		if err == integration.ErrSyncNotFound {
			h.writeError(w, http.StatusNotFound, "not_found", "Sync not found")
			return
		}
		h.writeError(w, http.StatusInternalServerError, "query_failed", "Failed to get sync status: "+err.Error())
		return
	}

	h.writeJSON(w, http.StatusOK, h.syncResultToResponse(result))
}

// ListSyncsResponse represents a list of syncs
type ListSyncsResponse struct {
	Syncs []*SyncResponse `json:"syncs"`
	Total int             `json:"total"`
}

// HandleListSyncs handles GET /api/integrations/drive/connections/{id}/syncs
func (h *DriveHandler) HandleListSyncs(w http.ResponseWriter, r *http.Request, connectionID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	ctx := r.Context()

	// Verify connection exists
	_, err := h.entClient.GoogleDriveConnection.Get(ctx, connectionID)
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

	resp := ListSyncsResponse{
		Syncs: make([]*SyncResponse, len(results)),
		Total: len(results),
	}
	for i, result := range results {
		resp.Syncs[i] = h.syncResultToResponse(result)
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleCancelSync handles POST /api/integrations/drive/connections/{id}/sync/cancel
func (h *DriveHandler) HandleCancelSync(w http.ResponseWriter, r *http.Request, connectionID string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	err := h.syncService.CancelSync(connectionID)
	if err != nil {
		if err == integration.ErrSyncNotFound {
			h.writeError(w, http.StatusNotFound, "not_found", "No active sync found for this connection")
			return
		}
		h.writeError(w, http.StatusInternalServerError, "cancel_failed", "Failed to cancel sync: "+err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ========================================
// Helper Methods
// ========================================

// cleanupOldStates removes OAuth states older than 10 minutes
func (h *DriveHandler) cleanupOldStates() {
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
func (h *DriveHandler) connectionToResponse(conn *ent.GoogleDriveConnection) *ConnectionResponse {
	resp := &ConnectionResponse{
		ID:              conn.ID,
		UserID:          conn.UserID,
		GoogleAccountID: conn.GoogleAccountID,
		Email:           conn.Email,
		Status:          string(conn.Status),
		CreatedAt:       conn.CreatedAt,
		UpdatedAt:       conn.UpdatedAt,
	}
	if conn.LastSyncAt != nil {
		resp.LastSyncAt = conn.LastSyncAt
	}
	return resp
}

// folderToResponse converts an ent folder to response format
func (h *DriveHandler) folderToResponse(folder *ent.GoogleDriveFolder) *FolderResponse {
	resp := &FolderResponse{
		ID:             folder.ID,
		ConnectionID:   folder.ConnectionID,
		DriveFolderID:  folder.DriveFolderID,
		Name:           folder.Name,
		Path:           folder.Path,
		IsRoot:         folder.IsRoot,
		SyncEnabled:    folder.SyncEnabled,
		SyncDirection:  string(folder.SyncDirection),
		FileCount:      folder.FileCount,
		TotalSizeBytes: folder.TotalSizeBytes,
		CreatedAt:      folder.CreatedAt,
		UpdatedAt:      folder.UpdatedAt,
	}
	if folder.ParentFolderID != nil {
		resp.ParentFolderID = folder.ParentFolderID
	}
	if folder.LastScannedAt != nil {
		resp.LastScannedAt = folder.LastScannedAt
	}
	return resp
}

// syncResultToResponse converts a sync result to response format
func (h *DriveHandler) syncResultToResponse(result *integration.SyncResult) *SyncResponse {
	return &SyncResponse{
		SyncID:           result.SyncID,
		ConnectionID:     result.ConnectionID,
		FolderID:         result.FolderID,
		SyncType:         result.SyncType,
		Status:           result.Status,
		StartedAt:        result.StartedAt,
		CompletedAt:      result.CompletedAt,
		FilesScanned:     result.FilesScanned,
		FilesDownloaded:  result.FilesDownloaded,
		FilesUploaded:    result.FilesUploaded,
		FilesDeleted:     result.FilesDeleted,
		FilesFailed:      result.FilesFailed,
		BytesTransferred: result.BytesTransferred,
		ErrorMessage:     result.ErrorMessage,
	}
}

// writeJSON writes a JSON response
func (h *DriveHandler) writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeError writes an error response
func (h *DriveHandler) writeError(w http.ResponseWriter, status int, errCode string, message string) {
	h.writeJSON(w, status, ErrorResponse{
		Error:   errCode,
		Message: message,
	})
}
