package integration

import (
	"net/http"
	"strings"

	"clockzen-next/internal/ent"
	"clockzen-next/internal/infrastructure/google"
)

// Router handles routing for integration-related endpoints
type Router struct {
	driveHandler *DriveHandler
	emailHandler *EmailHandler
}

// NewRouter creates a new Router with the given handlers
func NewRouter(driveHandler *DriveHandler, emailHandler *EmailHandler) *Router {
	return &Router{
		driveHandler: driveHandler,
		emailHandler: emailHandler,
	}
}

// NewDefaultRouter creates a new Router with default handlers
// Note: Requires ent client and OAuth config to be provided
func NewDefaultRouter(entClient *ent.Client, oauthConfig *google.Config) *Router {
	return &Router{
		driveHandler: NewDriveHandler(entClient, oauthConfig),
		emailHandler: NewEmailHandler(entClient, oauthConfig),
	}
}

// RegisterRoutes registers all integration routes with the given mux
// Total routes: 44 (22 Drive + 22 Email)
func (r *Router) RegisterRoutes(mux *http.ServeMux) {
	// ========================================
	// Drive OAuth Routes
	// ========================================
	// POST /api/integrations/drive/oauth/initiate - Initiate OAuth flow
	// GET/POST /api/integrations/drive/oauth/callback - OAuth callback
	mux.HandleFunc("/api/integrations/drive/oauth/initiate", r.handleOAuthInitiate)
	mux.HandleFunc("/api/integrations/drive/oauth/callback", r.handleOAuthCallback)

	// ========================================
	// Drive Connection Routes
	// ========================================
	// GET /api/integrations/drive/connections - List connections
	// GET /api/integrations/drive/connections/{id} - Get connection
	// DELETE /api/integrations/drive/connections/{id} - Disconnect (revoke)
	// POST /api/integrations/drive/connections/{id}/refresh - Refresh token
	// GET /api/integrations/drive/connections/{id}/folders - List folders
	// POST /api/integrations/drive/connections/{id}/folders - Add folder
	// GET /api/integrations/drive/connections/{id}/browse - Browse Drive
	// POST /api/integrations/drive/connections/{id}/sync - Trigger sync
	// GET /api/integrations/drive/connections/{id}/syncs - List syncs
	// POST /api/integrations/drive/connections/{id}/sync/cancel - Cancel sync
	mux.HandleFunc("/api/integrations/drive/connections", r.handleConnections)
	mux.HandleFunc("/api/integrations/drive/connections/", r.handleConnectionByID)

	// ========================================
	// Drive Folder Routes
	// ========================================
	// GET /api/integrations/drive/folders/{id} - Get folder
	// PUT/PATCH /api/integrations/drive/folders/{id} - Update folder
	// DELETE /api/integrations/drive/folders/{id} - Delete folder
	mux.HandleFunc("/api/integrations/drive/folders/", r.handleFolderByID)

	// ========================================
	// Drive Sync Status Routes
	// ========================================
	// GET /api/integrations/drive/syncs/{id} - Get sync status
	mux.HandleFunc("/api/integrations/drive/syncs/", r.handleSyncByID)

	// ========================================
	// Email OAuth Routes
	// ========================================
	// POST /api/integrations/email/oauth/initiate - Initiate OAuth flow
	// GET/POST /api/integrations/email/oauth/callback - OAuth callback
	mux.HandleFunc("/api/integrations/email/oauth/initiate", r.handleEmailOAuthInitiate)
	mux.HandleFunc("/api/integrations/email/oauth/callback", r.handleEmailOAuthCallback)

	// ========================================
	// Email Connection Routes
	// ========================================
	// GET /api/integrations/email/connections - List connections
	// GET /api/integrations/email/connections/{id} - Get connection
	// DELETE /api/integrations/email/connections/{id} - Disconnect (revoke)
	// POST /api/integrations/email/connections/{id}/refresh - Refresh token
	// GET /api/integrations/email/connections/{id}/labels - List labels
	// POST /api/integrations/email/connections/{id}/labels - Add label
	// POST /api/integrations/email/connections/{id}/labels/fetch - Fetch labels from provider
	// POST /api/integrations/email/connections/{id}/sync - Trigger sync
	// GET /api/integrations/email/connections/{id}/syncs - List syncs
	// POST /api/integrations/email/connections/{id}/sync/cancel - Cancel sync
	// GET /api/integrations/email/connections/{id}/messages/{msgId}/attachments/{attId} - Download attachment
	mux.HandleFunc("/api/integrations/email/connections", r.handleEmailConnections)
	mux.HandleFunc("/api/integrations/email/connections/", r.handleEmailConnectionByID)

	// ========================================
	// Email Label Routes
	// ========================================
	// GET /api/integrations/email/labels/{id} - Get label
	// PUT/PATCH /api/integrations/email/labels/{id} - Update label
	// DELETE /api/integrations/email/labels/{id} - Delete label
	// GET /api/integrations/email/labels/{id}/receipts - Extract receipts from label
	mux.HandleFunc("/api/integrations/email/labels/", r.handleEmailLabelByID)

	// ========================================
	// Email Sync Status Routes
	// ========================================
	// GET /api/integrations/email/syncs/{id} - Get sync status
	mux.HandleFunc("/api/integrations/email/syncs/", r.handleEmailSyncByID)
}

// handleOAuthInitiate routes requests for /api/integrations/drive/oauth/initiate
func (r *Router) handleOAuthInitiate(w http.ResponseWriter, req *http.Request) {
	r.driveHandler.HandleInitiateOAuth(w, req)
}

// handleOAuthCallback routes requests for /api/integrations/drive/oauth/callback
func (r *Router) handleOAuthCallback(w http.ResponseWriter, req *http.Request) {
	r.driveHandler.HandleOAuthCallback(w, req)
}

// handleConnections routes requests for /api/integrations/drive/connections
func (r *Router) handleConnections(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodGet:
		r.driveHandler.HandleListConnections(w, req)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleConnectionByID routes requests for /api/integrations/drive/connections/{id}
func (r *Router) handleConnectionByID(w http.ResponseWriter, req *http.Request) {
	// Extract the ID from the URL path
	path := strings.TrimPrefix(req.URL.Path, "/api/integrations/drive/connections/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, "Connection ID required", http.StatusBadRequest)
		return
	}

	connectionID := parts[0]

	// Check if this is a sub-resource request
	if len(parts) > 1 {
		switch parts[1] {
		case "refresh":
			r.driveHandler.HandleRefreshConnection(w, req, connectionID)
			return
		case "folders":
			r.handleConnectionFolders(w, req, connectionID)
			return
		case "browse":
			r.driveHandler.HandleBrowseDrive(w, req, connectionID)
			return
		case "sync":
			// Check for cancel sub-resource
			if len(parts) > 2 && parts[2] == "cancel" {
				r.driveHandler.HandleCancelSync(w, req, connectionID)
				return
			}
			r.driveHandler.HandleTriggerSync(w, req, connectionID)
			return
		case "syncs":
			r.driveHandler.HandleListSyncs(w, req, connectionID)
			return
		default:
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
	}

	// Handle connection CRUD operations
	switch req.Method {
	case http.MethodGet:
		r.driveHandler.HandleGetConnection(w, req, connectionID)
	case http.MethodDelete:
		r.driveHandler.HandleDisconnect(w, req, connectionID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleConnectionFolders handles folder operations under a connection
func (r *Router) handleConnectionFolders(w http.ResponseWriter, req *http.Request, connectionID string) {
	switch req.Method {
	case http.MethodGet:
		r.driveHandler.HandleListFolders(w, req, connectionID)
	case http.MethodPost:
		r.driveHandler.HandleCreateFolder(w, req, connectionID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleFolderByID routes requests for /api/integrations/drive/folders/{id}
func (r *Router) handleFolderByID(w http.ResponseWriter, req *http.Request) {
	// Extract the ID from the URL path
	folderID := strings.TrimPrefix(req.URL.Path, "/api/integrations/drive/folders/")
	if folderID == "" {
		http.Error(w, "Folder ID required", http.StatusBadRequest)
		return
	}

	// Handle folder CRUD operations
	switch req.Method {
	case http.MethodGet:
		r.driveHandler.HandleGetFolder(w, req, folderID)
	case http.MethodPut, http.MethodPatch:
		r.driveHandler.HandleUpdateFolder(w, req, folderID)
	case http.MethodDelete:
		r.driveHandler.HandleDeleteFolder(w, req, folderID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleSyncByID routes requests for /api/integrations/drive/syncs/{id}
func (r *Router) handleSyncByID(w http.ResponseWriter, req *http.Request) {
	// Extract the ID from the URL path
	syncID := strings.TrimPrefix(req.URL.Path, "/api/integrations/drive/syncs/")
	if syncID == "" {
		http.Error(w, "Sync ID required", http.StatusBadRequest)
		return
	}

	// Handle sync status operations
	switch req.Method {
	case http.MethodGet:
		r.driveHandler.HandleGetSyncStatus(w, req, syncID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// GetDriveHandler returns the drive handler
func (r *Router) GetDriveHandler() *DriveHandler {
	return r.driveHandler
}

// GetEmailHandler returns the email handler
func (r *Router) GetEmailHandler() *EmailHandler {
	return r.emailHandler
}

// ========================================
// Email Route Handlers
// ========================================

// handleEmailOAuthInitiate routes requests for /api/integrations/email/oauth/initiate
func (r *Router) handleEmailOAuthInitiate(w http.ResponseWriter, req *http.Request) {
	r.emailHandler.HandleInitiateOAuth(w, req)
}

// handleEmailOAuthCallback routes requests for /api/integrations/email/oauth/callback
func (r *Router) handleEmailOAuthCallback(w http.ResponseWriter, req *http.Request) {
	r.emailHandler.HandleOAuthCallback(w, req)
}

// handleEmailConnections routes requests for /api/integrations/email/connections
func (r *Router) handleEmailConnections(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodGet:
		r.emailHandler.HandleListConnections(w, req)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleEmailConnectionByID routes requests for /api/integrations/email/connections/{id}
func (r *Router) handleEmailConnectionByID(w http.ResponseWriter, req *http.Request) {
	// Extract the ID from the URL path
	path := strings.TrimPrefix(req.URL.Path, "/api/integrations/email/connections/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, "Connection ID required", http.StatusBadRequest)
		return
	}

	connectionID := parts[0]

	// Check if this is a sub-resource request
	if len(parts) > 1 {
		switch parts[1] {
		case "refresh":
			r.emailHandler.HandleRefreshConnection(w, req, connectionID)
			return
		case "labels":
			r.handleEmailConnectionLabels(w, req, connectionID, parts)
			return
		case "sync":
			// Check for cancel sub-resource
			if len(parts) > 2 && parts[2] == "cancel" {
				r.emailHandler.HandleCancelSync(w, req, connectionID)
				return
			}
			r.emailHandler.HandleTriggerSync(w, req, connectionID)
			return
		case "syncs":
			r.emailHandler.HandleListSyncs(w, req, connectionID)
			return
		case "messages":
			// Handle attachment download: /connections/{id}/messages/{msgId}/attachments/{attId}
			if len(parts) >= 5 && parts[3] == "attachments" {
				messageID := parts[2]
				attachmentID := parts[4]
				r.emailHandler.HandleDownloadAttachment(w, req, connectionID, messageID, attachmentID)
				return
			}
			http.Error(w, "Not found", http.StatusNotFound)
			return
		default:
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
	}

	// Handle connection CRUD operations
	switch req.Method {
	case http.MethodGet:
		r.emailHandler.HandleGetConnection(w, req, connectionID)
	case http.MethodDelete:
		r.emailHandler.HandleDisconnect(w, req, connectionID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleEmailConnectionLabels handles label operations under a connection
func (r *Router) handleEmailConnectionLabels(w http.ResponseWriter, req *http.Request, connectionID string, parts []string) {
	// Check for fetch sub-resource: /connections/{id}/labels/fetch
	if len(parts) > 2 && parts[2] == "fetch" {
		r.emailHandler.HandleFetchLabels(w, req, connectionID)
		return
	}

	switch req.Method {
	case http.MethodGet:
		r.emailHandler.HandleListLabels(w, req, connectionID)
	case http.MethodPost:
		r.emailHandler.HandleCreateLabel(w, req, connectionID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleEmailLabelByID routes requests for /api/integrations/email/labels/{id}
func (r *Router) handleEmailLabelByID(w http.ResponseWriter, req *http.Request) {
	// Extract the ID from the URL path
	path := strings.TrimPrefix(req.URL.Path, "/api/integrations/email/labels/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, "Label ID required", http.StatusBadRequest)
		return
	}

	labelID := parts[0]

	// Check for sub-resources
	if len(parts) > 1 {
		switch parts[1] {
		case "receipts":
			r.emailHandler.HandleExtractReceipts(w, req, labelID)
			return
		default:
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
	}

	// Handle label CRUD operations
	switch req.Method {
	case http.MethodGet:
		r.emailHandler.HandleGetLabel(w, req, labelID)
	case http.MethodPut, http.MethodPatch:
		r.emailHandler.HandleUpdateLabel(w, req, labelID)
	case http.MethodDelete:
		r.emailHandler.HandleDeleteLabel(w, req, labelID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleEmailSyncByID routes requests for /api/integrations/email/syncs/{id}
func (r *Router) handleEmailSyncByID(w http.ResponseWriter, req *http.Request) {
	// Extract the ID from the URL path
	syncID := strings.TrimPrefix(req.URL.Path, "/api/integrations/email/syncs/")
	if syncID == "" {
		http.Error(w, "Sync ID required", http.StatusBadRequest)
		return
	}

	// Handle sync status operations
	switch req.Method {
	case http.MethodGet:
		r.emailHandler.HandleGetSyncStatus(w, req, syncID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
